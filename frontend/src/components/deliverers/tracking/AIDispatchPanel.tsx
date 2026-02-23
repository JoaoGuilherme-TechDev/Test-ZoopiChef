import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sparkles,
  Check,
  CheckCheck,
  Truck,
  Package,
  MapPin,
  Clock,
  Loader2,
  Zap,
  Route,
  Users,
  ChevronRight,
  AlertTriangle,
  Home,
  Wand2,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIDispatch } from '@/hooks/useAIDispatch';
import { toast } from 'sonner';

interface DelivererLocation {
  id: string;
  name: string;
  whatsapp: string | null;
  is_online: boolean;
  is_at_store?: boolean;
  arrived_at_store_at?: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: string | null;
  orders_in_transit: Array<{
    id: string;
    customer_address: string | null;
    customer_name: string | null;
    status: string;
  }>;
}

interface PendingOrder {
  id: string;
  order_number: number;
  customer_name: string | null;
  customer_address: string | null;
  destination_address: string | null;
  total: number;
  status: string;
  created_at: string;
  order_type: string;
}

interface AIDispatchPanelProps {
  deliverers: DelivererLocation[];
  orders: PendingOrder[];
  maxOrdersPerTrip?: number;
  onSuggestionApproved?: () => void;
}

interface MountedRoute {
  orders: PendingOrder[];
  orderedRoute: PendingOrder[];
  totalDistance: number;
  estimatedTime: number;
  neighborhood: string;
}

