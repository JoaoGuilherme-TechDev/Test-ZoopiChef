import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wifi, WifiOff, Phone, MapPin, Clock, Truck, Battery, ChevronRight } from 'lucide-react';
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
  battery_level?: number | null;
  orders_in_transit: Array<{
    id: string;
    customer_address: string | null;
    customer_name: string | null;
    status: string;
  }>;
}

interface DeliverersSidebarProps {
  deliverers: DelivererLocation[];
  selectedDeliverer: string | null;
  onSelectDeliverer: (id: string | null) => void;
  onCallDeliverer?: (phone: string) => void;
}

export function DeliverersSidebar({
  deliverers,
  selectedDeliverer,
  onSelectDeliverer,
  onCallDeliverer,
}: DeliverersSidebarProps) {
  const onlineDeliverers = deliverers.filter(d => d.is_online);
  const offlineDeliverers = deliverers.filter(d => !d.is_online);

  const handleCall = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCallDeliverer) {
      onCallDeliverer(phone);
    } else {
      window.location.href = `tel:${phone.replace(/\D/g, '')}`;
    }
  };

  const renderDeliverer = (deliverer: DelivererLocation) => {
    const isSelected = selectedDeliverer === deliverer.id;
    const hasOrders = deliverer.orders_in_transit.length > 0;

    return (
      <div
        key={deliverer.id}
        className={cn(
          "p-3 rounded-lg border cursor-pointer transition-all",
          isSelected
            ? "border-primary bg-primary/5 shadow-sm"
            : "hover:bg-muted/50 hover:border-muted-foreground/20"
        )}
        onClick={() => onSelectDeliverer(isSelected ? null : deliverer.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  deliverer.is_online
                    ? hasOrders
                      ? "bg-orange-500/10"
                      : "bg-green-500/10"
                    : "bg-gray-500/10"
                )}
              >
                <Truck
                  className={cn(
                    "w-5 h-5",
                    deliverer.is_online
                      ? hasOrders
                        ? "text-orange-500"
                        : "text-green-500"
                      : "text-gray-400"
                  )}
                />
              </div>
              <div
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                  deliverer.is_online ? "bg-green-500" : "bg-gray-400"
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{deliverer.name}</p>
              {deliverer.last_location_at && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(deliverer.last_location_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {hasOrders && (
              <Badge variant="secondary" className="text-xs">
                {deliverer.orders_in_transit.length}
              </Badge>
            )}
            <ChevronRight
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                isSelected && "rotate-90"
              )}
            />
          </div>
        </div>

        {/* Expanded content */}
        {isSelected && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {/* Status info */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                {deliverer.is_online ? (
                  <Wifi className="w-3 h-3 text-green-500" />
                ) : (
                  <WifiOff className="w-3 h-3 text-gray-400" />
                )}
                <span>{deliverer.is_online ? 'Online' : 'Offline'}</span>
              </div>
              {deliverer.last_latitude && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>GPS ativo</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {deliverer.whatsapp && (
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8"
                onClick={(e) => handleCall(deliverer.whatsapp!, e)}
              >
                <Phone className="w-4 h-4 mr-2" />
                Ligar
              </Button>
            )}

            {/* Orders in transit */}
            {hasOrders && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Entregas em andamento:
                </p>
                {deliverer.orders_in_transit.map((order) => (
                  <div
                    key={order.id}
                    className="p-2 bg-muted/50 rounded text-xs"
                  >
                    <p className="font-medium">{order.customer_name || 'Cliente'}</p>
                    {order.customer_address && (
                      <p className="text-muted-foreground truncate">
                        {order.customer_address}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* No location warning */}
            {!deliverer.last_latitude && deliverer.is_online && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                GPS não ativado. Solicite ao entregador que ative a localização.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Entregadores</span>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500">
              {onlineDeliverers.length} online
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="space-y-4">
            {/* Online deliverers */}
            {onlineDeliverers.length > 0 && (
              <div className="space-y-2">
                {onlineDeliverers.map(renderDeliverer)}
              </div>
            )}

            {/* Offline deliverers */}
            {offlineDeliverers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground px-1">
                  Offline ({offlineDeliverers.length})
                </p>
                {offlineDeliverers.map(renderDeliverer)}
              </div>
            )}

            {/* No deliverers */}
            {deliverers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum entregador cadastrado</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
