import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  MapPin,
  Phone,
  Package,
  Navigation,
  User,
  Truck,
  Timer,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface OrderInTransit {
  id: string;
  order_number?: number;
  customer_address: string | null;
  customer_name: string | null;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  delivery_eta_minutes?: number | null;
  dispatched_at?: string | null;
}

interface DelivererLocation {
  id: string;
  name: string;
  whatsapp: string | null;
  is_online: boolean;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: string | null;
  is_at_store?: boolean;
  arrived_at_store_at?: string | null;
  orders_in_transit: OrderInTransit[];
}

interface DelivererDetailsSheetProps {
  deliverer: DelivererLocation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivererColor?: string;
}

// Calculate distance between two points (in km)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate delivery time based on distance (assume 25km/h average speed in urban areas)
function estimateDeliveryTime(distanceKm: number): number {
  const avgSpeedKmh = 25;
  const minutes = (distanceKm / avgSpeedKmh) * 60;
  return Math.round(minutes + 3); // Add 3 min for parking/handoff
}

export function DelivererDetailsSheet({
  deliverer,
  open,
  onOpenChange,
  delivererColor = '#3b82f6',
}: DelivererDetailsSheetProps) {
  if (!deliverer) return null;

  const orders = deliverer.orders_in_transit || [];
  const hasLocation = deliverer.last_latitude && deliverer.last_longitude;

  // Calculate total estimated time for all deliveries
  let totalEstimatedMinutes = 0;
  let currentLat = deliverer.last_latitude;
  let currentLng = deliverer.last_longitude;

  const ordersWithEstimates = orders.map((order, index) => {
    let estimatedMinutes = order.delivery_eta_minutes || 0;
    let distanceFromPrevious = 0;

    if (
      currentLat &&
      currentLng &&
      order.latitude &&
      order.longitude
    ) {
      distanceFromPrevious = calculateDistance(
        currentLat,
        currentLng,
        order.latitude,
        order.longitude
      );
      
      if (!order.delivery_eta_minutes) {
        estimatedMinutes = estimateDeliveryTime(distanceFromPrevious);
      }
      
      currentLat = order.latitude;
      currentLng = order.longitude;
    }

    totalEstimatedMinutes += estimatedMinutes;

    return {
      ...order,
      estimatedMinutes,
      distanceFromPrevious,
      cumulativeMinutes: totalEstimatedMinutes,
    };
  });

  // Calculate departure time (when first order was dispatched or last location update)
  const firstDispatchTime = orders
    .map(o => o.dispatched_at)
    .filter(Boolean)
    .sort()[0];
  
  const departureTime = firstDispatchTime || deliverer.last_location_at;
  const estimatedReturnTime = departureTime 
    ? new Date(new Date(departureTime).getTime() + totalEstimatedMinutes * 60 * 1000)
    : null;

  const callDeliverer = () => {
    if (deliverer.whatsapp) {
      window.location.href = `tel:${deliverer.whatsapp.replace(/\D/g, '')}`;
    }
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: delivererColor }}
            >
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <SheetTitle className="text-xl">{deliverer.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    deliverer.is_online ? 'bg-green-500' : 'bg-gray-400'
                  )}
                />
                {deliverer.is_online ? 'Online' : 'Offline'}
                {deliverer.is_at_store && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Na casa
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] mt-6">
          <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Package className="w-4 h-4" />
                  <span className="text-sm">Entregas</span>
                </div>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Timer className="w-4 h-4" />
                  <span className="text-sm">Tempo Estimado</span>
                </div>
                <p className="text-2xl font-bold">
                  {totalEstimatedMinutes > 0 ? `${totalEstimatedMinutes} min` : '-'}
                </p>
              </div>
            </div>

            {/* Time Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Horários
              </h4>
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                {departureTime && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>Saída</span>
                    </div>
                    <span className="font-medium">
                      {format(new Date(departureTime), 'HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                )}
                {estimatedReturnTime && orders.length > 0 && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span>Retorno Previsto</span>
                    </div>
                    <span className="font-medium text-primary">
                      ~{format(estimatedReturnTime, 'HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                )}
                {deliverer.last_location_at && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm">
                      <Navigation className="w-4 h-4 text-muted-foreground" />
                      <span>Última atualização</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(deliverer.last_location_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {deliverer.whatsapp && (
                <Button variant="outline" className="flex-1" onClick={callDeliverer}>
                  <Phone className="w-4 h-4 mr-2" />
                  Ligar
                </Button>
              )}
              {hasLocation && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    openInMaps(deliverer.last_latitude!, deliverer.last_longitude!)
                  }
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Ver no Mapa
                </Button>
              )}
            </div>

            <Separator />

            {/* Orders List */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Entregas em Andamento ({orders.length})
              </h4>

              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem entregas no momento</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ordersWithEstimates.map((order, index) => (
                    <div
                      key={order.id}
                      className="border rounded-lg p-4 space-y-3"
                      style={{ borderLeftColor: delivererColor, borderLeftWidth: '4px' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: delivererColor }}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">
                              {order.customer_name || 'Cliente'}
                            </p>
                            {order.order_number && (
                              <p className="text-xs text-muted-foreground">
                                Pedido #{order.order_number}
                              </p>
                            )}
                          </div>
                        </div>
                        {order.estimatedMinutes > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {order.estimatedMinutes} min
                          </Badge>
                        )}
                      </div>

                      {order.customer_address && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{order.customer_address}</span>
                        </div>
                      )}

                      {order.distanceFromPrevious > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {order.distanceFromPrevious.toFixed(1)} km{' '}
                          {index === 0 ? 'da posição atual' : 'do ponto anterior'}
                        </p>
                      )}

                      {order.latitude && order.longitude && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => openInMaps(order.latitude!, order.longitude!)}
                        >
                          <Navigation className="w-3 h-3 mr-2" />
                          Abrir navegação
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
