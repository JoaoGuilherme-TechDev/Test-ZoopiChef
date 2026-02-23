import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useScheduledOrders, ScheduledOrder, ScheduledOrderStatus } from '@/hooks/useScheduledOrders';
import { formatCurrency } from '@/lib/format';
import { Loader2, Plus, Calendar, Clock, Truck, Store, UtensilsCrossed, Check, X, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const STATUS_CONFIG: Record<ScheduledOrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  preparing: { label: 'Preparando', variant: 'outline' },
  completed: { label: 'Concluído', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

const ORDER_TYPE_ICONS = {
  delivery: Truck,
  pickup: Store,
  table: UtensilsCrossed,
};

const ORDER_TYPE_LABELS = {
  delivery: 'Delivery',
  pickup: 'Retirada',
  table: 'Mesa',
};

export function ScheduledOrdersList() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [cancelDialog, setCancelDialog] = useState<ScheduledOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const { orders, isLoading, stats, confirmOrder, cancelOrder, convertToOrder, completeOrder } = useScheduledOrders(selectedDate);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

  const handleCancel = async () => {
    if (!cancelDialog) return;
    await cancelOrder.mutateAsync({ orderId: cancelDialog.id, reason: cancelReason });
    setCancelDialog(null);
    setCancelReason('');
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmados</p>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold">{stats.today}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pedidos Agendados</CardTitle>
              <CardDescription>Gerencie pedidos programados para datas futuras</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmados</TabsTrigger>
              <TabsTrigger value="preparing">Preparando</TabsTrigger>
              <TabsTrigger value="completed">Concluídos</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pedido agendado encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <ScheduledOrderCard
                  key={order.id}
                  order={order}
                  onConfirm={() => confirmOrder.mutate(order.id)}
                  onCancel={() => setCancelDialog(order)}
                  onStart={() => convertToOrder.mutate(order)}
                  onComplete={() => completeOrder.mutate(order.id)}
                  isLoading={confirmOrder.isPending || convertToOrder.isPending || completeOrder.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Pedido</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar este pedido agendado?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo do cancelamento</Label>
              <Textarea
                placeholder="Digite o motivo..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancel}
              disabled={cancelOrder.isPending}
            >
              {cancelOrder.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cancelar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ScheduledOrderCardProps {
  order: ScheduledOrder;
  onConfirm: () => void;
  onCancel: () => void;
  onStart: () => void;
  onComplete: () => void;
  isLoading: boolean;
}

function ScheduledOrderCard({ order, onConfirm, onCancel, onStart, onComplete, isLoading }: ScheduledOrderCardProps) {
  const TypeIcon = ORDER_TYPE_ICONS[order.order_type];
  const statusConfig = STATUS_CONFIG[order.status];

  const scheduledDateTime = new Date(`${order.scheduled_date}T${order.scheduled_time}`);
  const isToday = order.scheduled_date === format(new Date(), 'yyyy-MM-dd');
  const isPast = scheduledDateTime < new Date();

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-colors",
      isToday && "border-primary/50 bg-primary/5",
      order.status === 'cancelled' && "opacity-60"
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          order.order_type === 'delivery' && "bg-blue-500/10 text-blue-600",
          order.order_type === 'pickup' && "bg-green-500/10 text-green-600",
          order.order_type === 'table' && "bg-amber-500/10 text-amber-600"
        )}>
          <TypeIcon className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{order.customer_name}</h4>
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                {isToday && <Badge variant="outline" className="text-primary">Hoje</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{formatCurrency(order.total_cents / 100)}</p>
              <p className="text-sm text-muted-foreground">
                {ORDER_TYPE_LABELS[order.order_type]}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {format(new Date(order.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              {order.scheduled_time.slice(0, 5)}
            </div>
            {order.items.length > 0 && (
              <span className="text-muted-foreground">
                {order.items.length} item(s)
              </span>
            )}
          </div>

          {order.notes && (
            <p className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              {order.notes}
            </p>
          )}

          {/* Actions */}
          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <div className="mt-3 flex items-center gap-2">
              {order.status === 'pending' && (
                <>
                  <Button size="sm" onClick={onConfirm} disabled={isLoading}>
                    <Check className="w-4 h-4 mr-1" />
                    Confirmar
                  </Button>
                  <Button size="sm" variant="outline" onClick={onCancel}>
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                </>
              )}
              {order.status === 'confirmed' && (
                <>
                  <Button size="sm" onClick={onStart} disabled={isLoading}>
                    <Play className="w-4 h-4 mr-1" />
                    Iniciar Preparo
                  </Button>
                  <Button size="sm" variant="outline" onClick={onCancel}>
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                </>
              )}
              {order.status === 'preparing' && (
                <Button size="sm" onClick={onComplete} disabled={isLoading}>
                  <Check className="w-4 h-4 mr-1" />
                  Finalizar
                </Button>
              )}
            </div>
          )}

          {order.status === 'cancelled' && order.cancel_reason && (
            <p className="mt-2 text-sm text-destructive">
              Motivo: {order.cancel_reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
