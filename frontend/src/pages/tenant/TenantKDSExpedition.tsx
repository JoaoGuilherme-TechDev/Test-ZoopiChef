/**
 * TenantKDSExpedition - Expedition KDS for packaging and delivery handoff
 * 
 * Route: /:slug/kds-expedicao
 * 
 * This component shows orders that are ready for expedition/packaging.
 * Orders appear when marked as "pronto" in the main KDS and disappear
 * when marked as "finalizado" (dispatched/delivered).
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  Loader2, 
  Package, 
  CheckCircle2, 
  Truck, 
  Clock, 
  User, 
  MapPin, 
  Phone,
  Store,
  Globe,
  PhoneCall,
  Maximize2,
  Minimize2,
  ArrowLeft,
  PackageCheck,
  Timer,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getOrderTypeLabel } from '@/lib/orderTypeLabel';
import { useNavigate } from 'react-router-dom';

type ExpeditionStatus = 'aguardando' | 'finalizado';

interface ExpeditionOrder {
  id: string;
  order_number: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  order_type: string;
  source: string | null;
  total: number;
  status: string;
  created_at: string;
  ready_at: string | null;
  notes: string | null;
  items: {
    id: string;
    product_name: string;
    quantity: number;
  }[];
  wait_time_minutes: number;
}

// Icons for order types
const orderTypeIcons: Record<string, any> = {
  globe: Globe,
  phone: PhoneCall,
  store: Store,
  package: Package,
};

function ExpeditionContent() {
  const { company } = useTenant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Fetch ready orders for expedition
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['expedition_orders', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      // Fetch orders that are "pronto" (ready) - these are waiting for expedition
      // Filter by order types that need expedition: delivery, phone, counter, pickup
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customers(id, name, whatsapp)')
        .eq('company_id', company.id)
        .eq('status', 'pronto')
        .in('order_type', ['delivery', 'phone', 'counter', 'kiosk'])
        .order('ready_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch items for each order
      const ordersWithDetails = await Promise.all((data || []).map(async (order) => {
        const { data: items } = await supabase
          .from('order_items')
          .select('id, product_name, quantity')
          .eq('order_id', order.id);

        // Calculate wait time since order became ready
        const readyTime = order.ready_at ? new Date(order.ready_at) : new Date(order.created_at);
        const waitTimeMs = Date.now() - readyTime.getTime();
        const waitTimeMinutes = Math.floor(waitTimeMs / 60000);

        return {
          ...order,
          items: items || [],
          wait_time_minutes: waitTimeMinutes,
          customer_name: order.customer_name || order.customer?.name,
          customer_phone: order.customer_phone || order.customer?.whatsapp,
        };
      }));

      return ordersWithDetails as ExpeditionOrder[];
    },
    enabled: !!company?.id,
    refetchInterval: 3000, // Faster refresh for expedition
  });

  // Stats
  const stats = useMemo(() => {
    const urgent = orders.filter(o => o.wait_time_minutes >= 10);
    const warning = orders.filter(o => o.wait_time_minutes >= 5 && o.wait_time_minutes < 10);
    return {
      total: orders.length,
      urgent: urgent.length,
      warning: warning.length,
      normal: orders.length - urgent.length - warning.length,
    };
  }, [orders]);

  // Mark order as dispatched/delivered (finalizado)
  const finalizeOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'em_rota',
          dispatched_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expedition_orders'] });
      toast.success('Pedido finalizado e despachado!', {
        icon: <PackageCheck className="h-5 w-5 text-green-500" />,
      });
    },
    onError: () => {
      toast.error('Erro ao finalizar pedido');
    },
  });

  // Get alert level based on wait time
  const getAlertLevel = (minutes: number) => {
    if (minutes >= 10) return 'danger';
    if (minutes >= 5) return 'warning';
    return 'normal';
  };

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-2 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">KDS Expedição</h1>
              <p className="text-xs text-white/60">{company.name}</p>
            </div>
          </div>
        </div>

        {/* Stats badges */}
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-600/80 text-white border-0 px-4 py-2 text-sm">
            <Package className="w-4 h-4 mr-2" />
            {stats.total} pedidos
          </Badge>
          {stats.urgent > 0 && (
            <Badge className="bg-red-600 text-white border-0 px-4 py-2 text-sm animate-pulse">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {stats.urgent} urgentes
            </Badge>
          )}
          {stats.warning > 0 && (
            <Badge className="bg-amber-500 text-black border-0 px-4 py-2 text-sm">
              <Timer className="w-4 h-4 mr-2" />
              {stats.warning} em alerta
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Current time */}
          <div className="text-2xl font-mono font-bold text-emerald-400">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-emerald-500/20 p-6 rounded-full mb-6">
              <CheckCircle2 className="h-16 w-16 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">Tudo em dia!</h3>
            <p className="text-white/60">Nenhum pedido aguardando expedição</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {orders.map((order) => {
              const alertLevel = getAlertLevel(order.wait_time_minutes);
              const typeInfo = getOrderTypeLabel(order.order_type, order.source, null);
              const TypeIcon = orderTypeIcons[typeInfo.icon] || Package;

              return (
                <Card 
                  key={order.id}
                  className={cn(
                    "border-2 transition-all duration-300 overflow-hidden cursor-pointer hover:scale-[1.02]",
                    alertLevel === 'danger' && "border-red-500 bg-red-950/50 ring-2 ring-red-500/50",
                    alertLevel === 'warning' && "border-amber-500 bg-amber-950/50",
                    alertLevel === 'normal' && "border-emerald-500/50 bg-slate-800/80"
                  )}
                  onClick={() => finalizeOrder.mutate(order.id)}
                >
                  {/* Order Type Tag */}
                  <div 
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 px-4 font-bold text-sm tracking-wide",
                      alertLevel === 'danger' && "bg-red-600 animate-pulse",
                      alertLevel === 'warning' && "bg-amber-500 text-black",
                      alertLevel === 'normal' && "bg-emerald-600"
                    )}
                  >
                    <TypeIcon className="h-4 w-4" />
                    <span>{typeInfo.shortLabel || typeInfo.label}</span>
                  </div>

                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-black text-white">
                        #{String(order.order_number).padStart(3, '0')}
                      </span>
                      <Badge 
                        className={cn(
                          "text-sm px-3 py-1",
                          alertLevel === 'danger' && "bg-red-500 text-white animate-pulse",
                          alertLevel === 'warning' && "bg-amber-500 text-black",
                          alertLevel === 'normal' && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                        )}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {order.wait_time_minutes}min
                      </Badge>
                    </div>

                    {/* Customer Info */}
                    {order.customer_name && (
                      <div className="flex items-center gap-2 mt-3 text-white/80">
                        <User className="w-4 h-4 text-white/50" />
                        <span className="font-medium truncate">{order.customer_name}</span>
                      </div>
                    )}
                    {order.customer_phone && (
                      <div className="flex items-center gap-2 mt-1 text-white/60 text-sm">
                        <Phone className="w-3 h-3" />
                        <span>{order.customer_phone}</span>
                      </div>
                    )}
                    {order.customer_address && order.order_type === 'delivery' && (
                      <div className="flex items-start gap-2 mt-1 text-white/60 text-sm">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{order.customer_address}</span>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="pt-2 pb-4">
                    {/* Items Summary */}
                    <div className="bg-black/30 rounded-lg p-3 mb-4">
                      <div className="text-xs text-white/50 mb-2 font-medium uppercase tracking-wide">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {order.items.slice(0, 4).map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-sm text-white/80">
                            <span className="text-emerald-400 font-bold">{item.quantity}x</span>
                            <span className="truncate">{item.product_name}</span>
                          </div>
                        ))}
                        {order.items.length > 4 && (
                          <div className="text-xs text-white/40 italic">
                            +{order.items.length - 4} mais...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Finalize Button */}
                    <Button
                      className={cn(
                        "w-full font-bold text-lg py-6 transition-all",
                        alertLevel === 'danger' && "bg-red-600 hover:bg-red-700",
                        alertLevel === 'warning' && "bg-amber-500 hover:bg-amber-600 text-black",
                        alertLevel === 'normal' && "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                      )}
                      disabled={finalizeOrder.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        finalizeOrder.mutate(order.id);
                      }}
                    >
                      {finalizeOrder.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <PackageCheck className="w-5 h-5 mr-2" />
                          FINALIZAR
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Stats Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm border-t border-white/10 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-white/60">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm">Normal (&lt;5min)</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm">Alerta (5-10min)</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm">Urgente (&gt;10min)</span>
            </div>
          </div>
          <div className="text-white/40 text-sm">
            Clique no card ou no botão para finalizar • Atualização a cada 3s
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function TenantKDSExpedition() {
  return (
    <TenantProvider>
      <ExpeditionContent />
    </TenantProvider>
  );
}
