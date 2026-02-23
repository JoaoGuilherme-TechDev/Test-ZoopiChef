/**
 * TenantKDS - Tenant-based route for KDS access
 * 
 * Route: /:slug/kds
 * 
 * This component provides KDS functionality using tenant context
 * instead of requiring authentication. Supports both classic and
 * multi-stage KDS modes.
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertTriangle, ChefHat, Clock, CheckCircle2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { KDSLayout } from '@/components/kds/KDSLayout';
import { KDSOrderCard } from '@/components/kds/KDSOrderCard';
import { KDSMessageOverlay } from '@/components/kds/KDSMessageOverlay';
import { MultiStageKDSView } from '@/components/kds/multistage';
import { OrderStatus } from '@/hooks/useOrders';

type KDSFilters = {
  sectorId: string | null;
  status: OrderStatus | 'all';
};

function KDSContent() {
  const { company } = useTenant();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState<KDSFilters>({
    sectorId: null,
    status: 'all',
  });

  // Check if multi-stage is enabled
  const { data: kdsSettings } = useQuery({
    queryKey: ['tenant_kds_settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from('company_kds_settings')
        .select('kds_multi_stage_enabled')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const isMultiStageEnabled = kdsSettings?.kds_multi_stage_enabled ?? false;

  // Fetch print sectors for this company
  const { data: activeSectors = [] } = useQuery({
    queryKey: ['tenant_print_sectors', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('print_sectors')
        .select('id, name, color')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['tenant_kds_orders', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('orders')
        .select('*, customer:customers(id, name, whatsapp)')
        .eq('company_id', company.id)
        .in('status', ['novo', 'preparo', 'pronto'])
        .order('created_at', { ascending: true });

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch order items
      const ordersWithItems = await Promise.all((data || []).map(async (order) => {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);
        
        const ageMs = Date.now() - new Date(order.created_at).getTime();
        const ageMinutes = Math.floor(ageMs / 60000);

        return {
          ...order,
          items: items || [],
          age_minutes: ageMinutes,
          is_overdue: ageMinutes > 30,
        };
      }));

      // Filter by sector if needed
      if (filters.sectorId) {
        return ordersWithItems.filter(order => 
          order.items.some((item: any) => item.sector_id === filters.sectorId)
        );
      }

      return ordersWithItems;
    },
    enabled: !!company?.id,
    refetchInterval: 5000,
  });

  // Stats
  const stats = useMemo(() => {
    const all = orders;
    return {
      total: all.length,
      novo: all.filter(o => o.status === 'novo').length,
      preparo: all.filter(o => o.status === 'preparo').length,
      pronto: all.filter(o => o.status === 'pronto').length,
    };
  }, [orders]);

  // Update order status mutation
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_kds_orders'] });
      toast.success('Status atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const handleStatusChange = (
    orderId: string, 
    status: OrderStatus,
    orderNumber?: number,
    customerName?: string | null,
    delivererId?: string | null
  ) => {
    updateOrderStatus.mutate({ orderId, status });
  };

  const statusButtons = [
    { value: 'all', label: 'Todos', count: stats.total, icon: RefreshCw },
    { value: 'novo', label: 'Novos', count: stats.novo, icon: AlertTriangle, color: 'text-yellow-400' },
    { value: 'preparo', label: 'Preparo', count: stats.preparo, icon: ChefHat, color: 'text-orange-400' },
    { value: 'pronto', label: 'Prontos', count: stats.pronto, icon: CheckCircle2, color: 'text-green-400' },
  ];

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Multi-stage KDS view
  if (isMultiStageEnabled) {
    return (
      <KDSLayout title={`KDS Multi-Etapas - ${company.name}`}>
        <KDSMessageOverlay />
        <MultiStageKDSView isAdmin={false} />
      </KDSLayout>
    );
  }

  // Classic KDS view
  return (
    <KDSLayout title={`KDS - ${company.name}`}>
      <KDSMessageOverlay />
      
      {/* Filters Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-2 flex-1">
          {activeSectors.length > 0 && (
            <>
              <Button
                variant={filters.sectorId === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters(f => ({ ...f, sectorId: null }))}
                className={cn(
                  "transition-all",
                  filters.sectorId === null 
                    ? "bg-purple-600 hover:bg-purple-700" 
                    : "border-slate-600 text-slate-300 hover:bg-slate-800"
                )}
              >
                Todos os Setores
              </Button>
              {activeSectors.map(sector => (
                <Button
                  key={sector.id}
                  variant={filters.sectorId === sector.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters(f => ({ ...f, sectorId: sector.id }))}
                  className={cn(
                    "transition-all",
                    filters.sectorId === sector.id
                      ? "hover:opacity-90"
                      : "border-slate-600 text-slate-300 hover:bg-slate-800"
                  )}
                  style={filters.sectorId === sector.id ? { backgroundColor: sector.color } : undefined}
                >
                  {sector.name}
                </Button>
              ))}
            </>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {statusButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={filters.status === btn.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters(f => ({ ...f, status: btn.value as any }))}
              className={cn(
                "transition-all gap-2",
                filters.status === btn.value
                  ? "bg-slate-700 hover:bg-slate-600"
                  : "border-slate-600 text-slate-300 hover:bg-slate-800"
              )}
            >
              <btn.icon className={cn("h-4 w-4", btn.color)} />
              {btn.label}
              <Badge variant="secondary" className="ml-1 bg-slate-600 text-white">
                {btn.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ChefHat className="h-16 w-16 text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-slate-300">Nenhum pedido</h3>
          <p className="text-slate-500 mt-2">Aguardando novos pedidos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order: any) => (
            <KDSOrderCard
              key={order.id}
              order={order as any}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </KDSLayout>
  );
}

export default function TenantKDS() {
  return (
    <TenantProvider>
      <KDSContent />
    </TenantProvider>
  );
}
