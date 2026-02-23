import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useMarketplaceIntegrations } from '../hooks/useMarketplaceIntegrations';
import { PROVIDER_LABELS, PROVIDER_COLORS, ORDER_STATUS_LABELS } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { 
  ShoppingBag, 
  Check, 
  X, 
  ChefHat, 
  Package, 
  Truck, 
  Clock,
  Phone,
  MapPin,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MarketplaceOrdersPage() {
  const { 
    orders, 
    isLoading, 
    acceptOrder, 
    rejectOrder, 
    updateOrderStatus,
    pendingOrdersCount,
  } = useMarketplaceIntegrations();

  const [rejectReason, setRejectReason] = useState('');
  const [selectedTab, setSelectedTab] = useState('pending');

  const pendingOrders = orders.filter(o => o.status === 'placed' || o.status === 'confirmed');
  const inProgressOrders = orders.filter(o => 
    o.status === 'preparation_started' || 
    o.status === 'ready_for_pickup' || 
    o.status === 'dispatched'
  );
  const completedOrders = orders.filter(o => 
    o.status === 'delivered' || o.status === 'cancelled'
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'placed': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <Check className="h-4 w-4" />;
      case 'preparation_started': return <ChefHat className="h-4 w-4" />;
      case 'ready_for_pickup': return <Package className="h-4 w-4" />;
      case 'dispatched': return <Truck className="h-4 w-4" />;
      case 'delivered': return <Check className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'confirmed': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'preparation_started': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'ready_for_pickup': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'dispatched': return 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30';
      case 'delivered': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleAccept = async (orderId: string) => {
    await acceptOrder.mutateAsync(orderId);
  };

  const handleReject = async (orderId: string) => {
    await rejectOrder.mutateAsync({ orderId, reason: rejectReason || 'Restaurante indisponível' });
    setRejectReason('');
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    await updateOrderStatus.mutateAsync({ orderId, status });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const OrderCard = ({ order }: { order: any }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: PROVIDER_COLORS[order.provider as keyof typeof PROVIDER_COLORS] }}
            />
            <CardTitle className="text-lg">{order.display_id}</CardTitle>
            <Badge variant="outline" className={getStatusColor(order.status)}>
              {getStatusIcon(order.status)}
              <span className="ml-1">{ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}</span>
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(order.placed_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {/* Customer Info */}
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="font-medium">{order.customer_name}</p>
              {order.customer_phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {order.customer_phone}
                </p>
              )}
              {order.delivery_address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {order.delivery_address}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(order.total_cents)}</p>
              <p className="text-xs text-muted-foreground">
                {order.payment_prepaid ? 'Pago online' : order.payment_method}
              </p>
            </div>
          </div>

          {/* Items */}
          {order.items_json && order.items_json.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Itens:</p>
              <ul className="text-sm space-y-1">
                {order.items_json.slice(0, 5).map((item: any, idx: number) => (
                  <li key={idx} className="flex justify-between">
                    <span>{item.quantity || 1}x {item.name || item.itemName}</span>
                    {item.price && <span>{formatCurrency(item.price * 100)}</span>}
                  </li>
                ))}
                {order.items_json.length > 5 && (
                  <li className="text-muted-foreground">
                    +{order.items_json.length - 5} itens...
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Observations */}
          {order.observations && (
            <div className="bg-muted/50 rounded-md p-2 text-sm">
              <span className="font-medium">Obs:</span> {order.observations}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            {order.status === 'placed' && (
              <>
                <Button 
                  className="flex-1"
                  onClick={() => handleAccept(order.id)}
                  disabled={acceptOrder.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aceitar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex-1">
                      <X className="h-4 w-4 mr-2" />
                      Rejeitar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Rejeitar Pedido</AlertDialogTitle>
                      <AlertDialogDescription>
                        Informe o motivo da rejeição:
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input 
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Ex: Restaurante fechado, item indisponível..."
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleReject(order.id)}>
                        Confirmar Rejeição
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {order.status === 'confirmed' && (
              <Button 
                className="flex-1"
                onClick={() => handleStatusUpdate(order.id, 'preparation_started')}
                disabled={updateOrderStatus.isPending}
              >
                <ChefHat className="h-4 w-4 mr-2" />
                Iniciar Preparo
              </Button>
            )}

            {order.status === 'preparation_started' && (
              <Button 
                className="flex-1"
                onClick={() => handleStatusUpdate(order.id, 'ready_for_pickup')}
                disabled={updateOrderStatus.isPending}
              >
                <Package className="h-4 w-4 mr-2" />
                Pronto para Retirada
              </Button>
            )}

            {order.status === 'ready_for_pickup' && (
              <Button 
                className="flex-1"
                onClick={() => handleStatusUpdate(order.id, 'dispatched')}
                disabled={updateOrderStatus.isPending}
              >
                <Truck className="h-4 w-4 mr-2" />
                Saiu para Entrega
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" />
              Pedidos Marketplace
            </h1>
            <p className="text-muted-foreground">
              iFood, Rappi, Uber Eats, Aiqfome
            </p>
          </div>
          {pendingOrdersCount > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              <AlertCircle className="h-4 w-4 mr-2" />
              {pendingOrdersCount} Novo{pendingOrdersCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="pending" className="relative">
              Pendentes
              {pendingOrders.length > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 justify-center">
                  {pendingOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="progress">
              Em Andamento
              {inProgressOrders.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">
                  {inProgressOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">Finalizados</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum pedido pendente</p>
                </div>
              ) : (
                pendingOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="progress" className="mt-4">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {inProgressOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum pedido em andamento</p>
                </div>
              ) : (
                inProgressOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {completedOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum pedido finalizado hoje</p>
                </div>
              ) : (
                completedOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
