import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Navigation, Phone, RefreshCw, Truck, Clock, Wifi, WifiOff } from 'lucide-react';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase-shim';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DelivererLocation {
  id: string;
  name: string;
  whatsapp: string | null;
  is_online: boolean;
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

export function DelivererTrackingMap() {
  const { company } = useCompanyContext();
  const [selectedDeliverer, setSelectedDeliverer] = useState<string | null>(null);

  const { data: deliverers, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['deliverer-locations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deliverer-location`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'get_locations',
            company_id: company.id,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      return data.deliverers as DelivererLocation[];
    },
    enabled: !!company?.id,
    refetchInterval: 30000, // Refresh every 30s
  });

  // Realtime subscription for location updates
  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel('deliverer-locations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deliverer_locations',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, refetch]);

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const callDeliverer = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\D/g, '')}`;
  };

  const onlineCount = deliverers?.filter(d => d.is_online).length || 0;
  const totalOrders = deliverers?.reduce((sum, d) => sum + d.orders_in_transit.length, 0) || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onlineCount}</p>
                <p className="text-sm text-muted-foreground">Online</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOrders}</p>
                <p className="text-sm text-muted-foreground">Em rota</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="w-full"
              >
                {isRefetching ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deliverers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Rastreio de Entregadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!deliverers || deliverers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum entregador cadastrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliverers.map((deliverer) => (
                <div
                  key={deliverer.id}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedDeliverer === deliverer.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedDeliverer(
                    selectedDeliverer === deliverer.id ? null : deliverer.id
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        deliverer.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                      }`} />
                      <div>
                        <p className="font-medium">{deliverer.name}</p>
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
                    <div className="flex items-center gap-2">
                      {deliverer.orders_in_transit.length > 0 && (
                        <Badge variant="secondary">
                          {deliverer.orders_in_transit.length} entrega{deliverer.orders_in_transit.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      <Badge variant={deliverer.is_online ? 'default' : 'outline'}>
                        {deliverer.is_online ? (
                          <><Wifi className="w-3 h-3 mr-1" /> Online</>
                        ) : (
                          <><WifiOff className="w-3 h-3 mr-1" /> Offline</>
                        )}
                      </Badge>
                    </div>
                  </div>

                  {selectedDeliverer === deliverer.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {/* Actions */}
                      <div className="flex gap-2">
                        {deliverer.last_latitude && deliverer.last_longitude && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openInMaps(deliverer.last_latitude!, deliverer.last_longitude!);
                            }}
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            Ver no Mapa
                          </Button>
                        )}
                        {deliverer.whatsapp && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              callDeliverer(deliverer.whatsapp!);
                            }}
                          >
                            <Phone className="w-4 h-4 mr-2" />
                            Ligar
                          </Button>
                        )}
                      </div>

                      {/* Orders in transit */}
                      {deliverer.orders_in_transit.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Entregas em andamento:</p>
                          {deliverer.orders_in_transit.map((order) => (
                            <div
                              key={order.id}
                              className="p-2 bg-muted/50 rounded text-sm"
                            >
                              <p className="font-medium">{order.customer_name || 'Cliente'}</p>
                              {order.customer_address && (
                                <p className="text-muted-foreground text-xs truncate">
                                  {order.customer_address}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* No location */}
                      {!deliverer.last_latitude && (
                        <p className="text-sm text-muted-foreground">
                          Localização não disponível. O entregador precisa ativar o GPS.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
