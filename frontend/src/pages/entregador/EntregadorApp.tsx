/**
 * EntregadorApp - Isolated Delivery App after PIN authentication
 * 
 * Route: /entregador/app
 * 
 * This component loads only after successful PIN authentication.
 * It uses the session token from localStorage to fetch deliverer data.
 * 
 * Completely isolated from main app authentication.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Bike, MapPin, Phone, Clock, CheckCircle2, Navigation, Package, User, LogOut, Trophy, Map, List, Crosshair, MapPinOff } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DelivererRouteMap } from '@/components/deliverer/DelivererRouteMap';
import { DelivererAlertSound } from '@/components/deliverer/DelivererAlertSound';
import { DelivererStatusBar } from '@/components/deliverer/DelivererStatusBar';

const SESSION_KEY = 'entregador_session_token';

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

interface SessionData {
  valid: boolean;
  deliverer: {
    id: string;
    name: string;
    availability_status?: string;
  };
  company: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
}

export default function EntregadorApp() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('map');
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get session token
  const sessionToken = localStorage.getItem(SESSION_KEY);

  // Validate session and get deliverer info
  const { data: sessionData, isLoading: isValidating, error: sessionError } = useQuery({
    queryKey: ['entregador-session', sessionToken],
    queryFn: async (): Promise<SessionData> => {
      if (!sessionToken) throw new Error('Não autenticado');

      const { data, error } = await supabase.functions.invoke('entregador-auth', {
        body: { action: 'validate', session_token: sessionToken }
      });

      if (error) throw error;
      if (!data?.valid) throw new Error(data?.error || 'Sessão inválida');

      return data as SessionData;
    },
    enabled: !!sessionToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: true
  });

  // Fetch orders for this deliverer using session token
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['entregador-orders', sessionData?.deliverer?.id],
    queryFn: async () => {
      if (!sessionData?.deliverer?.id || !sessionToken) return { orders: [], stats: null };

      // Use session_token for authentication (from entregador-auth flow)
      const { data, error } = await supabase.functions.invoke('deliverer-orders', {
        body: { 
          session_token: sessionToken
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!sessionData?.deliverer?.id && !!sessionToken,
    refetchInterval: 10000
  });

  const orders: Order[] = ordersData?.orders || [];
  const stats = ordersData?.stats || { total_today: 0, on_time_today: 0, ranking_position: null };
  const isAvailable = sessionData?.deliverer?.availability_status !== 'unavailable';

  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.functions.invoke('entregador-auth', {
        body: { action: 'logout', session_token: sessionToken }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem(SESSION_KEY);
      toast.success('Desconectado com sucesso');
      navigate('/entregador', { replace: true });
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!sessionToken) {
      navigate('/entregador', { replace: true });
    }
  }, [sessionToken, navigate]);

  // Redirect if session is invalid
  useEffect(() => {
    if (sessionError) {
      localStorage.removeItem(SESSION_KEY);
      toast.error('Sessão expirada. Faça login novamente.');
      navigate('/entregador', { replace: true });
    }
  }, [sessionError, navigate]);

  // Location tracking
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('GPS não suportado');
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

        // Send location to server
        if (sessionData?.deliverer?.id && sessionData?.company?.id) {
          sendLocationToServer(newLocation, sessionData.deliverer.id, sessionData.company.id);
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

    return () => navigator.geolocation.clearWatch(watchId);
  }, [sessionData]);

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

  // Auto-start location tracking
  useEffect(() => {
    if (sessionData?.deliverer && !isTrackingLocation) {
      const cleanup = startLocationTracking();
      return cleanup;
    }
  }, [sessionData, isTrackingLocation, startLocationTracking]);

  // Status mutations
  const setUnavailable = useMutation({
    mutationFn: async (reason: string) => {
      const { data, error } = await supabase.functions.invoke('deliverer-orders', {
        body: { 
          session_token: sessionToken,
          action: 'set_unavailable', 
          unavailability_reason: reason 
        }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregador-session'] });
      queryClient.invalidateQueries({ queryKey: ['entregador-orders'] });
      toast.success('Você está indisponível');
    },
    onError: () => toast.error('Erro ao alterar status'),
  });

  const setAvailable = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('deliverer-orders', {
        body: { 
          session_token: sessionToken,
          action: 'set_available' 
        }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregador-session'] });
      queryClient.invalidateQueries({ queryKey: ['entregador-orders'] });
      toast.success('Você está disponível!');
    },
    onError: () => toast.error('Erro ao alterar status'),
  });

  const triggerPanic = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('deliverer-orders', {
        body: { 
          session_token: sessionToken,
          action: 'trigger_panic' 
        }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => toast.success('Alerta de pânico enviado!'),
    onError: () => toast.error('Erro ao enviar alerta'),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { data, error } = await supabase.functions.invoke('deliverer-orders', {
        body: { 
          session_token: sessionToken,
          action: 'update_status', 
          orderId, 
          status 
        }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregador-orders'] });
      toast.success('Status atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar status'),
  });

  const openMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
  };

  const callCustomer = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

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

  // Loading states
  if (!sessionToken || isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!sessionData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Alert sound for new orders */}
      <DelivererAlertSound ordersCount={orders.length} enabled={true} />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-green-500/25 p-4 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
        <div className="flex items-center gap-3">
          {sessionData.company.logo_url ? (
            <img 
              src={sessionData.company.logo_url} 
              alt={sessionData.company.name}
              className="w-12 h-12 rounded-full object-cover border border-green-500/30"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center border border-green-500/30">
              <Bike className="w-6 h-6 text-green-500" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="font-bold text-lg">{sessionData.deliverer.name}</h1>
            <p className="text-sm text-muted-foreground">
              {orders.length} {orders.length === 1 ? 'entrega pendente' : 'entregas pendentes'}
            </p>
          </div>
          {stats.ranking_position && (
            <div className="flex items-center gap-1 bg-green-500/10 px-3 py-1 rounded-full">
              <Trophy className="w-4 h-4 text-green-500" />
              <span className="font-bold text-green-500">#{stats.ranking_position}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-4 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span><strong>{stats.total_today}</strong> hoje</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span><strong>{stats.on_time_today}</strong> no prazo</span>
          </div>
          <div className="flex items-center gap-2 text-sm ml-auto">
            {myLocation ? (
              <>
                <Crosshair className="w-4 h-4 text-green-500" />
                <span className="text-green-500 text-xs">GPS Ativo</span>
              </>
            ) : locationError ? (
              <>
                <MapPinOff className="w-4 h-4 text-red-500" />
                <span className="text-red-500 text-xs">{locationError}</span>
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

      {/* Status Bar */}
      <DelivererStatusBar
        isAvailable={isAvailable}
        unavailabilityReason={null}
        onSetUnavailable={async (reason) => { await setUnavailable.mutateAsync(reason); }}
        onSetAvailable={async () => { await setAvailable.mutateAsync(); }}
        onPanic={async () => { await triggerPanic.mutateAsync(); }}
        isPending={setUnavailable.isPending || setAvailable.isPending}
        hasPanicEnabled={true}
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

              {/* Quick order summary */}
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
                          order.status === 'em_rota' ? 'bg-blue-500' : 'bg-yellow-500'
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
                  <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Sem entregas</h3>
                  <p className="text-muted-foreground">
                    Nenhuma entrega pendente no momento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              orders.map((order, index) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                          order.status === 'em_rota' ? 'bg-blue-500' : 'bg-yellow-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {order.customer_name || 'Cliente'}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), "HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Address */}
                    {order.customer_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{order.customer_address}</p>
                      </div>
                    )}

                    {/* Notes */}
                    {order.address_notes && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        {order.address_notes}
                      </p>
                    )}

                    {/* Total */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-bold">
                        R$ {order.total.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {order.customer_phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => callCustomer(order.customer_phone!)}
                          className="flex-1"
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Ligar
                        </Button>
                      )}
                      {order.customer_address && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openMaps(order.customer_address!)}
                          className="flex-1"
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          Navegar
                        </Button>
                      )}
                      {order.status === 'pronto' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus.mutate({ orderId: order.id, status: 'em_rota' })}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          Saí p/ Entrega
                        </Button>
                      )}
                      {order.status === 'em_rota' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus.mutate({ orderId: order.id, status: 'entregue' })}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Entreguei
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
