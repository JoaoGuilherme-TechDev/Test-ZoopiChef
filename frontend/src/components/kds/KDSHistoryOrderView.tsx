import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Package, Clock, User, MapPin, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
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

interface KDSHistoryOrderViewProps {
  order: HistoryOrder | null;
  onClose: () => void;
}

export function KDSHistoryOrderView({ order, onClose }: KDSHistoryOrderViewProps) {
  if (!order) return null;

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

  const getOrderTypeLabel = (type: string | null) => {
    switch (type) {
      case 'delivery': return 'Delivery';
      case 'balcao': return 'Balcão';
      case 'mesa': return 'Mesa';
      default: return type || 'N/A';
    }
  };

  const items = order.order_items || [];

  return (
    <Dialog open={!!order} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white p-0 max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-slate-700 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white h-12 w-12"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <DialogTitle className="text-white text-xl">
              Pedido #{order.order_number || '-'}
            </DialogTitle>
          </div>
          <Badge className={cn("text-white text-sm px-3 py-1", getStatusColor(order.status))}>
            {getStatusLabel(order.status)}
          </Badge>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-4 space-y-4">
            {/* Order Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  <span>Hora</span>
                </div>
                <p className="text-white font-medium">
                  {format(new Date(order.created_at), "HH:mm", { locale: ptBR })}
                </p>
                <p className="text-slate-500 text-xs">
                  {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>

              <div className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <MapPin className="w-4 h-4" />
                  <span>Tipo</span>
                </div>
                <p className="text-white font-medium">
                  {getOrderTypeLabel(order.order_type)}
                </p>
                {order.table_number && (
                  <p className="text-purple-400 text-sm">Mesa {order.table_number}</p>
                )}
              </div>
            </div>

            {/* Customer */}
            {order.customer_name && (
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                  <User className="w-4 h-4" />
                  <span>Cliente</span>
                </div>
                <p className="text-white font-medium">{order.customer_name}</p>
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>Observações</span>
                </div>
                <p className="text-amber-200">{order.notes}</p>
              </div>
            )}

            {/* Items */}
            <div>
              <h3 className="text-slate-400 text-sm mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Itens do Pedido
              </h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-800 rounded-lg p-3 border-l-4 border-purple-500"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-slate-700 text-white font-bold">
                            {item.quantity}x
                          </Badge>
                          <span className="text-white font-medium">{item.product_name}</span>
                        </div>
                        
                        {/* Item notes */}
                        {item.notes && (
                          <div className="mt-1 pl-8 text-sm text-amber-400">
                            📝 {item.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Close Button */}
        <div className="p-4 border-t border-slate-700">
          <Button
            onClick={onClose}
            className="w-full h-14 text-lg bg-slate-700 hover:bg-slate-600"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar ao KDS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
