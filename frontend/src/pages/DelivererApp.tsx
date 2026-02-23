import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Bike, MapPin, Phone, Clock, CheckCircle2, Navigation, Package, User, Download, Trophy, Map, List, Crosshair, MapPinOff } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DelivererRouteMap } from '@/components/deliverer/DelivererRouteMap';
import { DelivererAlertSound } from '@/components/deliverer/DelivererAlertSound';
import { DelivererStatusBar } from '@/components/deliverer/DelivererStatusBar';
import { 
  saveEntregadorContext, 
  touchEntregadorContext 
} from '@/lib/pwa/entregadorPersistence';

interface Order {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  address_notes: string | null;
  total: number;
  status: string;
  created_at: string;
  notes: string | null;
  latitude?: number | null;
  longitude?: number | null;
  items?: Array<{
    product_name: string;
    quantity: number;
    notes?: string | null;
  }>;
}

interface Deliverer {
  id: string;
  name: string;
  company_id: string;
  availability_status?: string;
  unavailability_reason?: string | null;
}

interface DelivererResponse {
  deliverer: Deliverer;
  orders: Order[];
  panic_enabled?: boolean;
}

interface DelivererStats {
  total_today: number;
  on_time_today: number;
  ranking_position: number | null;
}

export default function DelivererApp() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [stats, setStats] = useState<DelivererStats>({ total_today: 0, on_time_today: 0, ranking_position: null });
  const [activeTab, setActiveTab] = useState('map');
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [panicEnabled, setPanicEnabled] = useState(false);

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('App instalado com sucesso!');
    }
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  // Use edge function for secure data access
  const { data, isLoading, error } = useQuery({
    queryKey: ['deliverer-app', token],
    queryFn: async (): Promise<DelivererResponse> => {
      if (!token) throw new Error('Token não fornecido');
      
      const { data: responseData, error: fnError } = await supabase.functions.invoke('deliverer-orders', {
        body: { token },
      });
      
      if (fnError) throw fnError;
      if (responseData.error) throw new Error(responseData.error);

      // Update stats if provided
      if (responseData.stats) {
        setStats(responseData.stats);
      }
      
      // Update panic setting
      if (responseData.panic_enabled !== undefined) {
        setPanicEnabled(responseData.panic_enabled);
      }
      
      return responseData as DelivererResponse;
    },
    enabled: !!token,
    refetchInterval: 10000,
  });

  const deliverer = data?.deliverer;
  const orders = data?.orders || [];
  const isAvailable = deliverer?.availability_status !== 'unavailable';

  // Persist entregador context to localStorage for PWA auto-restore
  useEffect(() => {
    if (deliverer && token) {
      saveEntregadorContext({
        companyId: deliverer.company_id,
        companySlug: '', // Will be populated from URL if available
        companyName: '', // Could be fetched separately if needed
        entregadorToken: token,
        entregadorName: deliverer.name,
        lastAccessedAt: new Date().toISOString(),
      });
    }
  }, [deliverer, token]);

  // Touch context periodically to track activity
  useEffect(() => {
    const interval = setInterval(() => {
      touchEntregadorContext();
    }, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // Mutations for availability and panic
  const setUnavailable = useMutation({
    mutationFn: async (reason: string) => {
      const { data: responseData, error: fnError } = await supabase.functions.invoke('deliverer-orders', {
        body: { token, action: 'set_unavailable', unavailability_reason: reason },
      });
      if (fnError) throw fnError;
      if (responseData.error) throw new Error(responseData.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverer-app'] });
      toast.success('Você está indisponível');
    },
    onError: () => {
      toast.error('Erro ao alterar status');
    },
  });

  const setAvailable = useMutation({
    mutationFn: async () => {
      const { data: responseData, error: fnError } = await supabase.functions.invoke('deliverer-orders', {
        body: { token, action: 'set_available' },
      });
      if (fnError) throw fnError;
      if (responseData.error) throw new Error(responseData.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverer-app'] });
      toast.success('Você está disponível novamente!');
    },
    onError: () => {
      toast.error('Erro ao alterar status');
    },
  });

  const triggerPanic = useMutation({
    mutationFn: async () => {
      const { data: responseData, error: fnError } = await supabase.functions.invoke('deliverer-orders', {
        body: { token, action: 'trigger_panic' },
      });
      if (fnError) throw fnError;
      if (responseData.error) throw new Error(responseData.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverer-app'] });
      toast.success('Alerta de pânico enviado!');
    },
    onError: () => {
      toast.error('Erro ao enviar alerta');
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { data: responseData, error: fnError } = await supabase.functions.invoke('deliverer-orders', {
        body: { token, action: 'update_status', orderId, status },
      });
      
      if (fnError) throw fnError;
      if (responseData.error) throw new Error(responseData.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverer-app'] });
      toast.success('Status atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pronto': return 'bg-warning text-warning-foreground';
      case 'em_rota': return 'bg-info text-info-foreground';
      case 'entregue': return 'bg-success text-success-foreground';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pronto': return 'Pronto p/ Retirar';
      case 'em_rota': return 'Em Rota';
      case 'entregue': return 'Entregue';
      default: return status;
    }
  };

  const openMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
  };

  // Start location tracking
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalização não suportada');
      toast.error('Seu navegador não suporta GPS');
      return;
    }

    setIsTrackingLocation(true);
    setLocationError(null);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setMyLocation(newLocation);
        
        // Send location to server if we have deliverer info
        if (deliverer?.id && deliverer?.company_id) {
          sendLocationToServer(newLocation, deliverer.id, deliverer.company_id);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError('Permissão negada');
            toast.error('Ative a localização para usar o mapa');
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError('GPS indisponível');
            break;
          case err.TIMEOUT:
            setLocationError('Timeout');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    // Store watch ID for cleanup
    return () => navigator.geolocation.clearWatch(watchId);
  }, [deliverer]);

  // Send location to edge function
  const sendLocationToServer = async (
    location: { latitude: number; longitude: number },
    delivererId: string,
    companyId: string
  ) => {
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deliverer-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: 'update_location',
          deliverer_id: delivererId,
          company_id: companyId,
          latitude: location.latitude,
          longitude: location.longitude,
          is_online: true,
          recorded_at: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Error sending location:', err);
    }
  };

  // Auto-start location tracking when loaded
  useEffect(() => {
    if (deliverer && !isTrackingLocation) {
      const cleanup = startLocationTracking();
      return cleanup;
    }
  }, [deliverer, isTrackingLocation, startLocationTracking]);

  const callCustomer = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !deliverer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Bike className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Acesso Inválido</h2>
            <p className="text-muted-foreground">
              Link de entregador inválido ou expirado. Entre em contato com a empresa.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Alert sound for new orders */}
      <DelivererAlertSound ordersCount={orders.length} enabled={true} />
      
      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg flex items-center gap-3">
          <Download className="w-6 h-6" />
          <div className="flex-1">
            <p className="font-medium">Instalar App</p>
            <p className="text-sm opacity-80">Acesse mais rápido na tela inicial</p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleInstall}>
            Instalar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowInstallPrompt(false)}>
            ×
          </Button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-[hsla(265,90%,62%,0.25)] p-4 shadow-[0_0_10px_hsla(265,90%,62%,0.2),0_4px_20px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-[hsla(265,90%,62%,0.3)] shadow-[0_0_12px_hsla(265,90%,62%,0.3)]">
            <Bike className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">{deliverer.name}</h1>
            <p className="text-sm text-muted-foreground">
              {orders.length} {orders.length === 1 ? 'entrega pendente' : 'entregas pendentes'}
            </p>
          </div>
          {stats.ranking_position && (
            <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="font-bold text-primary">#{stats.ranking_position}</span>
            </div>
          )}
        </div>
        
        {/* Stats Bar */}
        <div className="flex gap-4 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span><strong>{stats.total_today}</strong> hoje</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span><strong>{stats.on_time_today}</strong> no prazo</span>
          </div>
          <div className="flex items-center gap-2 text-sm ml-auto">
            {myLocation ? (
              <>
                <Crosshair className="w-4 h-4 text-success" />
                <span className="text-success text-xs">GPS Ativo</span>
              </>
            ) : locationError ? (
              <>
                <MapPinOff className="w-4 h-4 text-destructive" />
                <span className="text-destructive text-xs">{locationError}</span>
              </>
            ) : (
              <>
                <Crosshair className="w-4 h-4 text-muted-foreground animate-pulse" />
                <span className="text-muted-foreground text-xs">Buscando GPS...</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Status Bar (availability + panic) - always visible */}
      <DelivererStatusBar
        isAvailable={isAvailable}
        unavailabilityReason={deliverer?.unavailability_reason}
        onSetUnavailable={async (reason) => { await setUnavailable.mutateAsync(reason); }}
        onSetAvailable={async () => { await setAvailable.mutateAsync(); }}
        onPanic={async () => { await triggerPanic.mutateAsync(); }}
        isPending={setUnavailable.isPending || setAvailable.isPending}
        hasPanicEnabled={true} // Always show panic button
      />

      {/* Main Content with Tabs */}
      <main className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 sticky top-[140px] z-40 bg-background">
            <TabsTrigger value="map" className="gap-2">
              <Map className="w-4 h-4" />
              Mapa
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              Lista ({orders.length})
            </TabsTrigger>
          </TabsList>

          {/* Map Tab */}
          <TabsContent value="map" className="flex-1 p-4 mt-0">
            <div className="space-y-4">
              <DelivererRouteMap
                orders={orders}
                delivererLocation={myLocation}
                onNavigate={openMaps}
              />
              
              {/* Quick order summary below map */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Sequência de Entregas</h3>
                {orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma entrega pendente</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {orders.map((order, index) => (
                      <div
                        key={order.id}
                        className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg text-sm"
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          order.status === 'em_rota' ? 'bg-info' : 'bg-warning'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="truncate max-w-[150px]">
                          {order.customer_name || order.customer_address?.split(',')[0] || 'Entrega'}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => order.customer_address && openMaps(order.customer_address)}
                        >
                          <Navigation className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* List Tab */}
          <TabsContent value="list" className="flex-1 p-4 mt-0 space-y-4">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-1">Nenhuma entrega pendente</h3>
                  <p className="text-sm text-muted-foreground">
                    Aguarde novos pedidos serem atribuídos a você
                  </p>
                </CardContent>
              </Card>
            ) : (
              orders.map((order, index) => (
                <Card key={order.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* Order number badge */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                          order.status === 'em_rota' ? 'bg-info' : 'bg-warning'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {order.customer_name || 'Cliente'}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {format(new Date(order.created_at), "HH:mm 'de' dd/MM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Endereço */}
                    {order.customer_address && (
                      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{order.customer_address}</p>
                            {order.address_notes && (
                              <p className="text-xs text-warning font-medium mt-1">
                                📍 {order.address_notes}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openMaps(order.customer_address!)}
                          >
                            <Navigation className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Telefone */}
                    {order.customer_phone && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Phone className="w-5 h-5 text-muted-foreground" />
                        <span className="flex-1 text-sm">{order.customer_phone}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => callCustomer(order.customer_phone!)}
                        >
                          Ligar
                        </Button>
                      </div>
                    )}

                    {/* Itens */}
                    {order.items && order.items.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Itens</p>
                        <div className="text-sm space-y-1">
                          {order.items.map((item, i) => (
                            <div key={i}>
                              <p>{item.quantity}x {item.product_name}</p>
                              {item.notes && (
                                <p className="text-xs text-warning pl-4">📝 {item.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Observações */}
                    {order.notes && (
                      <div className="p-2 bg-warning/10 rounded text-sm text-warning-foreground">
                        <strong>Obs:</strong> {order.notes}
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="font-medium">Total</span>
                      <span className="text-lg font-bold text-primary">
                        R$ {order.total.toFixed(2)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {order.status === 'pronto' && (
                        <Button
                          className="flex-1"
                          onClick={() => updateStatus.mutate({ orderId: order.id, status: 'em_rota' })}
                          disabled={updateStatus.isPending}
                        >
                          <Bike className="w-4 h-4 mr-2" />
                          Iniciar Entrega
                        </Button>
                      )}
                      {order.status === 'em_rota' && (
                        <Button
                          className="flex-1"
                          variant="default"
                          onClick={() => updateStatus.mutate({ orderId: order.id, status: 'entregue' })}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Confirmar Entrega
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
