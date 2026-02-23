import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Search, X, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  notes: string | null;
}

interface HistoryOrder {
  id: string;
  order_number: number | null;
  customer_name: string | null;
  table_number: string | null;
  status: string;
  created_at: string;
  order_type: string | null;
  notes: string | null;
  order_items: OrderItem[];
}

interface KDSHistorySheetProps {
  onViewOrder: (order: HistoryOrder) => void;
}

export function KDSHistorySheet({ onViewOrder }: KDSHistorySheetProps) {
  const { data: company } = useCompany();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch recent orders (last 100, including completed/cancelled)
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['kds-history', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, 
          order_number, 
          customer_name, 
          table_number, 
          status, 
          created_at, 
          order_type, 
          notes,
          order_items (id, product_name, quantity, notes)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as HistoryOrder[];
    },
    enabled: !!company?.id && open,
    refetchInterval: open ? 30000 : false,
  });

  // Filter orders by search
  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;

    const searchLower = search.toLowerCase().trim();
    const searchNum = parseInt(search, 10);

    return orders.filter(order => {
      // Search by order number
      if (!isNaN(searchNum) && order.order_number === searchNum) return true;
      
      // Search by table
      if (order.table_number?.toLowerCase().includes(searchLower)) return true;
      
      // Search by customer name
      if (order.customer_name?.toLowerCase().includes(searchLower)) return true;

      return false;
    });
  }, [orders, search]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo': return 'bg-yellow-500';
      case 'preparo': return 'bg-orange-500';
      case 'pronto': return 'bg-green-500';
      case 'entregando': return 'bg-blue-500';
      case 'entregue': return 'bg-emerald-600';
      case 'cancelado': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'novo': return 'Novo';
      case 'preparo': return 'Preparo';
      case 'pronto': return 'Pronto';
      case 'entregando': return 'Entregando';
      case 'entregue': return 'Entregue';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const handleSelectOrder = (order: HistoryOrder) => {
    onViewOrder(order);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="lg"
          className="border-slate-600 text-slate-300 hover:bg-slate-800 h-12 px-6"
        >
          <History className="w-5 h-5 mr-2" />
          Histórico
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg bg-slate-900 border-slate-700 text-white p-0"
      >
        <SheetHeader className="p-4 border-b border-slate-700">
          <SheetTitle className="text-white flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Pedidos
          </SheetTitle>
        </SheetHeader>

        {/* Search Bar - Touch Friendly */}
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              inputMode="search"
              placeholder="Buscar nº pedido, mesa ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-12 h-14 text-lg bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white h-10 w-10"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Orders List - Touch Friendly */}
        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-2 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                <Package className="w-10 h-10 mb-2" />
                <p>Nenhum pedido encontrado</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg transition-all active:scale-[0.98]",
                    "bg-slate-800 hover:bg-slate-700 border border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-white">
                        #{order.order_number || '-'}
                      </span>
                      {order.table_number && (
                        <Badge variant="outline" className="border-slate-500 text-slate-300">
                          Mesa {order.table_number}
                        </Badge>
                      )}
                    </div>
                    <Badge className={cn("text-white text-xs", getStatusColor(order.status))}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      {order.customer_name || 'Cliente não identificado'}
                    </span>
                    <span className="text-slate-500">
                      {formatDistanceToNow(new Date(order.created_at), { 
                        addSuffix: true,
                        locale: ptBR 
                      })}
                    </span>
                  </div>

                  {/* Items preview */}
                  <div className="mt-2 text-xs text-slate-500 truncate">
                    {order.order_items && order.order_items.length > 0 ? (
                      order.order_items.slice(0, 3).map((item, i) => (
                        <span key={item.id}>
                          {i > 0 && ', '}
                          {item.quantity}x {item.product_name}
                        </span>
                      ))
                    ) : (
                      <span>Sem itens</span>
                    )}
                    {order.order_items && order.order_items.length > 3 && (
                      <span> +{order.order_items.length - 3} mais</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}