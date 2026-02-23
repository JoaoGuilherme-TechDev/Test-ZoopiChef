import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase-shim';
import { KDSOrderCard } from '@/components/kds/KDSOrderCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OrderStatus } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertTriangle, ChefHat, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface KDSFilters {
  sectorId: string | null;
  status: OrderStatus | 'all';
}

interface PrintSector {
  id: string;
  name: string;
  color: string;
  sla_minutes: number;
  active: boolean;
}

export default function PublicKDSByToken() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [invalidToken, setInvalidToken] = useState(false);
  const [filters, setFilters] = useState<KDSFilters>({
    sectorId: null,
    status: 'all',
  });

  const queryClient = useQueryClient();

  // Validate token and get company
  useEffect(() => {
    let cancelled = false;

    async function validateToken() {
      if (!token) {
        setInvalidToken(true);
        return;
      }

      const { data, error } = await (supabase as any)
        .from('company_public_links')
        .select('company_id, companies:company_id(name)')
        .or(`kds_token.eq.${token},kds_token_v2.eq.${token}`)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        console.error('Invalid KDS token');
        setInvalidToken(true);
        return;
      }

      setCompanyId(data.company_id);
      setCompanyName((data.companies as any)?.name || 'KDS');
      setInvalidToken(false);
    }

    validateToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (invalidToken) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-lg font-semibold">Link do KDS inválido</h1>
          <p className="text-sm text-slate-400 mt-2">
            Esse QR/link não está configurado ou foi regenerado. Gere um novo link em “Meus Links”.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" onClick={() => navigate('/')}>Ir para o sistema</Button>
            <Button onClick={() => navigate('/my-links')}>Abrir Meus Links</Button>
          </div>
        </div>
      </div>
    );
  }

  // Fetch sectors for this company
  const { data: sectors = [] } = useQuery({
    queryKey: ['public-kds-sectors', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('print_sectors')
        .select('id, name, color, sla_minutes, active')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as PrintSector[];
    },
    enabled: !!companyId,
  });

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['public-kds-orders', companyId, filters],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('company_id', companyId)
        .in('status', ['novo', 'preparo', 'pronto'])
        .order('created_at', { ascending: true });

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(order => ({
        ...order,
        items: (order.order_items || []).map((item: any) => ({
          ...item,
          edit_status: item.edit_status as 'new' | 'modified' | 'removed' | null,
          item_status: item.item_status || 'pendente',
          started_at: item.started_at,
          finished_at: item.finished_at,
        })),
        age_minutes: Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000),
        is_overdue: false,
        is_edited: order.edit_version > 0 || (order.order_items || []).some((i: any) => i.edit_status),
      }));
    },
    enabled: !!companyId,
    refetchInterval: 10000,
  });

  // Update order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-kds-orders'] });
    },
  });

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    updateOrderStatus.mutate({ orderId, status }, {
      onSuccess: () => {
        toast.success('Status atualizado!');
      },
      onError: () => {
        toast.error('Erro ao atualizar status');
      }
    });
  };

  // Calculate stats
  const stats = {
    total: orders.length,
    novo: orders.filter(o => o.status === 'novo').length,
    preparo: orders.filter(o => o.status === 'preparo').length,
    pronto: orders.filter(o => o.status === 'pronto').length,
    overdue: orders.filter(o => o.is_overdue).length,
  };

  const statusButtons = [
    { value: 'all', label: 'Todos', count: stats.total, icon: RefreshCw },
    { value: 'novo', label: 'Novos', count: stats.novo, icon: AlertTriangle, color: 'text-yellow-400' },
    { value: 'preparo', label: 'Preparo', count: stats.preparo, icon: ChefHat, color: 'text-orange-400' },
    { value: 'pronto', label: 'Prontos', count: stats.pronto, icon: CheckCircle2, color: 'text-green-400' },
  ];

  if (!companyId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
        <h1 className="text-xl font-bold">KDS - Kitchen Display</h1>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 space-y-4">
        {/* Sector Filters */}
        {sectors.length > 0 && (
          <div className="flex flex-wrap gap-2">
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
            {sectors.map(sector => (
              <Button
                key={sector.id}
                variant={filters.sectorId === sector.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters(f => ({ ...f, sectorId: sector.id }))}
                className="transition-all"
                style={{
                  backgroundColor: filters.sectorId === sector.id ? sector.color : undefined,
                  borderColor: sector.color,
                  color: filters.sectorId === sector.id ? 'white' : sector.color,
                }}
              >
                {sector.name}
                <Badge 
                  variant="secondary" 
                  className="ml-2 bg-white/20 text-current"
                >
                  {sector.sla_minutes}min
                </Badge>
              </Button>
            ))}
          </div>
        )}

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {statusButtons.map(btn => {
            const Icon = btn.icon;
            return (
              <Button
                key={btn.value}
                variant={filters.status === btn.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters(f => ({ ...f, status: btn.value as OrderStatus | 'all' }))}
                className={cn(
                  "transition-all",
                  filters.status === btn.value 
                    ? "bg-slate-700 hover:bg-slate-600" 
                    : "border-slate-600 text-slate-300 hover:bg-slate-800"
                )}
              >
                <Icon className={cn("w-4 h-4 mr-2", btn.color)} />
                {btn.label}
                <Badge variant="secondary" className="ml-2 bg-slate-600">
                  {btn.count}
                </Badge>
              </Button>
            );
          })}

          {stats.overdue > 0 && (
            <Badge className="bg-red-500 text-white animate-pulse px-3 py-1">
              <AlertTriangle className="w-4 h-4 mr-1" />
              {stats.overdue} atrasado(s)
            </Badge>
          )}
        </div>
      </div>

      {/* Orders Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <ChefHat className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg">Nenhum pedido pendente</p>
          <p className="text-sm">Os pedidos aparecerão aqui automaticamente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
          {orders.map(order => (
            <KDSOrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
              isUpdating={updateOrderStatus.isPending}
            />
          ))}
        </div>
      )}

      {/* Stats Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">
                {new Date().toLocaleTimeString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm text-slate-300">Novos: {stats.novo}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm text-slate-300">Preparo: {stats.preparo}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-slate-300">Prontos: {stats.pronto}</span>
              </div>
            </div>
          </div>
          
          {stats.overdue > 0 && (
            <Badge className="bg-red-500 text-white animate-pulse">
              <AlertTriangle className="w-4 h-4 mr-1" />
              {stats.overdue} pedido(s) atrasado(s)
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