export function AIDispatchPanel({
  deliverers,
  orders,
  maxOrdersPerTrip = 5,
  onSuggestionApproved,
}: AIDispatchPanelProps) {
  const [mountedRoute, setMountedRoute] = useState<MountedRoute | null>(null);
  const [selectedDelivererId, setSelectedDelivererId] = useState<string>('');
  const [isDispatchingRoute, setIsDispatchingRoute] = useState(false);
  const [isMountingRoute, setIsMountingRoute] = useState(false);

  const {
    suggestions,
    availableDeliverers,
    deliverersAtStore,
    isProcessing,
    approvingId,
    approveSuggestion,
    approveAll,
    getDelivererQueueInfo,
    stats,
  } = useAIDispatch(deliverers, orders, { maxOrdersPerTrip });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleApprove = async (suggestion: any) => {
    const success = await approveSuggestion(suggestion);
    if (success && onSuggestionApproved) {
      onSuggestionApproved();
    }
  };

  // Mount route using AI optimization
  const handleMountRoute = () => {
    if (orders.length === 0) {
      toast.info('Nenhum pedido para montar rota');
      return;
    }

    setIsMountingRoute(true);

    // Use first suggestion if available (already optimized by AI)
    if (suggestions.length > 0) {
      const suggestion = suggestions[0];
      setMountedRoute({
        orders: suggestion.orders,
        orderedRoute: suggestion.orderedRoute,
        totalDistance: suggestion.totalDistance,
        estimatedTime: suggestion.estimatedTime,
        neighborhood: suggestion.neighborhood,
      });
      toast.success(`Rota montada com ${suggestion.orders.length} pedidos!`);
    } else {
      // Fallback: create simple route from all orders
      setMountedRoute({
        orders: orders.slice(0, maxOrdersPerTrip),
        orderedRoute: orders.slice(0, maxOrdersPerTrip),
        totalDistance: 0,
        estimatedTime: orders.slice(0, maxOrdersPerTrip).length * 10,
        neighborhood: 'Região selecionada',
      });
      toast.success(`Rota montada com ${Math.min(orders.length, maxOrdersPerTrip)} pedidos!`);
    }

    setIsMountingRoute(false);
  };

  // Dispatch the mounted route to selected deliverer
  const handleDispatchMountedRoute = async () => {
    if (!mountedRoute || !selectedDelivererId) {
      toast.error('Selecione um entregador para despachar a rota');
      return;
    }

    const deliverer = deliverers.find(d => d.id === selectedDelivererId);
    if (!deliverer) {
      toast.error('Entregador não encontrado');
      return;
    }

    // Create a suggestion-like object to use approveSuggestion
    const fakeSuggestion = {
      id: `mounted-route-${Date.now()}`,
      deliverer,
      orders: mountedRoute.orders,
      orderedRoute: mountedRoute.orderedRoute,
      totalDistance: mountedRoute.totalDistance,
      estimatedTime: mountedRoute.estimatedTime,
      reason: 'Rota montada manualmente',
      score: 100,
      neighborhood: mountedRoute.neighborhood,
      urgencyLevel: 'medium' as const,
    };

    setIsDispatchingRoute(true);
    const success = await approveSuggestion(fakeSuggestion);
    
    if (success) {
      setMountedRoute(null);
      setSelectedDelivererId('');
      if (onSuggestionApproved) {
        onSuggestionApproved();
      }
    }
    setIsDispatchingRoute(false);
  };

  const clearMountedRoute = () => {
    setMountedRoute(null);
    setSelectedDelivererId('');
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span>IA de Despacho</span>
          </div>
          {suggestions.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs gap-1"
                    onClick={approveAll}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCheck className="w-3 h-3" />
                    )}
                    Aprovar Todos
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Aprovar todas as {suggestions.length} sugestões</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {/* Mount Route Button - Primary Action */}
          {!mountedRoute && orders.length > 0 && (
            <div className="mb-4">
              <Button 
                className="w-full h-12 text-base gap-2" 
                onClick={handleMountRoute}
                disabled={isMountingRoute || orders.length === 0}
              >
                {isMountingRoute ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Wand2 className="w-5 h-5" />
                )}
                Montar Rota com IA
                <Badge variant="secondary" className="ml-2">
                  {orders.length} pedido(s)
                </Badge>
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                A IA organiza a melhor sequência de entregas
              </p>
            </div>
          )}

          {/* Mounted Route Panel - Ready for Dispatch */}
          {mountedRoute && (
            <div className="mb-4 p-4 rounded-lg border-2 border-primary bg-primary/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Route className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Rota Montada</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={clearMountedRoute}
                >
                  Cancelar
                </Button>
              </div>

              {/* Route info */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {mountedRoute.orders.length} pedido(s)
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ~{mountedRoute.estimatedTime} min
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {mountedRoute.neighborhood}
                </span>
              </div>

              {/* Ordered sequence preview */}
              <div className="space-y-1 mb-4">
                {mountedRoute.orderedRoute.slice(0, 5).map((order, index) => (
                  <div
                    key={order.id}
                    className="flex items-center gap-2 text-xs bg-background/80 rounded px-2 py-1"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                      {index + 1}
                    </div>
                    <span className="font-medium">#{order.order_number}</span>
                    <span className="text-muted-foreground truncate">
                      {order.customer_name || 'Cliente'}
                    </span>
                  </div>
                ))}
                {mountedRoute.orderedRoute.length > 5 && (
                  <p className="text-xs text-muted-foreground pl-2">
                    +{mountedRoute.orderedRoute.length - 5} mais...
                  </p>
                )}
              </div>

              {/* Deliverer selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Selecionar Entregador:</label>
                <Select
                  value={selectedDelivererId}
                  onValueChange={setSelectedDelivererId}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Escolha o entregador" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDeliverers.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        Nenhum entregador online
                      </SelectItem>
                    ) : (
                      availableDeliverers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          <div className="flex items-center gap-2">
                            {d.is_at_store && <Home className="w-3 h-3 text-green-600" />}
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              d.is_at_store ? "bg-green-500" : "bg-blue-500"
                            )} />
                            {d.name}
                            {d.orders_in_transit.length > 0 && (
                              <span className="text-muted-foreground">
                                ({d.orders_in_transit.length} em rota)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Dispatch button */}
              <Button
                className="w-full h-10 mt-3 gap-2"
                onClick={handleDispatchMountedRoute}
                disabled={!selectedDelivererId || isDispatchingRoute}
              >
                {isDispatchingRoute ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Despachar Rota
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Stats Summary */}
          <div className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg mb-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-lg font-bold">{stats.totalPendingOrders}</p>
                <p className="text-[10px] text-muted-foreground">Pedidos</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{stats.totalAtStore}</p>
                <p className="text-[10px] text-muted-foreground">Na Casa</p>
              </div>
              <div>
                <p className="text-lg font-bold">{stats.totalAvailableDeliverers}</p>
                <p className="text-[10px] text-muted-foreground">Online</p>
              </div>
              <div>
                <p className={cn("text-lg font-bold", stats.urgentOrders > 0 && "text-destructive")}>
                  {stats.urgentOrders}
                </p>
                <p className="text-[10px] text-muted-foreground">Urgentes</p>
              </div>
            </div>
          </div>

          {/* Deliverers at Store (Queue) */}
          {deliverersAtStore.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" />
                🏠 Na Casa ({deliverersAtStore.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {deliverersAtStore.map((d, index) => {
                  const queueInfo = getDelivererQueueInfo(d);
                  return (
                    <TooltipProvider key={d.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant={index === 0 ? 'default' : 'secondary'}
                            className={cn(
                              'text-xs cursor-help',
                              index === 0 && 'bg-green-600 hover:bg-green-600'
                            )}
                          >
                            {index + 1}º {d.name.split(' ')[0]}
                            {queueInfo.waitingTime > 0 && (
                              <span className="ml-1 opacity-70">
                                {queueInfo.waitingTime}m
                              </span>
                            )}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <p className="font-medium">{d.name}</p>
                            <p>Na casa há: {queueInfo.waitingTime} min</p>
                            <p>Entregas atuais: {queueInfo.currentOrders}</p>
                            <p>Capacidade: {queueInfo.remainingCapacity}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          )}

          {/* Online but not at store */}
          {availableDeliverers.filter(d => !d.is_at_store).length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Em Rota/Externos ({availableDeliverers.filter(d => !d.is_at_store).length})
              </p>
              <div className="flex flex-wrap gap-1">
                {availableDeliverers.filter(d => !d.is_at_store).slice(0, 5).map((d) => {
                  const queueInfo = getDelivererQueueInfo(d);
                  return (
                    <TooltipProvider key={d.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs cursor-help">
                            {d.name.split(' ')[0]}
                            {queueInfo.currentOrders > 0 && (
                              <span className="ml-1 opacity-70">
                                ({queueInfo.currentOrders})
                              </span>
                            )}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <p className="font-medium">{d.name}</p>
                            <p>Entregas atuais: {queueInfo.currentOrders}</p>
                            <p>Capacidade: {queueInfo.remainingCapacity}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          )}

          <Separator className="my-3" />

          {/* Suggestions */}
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {orders.length === 0 ? (
                <>
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum pedido aguardando</p>
                </>
              ) : availableDeliverers.length === 0 ? (
                <>
                  <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum entregador disponível</p>
                  <p className="text-xs mt-1">Aguarde um entregador ficar online</p>
                </>
              ) : (
                <>
                  <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Calculando sugestões...</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Sugestões de Despacho
              </p>

              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={cn(
                    'p-3 rounded-lg border transition-all',
                    suggestion.urgencyLevel === 'critical' && 'border-destructive bg-destructive/5 shadow-sm',
                    suggestion.urgencyLevel === 'high' && 'border-orange-500/50 bg-orange-500/5',
                    suggestion.urgencyLevel !== 'critical' && suggestion.urgencyLevel !== 'high' && index === 0 && 'border-primary/50 bg-primary/5 shadow-sm',
                    suggestion.urgencyLevel !== 'critical' && suggestion.urgencyLevel !== 'high' && index !== 0 && 'bg-card hover:bg-muted/50'
                  )}
                >
                  {/* Urgency Badge */}
                  {(suggestion.urgencyLevel === 'critical' || suggestion.urgencyLevel === 'high') && (
                    <div className={cn(
                      'flex items-center gap-1 text-xs font-medium mb-2 px-2 py-1 rounded-full w-fit',
                      suggestion.urgencyLevel === 'critical' && 'bg-destructive/10 text-destructive',
                      suggestion.urgencyLevel === 'high' && 'bg-orange-500/10 text-orange-600'
                    )}>
                      <AlertTriangle className="w-3 h-3" />
                      {suggestion.urgencyLevel === 'critical' ? 'URGENTE' : 'Atrasado'}
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          suggestion.deliverer.is_at_store
                            ? 'bg-green-600/10'
                            : suggestion.deliverer.orders_in_transit.length > 0
                              ? 'bg-orange-500/10'
                              : 'bg-muted'
                        )}
                      >
                        {suggestion.deliverer.is_at_store ? (
                          <Home className="w-4 h-4 text-green-600" />
                        ) : (
                          <Truck
                            className={cn(
                              'w-4 h-4',
                              suggestion.deliverer.orders_in_transit.length > 0
                                ? 'text-orange-500'
                                : 'text-muted-foreground'
                            )}
                          />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm flex items-center gap-1">
                          {suggestion.deliverer.name}
                          {suggestion.deliverer.is_at_store && (
                            <span className="text-[10px] text-green-600">🏠</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {suggestion.neighborhood}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={suggestion.orders.length >= 3 ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {suggestion.orders.length} pedido(s)
                    </Badge>
                  </div>

                  {/* Reason */}
                  <p className="text-xs text-muted-foreground mb-2 flex items-start gap-1">
                    <Sparkles className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                    <span>{suggestion.reason}</span>
                  </p>

                  {/* Orders List */}
                  <div className="space-y-1 mb-3">
                    {suggestion.orders.slice(0, 3).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1"
                      >
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3 text-muted-foreground" />
                          #{order.order_number}
                          {order.customer_name && (
                            <span className="text-muted-foreground truncate max-w-[100px]">
                              - {order.customer_name}
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    ))}
                    {suggestion.orders.length > 3 && (
                      <p className="text-xs text-muted-foreground pl-2">
                        +{suggestion.orders.length - 3} mais
                      </p>
                    )}
                  </div>

                  {/* Estimated info */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{suggestion.estimatedTime} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Route className="w-3 h-3" />
                      Rota otimizada
                    </span>
                  </div>

                  {/* Approve Button */}
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs"
                    variant={index === 0 ? 'default' : 'outline'}
                    onClick={() => handleApprove(suggestion)}
                    disabled={approvingId === suggestion.id}
                  >
                    {approvingId === suggestion.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Aprovar Despacho
                        <ChevronRight className="w-3 h-3 ml-auto" />
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
