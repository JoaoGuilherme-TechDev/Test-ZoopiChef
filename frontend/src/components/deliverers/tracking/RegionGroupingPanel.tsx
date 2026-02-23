import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Users, Package, Route, Sparkles, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  order_number: number;
  customer_name: string | null;
  customer_address: string | null;
  destination_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface RegionGroup {
  neighborhood: string;
  orders: Order[];
  center?: { lat: number; lng: number };
}

interface RegionGroupingPanelProps {
  orders: Order[];
  groupingRadius: number;
  onAutoAssign?: (neighborhood: string, delivererId: string) => void;
  isLoading?: boolean;
}

export function RegionGroupingPanel({
  orders,
  groupingRadius,
  onAutoAssign,
  isLoading = false,
}: RegionGroupingPanelProps) {
  // Group orders by neighborhood
  const regionGroups = useMemo(() => {
    const groups: Record<string, RegionGroup> = {};

    orders.forEach((order) => {
      // Extract neighborhood from destination_address or customer_address
      const address = order.destination_address || order.customer_address || '';
      // Simple extraction: use first part before comma or full address
      const neighborhood = address.split(',')[0]?.trim() || 'Sem endereço';
      
      if (!groups[neighborhood]) {
        groups[neighborhood] = {
          neighborhood,
          orders: [],
        };
      }
      
      groups[neighborhood].orders.push(order);
    });

    // Sort by number of orders (most orders first)
    return Object.values(groups).sort((a, b) => b.orders.length - a.orders.length);
  }, [orders]);

  const totalGroups = regionGroups.length;
  const avgOrdersPerGroup = orders.length > 0 
    ? Math.round(orders.length / totalGroups) 
    : 0;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5" />
            Agrupamento por Região
          </div>
          <Badge variant="outline" className="font-normal">
            <Sparkles className="w-3 h-3 mr-1" />
            {totalGroups} regiões
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum pedido para agrupar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{orders.length}</p>
                    <p className="text-xs text-muted-foreground">pedidos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">~{avgOrdersPerGroup}</p>
                    <p className="text-xs text-muted-foreground">por região</p>
                  </div>
                </div>
              </div>

              {/* Region groups */}
              {regionGroups.map((group) => (
                <div
                  key={group.neighborhood}
                  className="p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{group.neighborhood}</span>
                    </div>
                    <Badge 
                      variant={group.orders.length >= 3 ? 'default' : 'secondary'}
                      className={cn(
                        group.orders.length >= 3 && 'bg-primary'
                      )}
                    >
                      {group.orders.length} {group.orders.length === 1 ? 'pedido' : 'pedidos'}
                    </Badge>
                  </div>

                  {/* Order list */}
                  <div className="space-y-1 mb-2">
                    {group.orders.slice(0, 3).map((order) => (
                      <div
                        key={order.id}
                        className="text-xs text-muted-foreground flex items-center gap-2"
                      >
                        <Package className="w-3 h-3" />
                        <span>#{order.order_number}</span>
                        {order.customer_name && (
                          <span className="truncate">- {order.customer_name}</span>
                        )}
                      </div>
                    ))}
                    {group.orders.length > 3 && (
                      <p className="text-xs text-muted-foreground pl-5">
                        +{group.orders.length - 3} mais
                      </p>
                    )}
                  </div>

                  {/* Suggestion for 3+ orders */}
                  {group.orders.length >= 3 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-primary flex items-center gap-1 mb-2">
                        <Sparkles className="w-3 h-3" />
                        Recomendado: enviar 1 entregador
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-7 text-xs"
                        onClick={() => onAutoAssign?.(group.neighborhood, '')}
                      >
                        <Users className="w-3 h-3 mr-1" />
                        Atribuir entregador
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
