import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Clock, 
  Truck, 
  Package, 
  MapPin,
  Wifi,
  Battery,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DelivererLocation {
  id: string;
  name: string;
  whatsapp: string | null;
  is_online: boolean;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: string | null;
  availability_status?: string | null;
  unavailability_reason?: string | null;
  orders_in_transit: Array<{
    id: string;
    customer_address: string | null;
    customer_name: string | null;
    status: string;
  }>;
}

interface DelivererQueuePanelProps {
  deliverers: DelivererLocation[];
  maxOrdersPerTrip?: number;
}

export function DelivererQueuePanel({
  deliverers,
  maxOrdersPerTrip = 5,
}: DelivererQueuePanelProps) {
  // Separate available and unavailable deliverers
  const unavailableDeliverers = deliverers.filter(d => 
    d.availability_status === 'unavailable' && d.unavailability_reason
  );
  
  // Sort by availability: online and free first, then by last location time
  const sortedDeliverers = [...deliverers]
    .filter(d => d.is_online && d.availability_status !== 'unavailable')
    .sort((a, b) => {
      // Free deliverers first
      const aFree = a.orders_in_transit.length === 0;
      const bFree = b.orders_in_transit.length === 0;
      if (aFree && !bFree) return -1;
      if (!aFree && bFree) return 1;
      
      // Then by waiting time (longer wait = earlier in queue)
      const aTime = a.last_location_at ? new Date(a.last_location_at).getTime() : 0;
      const bTime = b.last_location_at ? new Date(b.last_location_at).getTime() : 0;
      return aTime - bTime;
    });

  const freeCount = sortedDeliverers.filter(d => d.orders_in_transit.length === 0).length;
  const busyCount = sortedDeliverers.filter(d => d.orders_in_transit.length > 0).length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Fila de Entregadores
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="default" className="bg-green-500 text-xs">
              {freeCount} livre(s)
            </Badge>
            {busyCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {busyCount} em rota
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {sortedDeliverers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum entregador online</p>
              <p className="text-xs mt-1">Aguarde entregadores ficarem disponíveis</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedDeliverers.map((deliverer, index) => {
                const isFree = deliverer.orders_in_transit.length === 0;
                const hasLocation = deliverer.last_latitude !== null;
                const remainingCapacity = maxOrdersPerTrip - deliverer.orders_in_transit.length;
                const waitingTime = deliverer.last_location_at
                  ? Math.round((Date.now() - new Date(deliverer.last_location_at).getTime()) / (1000 * 60))
                  : 0;

                return (
                  <div
                    key={deliverer.id}
                    className={cn(
                      'p-3 rounded-lg border transition-all',
                      isFree
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-orange-500/30 bg-orange-500/5'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Queue position */}
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                          index === 0 && isFree
                            ? 'bg-green-500 text-white'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {index + 1}º
                      </div>

                      {/* Deliverer info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{deliverer.name}</p>
                          {index === 0 && isFree && (
                            <Badge variant="default" className="bg-green-500 text-[10px] h-4">
                              Próximo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {waitingTime > 0 ? `${waitingTime} min` : 'Agora'}
                          </span>
                          {hasLocation && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-green-500" />
                              GPS
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-green-500" />
                            Online
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="text-right">
                        {isFree ? (
                          <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                            Disponível
                          </Badge>
                        ) : (
                          <div className="text-right">
                            <Badge variant="secondary" className="text-xs">
                              <Package className="w-3 h-3 mr-1" />
                              {deliverer.orders_in_transit.length}/{maxOrdersPerTrip}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              +{remainingCapacity} livre
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Current orders */}
                    {deliverer.orders_in_transit.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-dashed">
                        <p className="text-[10px] text-muted-foreground mb-1">
                          Entregas em andamento:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {deliverer.orders_in_transit.map((order) => (
                            <span
                              key={order.id}
                              className="text-[10px] bg-muted px-1.5 py-0.5 rounded"
                            >
                              {order.customer_name?.split(' ')[0] || 'Pedido'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Unavailable deliverers section */}
              {unavailableDeliverers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-dashed">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Indisponíveis ({unavailableDeliverers.length})
                  </p>
                  {unavailableDeliverers.map((deliverer) => (
                    <div
                      key={deliverer.id}
                      className="p-2 rounded-lg border border-destructive/30 bg-destructive/5 mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                          <Clock className="w-3 h-3 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{deliverer.name}</p>
                          <p className="text-xs text-destructive truncate">
                            {deliverer.unavailability_reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
