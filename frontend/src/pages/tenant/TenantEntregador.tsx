import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Loader2, Package, MapPin, Phone, Clock, CheckCircle, Truck, Download, Smartphone, X, 
  Navigation, Battery, Wifi, WifiOff, AlertTriangle, Coffee, AlertOctagon 
} from 'lucide-react';
import { useDelivererTracking } from '@/hooks/useDelivererTracking';

interface Order {
  id: string;
  order_number: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  total: number;
  status: string;
  created_at: string;
  notes: string | null;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    notes: string | null;
  }>;
}

function EntregadorContent() {
  const { company } = useTenant();
  const { delivererToken } = useParams<{ delivererToken: string }>();
  const queryClient = useQueryClient();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(() => {
    return localStorage.getItem('deliverer_gps_enabled') === 'true';
  });
  const [panicDialogOpen, setPanicDialogOpen] = useState(false);
  const [unavailableDialogOpen, setUnavailableDialogOpen] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState('');
  const [confirmDeliveryOrderId, setConfirmDeliveryOrderId] = useState<string | null>(null);
  
  // Delivery confirmation radius in meters
  const DELIVERY_CONFIRMATION_RADIUS = 200;

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShowPwaPrompt(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('App instalado com sucesso!');
    }
    setDeferredPrompt(null);
    setShowPwaPrompt(false);
  };

  // Fetch deliverer by token
  const { data: deliverer, isLoading: delivererLoading } = useQuery({
    queryKey: ['deliverer_by_token', delivererToken, company?.id],
    queryFn: async () => {
      if (!delivererToken || !company?.id) return null;
      
      const { data, error } = await supabase
        .from('deliverers')
        .select('*')
        .eq('company_id', company.id)
        .eq('access_token', delivererToken)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!delivererToken && !!company?.id,
  });

  // Fetch assigned orders
  const { data: orders = [], isLoading: ordersLoading, refetch } = useQuery({
    queryKey: ['deliverer_orders', deliverer?.id],
    queryFn: async () => {
      if (!deliverer?.id) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, customer_name, customer_phone, customer_address, 
          delivery_latitude, delivery_longitude,
          total, status, created_at, notes,
          order_items(id, product_name, quantity, unit_price, notes)
        `)
        .eq('deliverer_id', deliverer.id)
        .in('status', ['em_rota', 'pronto'])
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(o => ({
        ...o,
        items: o.order_items || [],
        delivery_latitude: o.delivery_latitude ?? null,
        delivery_longitude: o.delivery_longitude ?? null,
      })) as Order[];
    },
    enabled: !!deliverer?.id,
    refetchInterval: 30000, // Refresh every 30s
  });

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Check if deliverer is close enough to confirm delivery
  const canConfirmDelivery = (order: Order): { canConfirm: boolean; distance: number | null } => {
    if (!lastLocation || !order.delivery_latitude || !order.delivery_longitude) {
      // If no GPS or no destination coords, allow confirmation (graceful fallback)
      return { canConfirm: true, distance: null };
    }
    
    const distance = calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      order.delivery_latitude,
      order.delivery_longitude
    );
    
    return { canConfirm: distance <= DELIVERY_CONFIRMATION_RADIUS, distance };
  };

  // Update order status with location validation
  const updateStatus = useMutation<void, Error, { orderId: string; status: 'em_rota' | 'entregue' }>({
    mutationFn: async ({ orderId, status }) => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status,
          ...(status === 'entregue' ? { delivered_at: new Date().toISOString() } : {}),
        } as any)
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      refetch();
      if (variables.status === 'entregue') {
        toast.success('Entrega confirmada!');
      } else {
        toast.success('Status atualizado!');
      }
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  // Handle delivery confirmation with location check
  const handleConfirmDelivery = (order: Order) => {
    const { canConfirm, distance } = canConfirmDelivery(order);
    
    if (!canConfirm) {
      toast.error(
        `Você está a ${Math.round(distance!)}m do destino. Aproxime-se a menos de ${DELIVERY_CONFIRMATION_RADIUS}m para confirmar.`
      );
      return;
    }
    
    updateStatus.mutate({ orderId: order.id, status: 'entregue' });
  };

  // Panic button mutation
  const triggerPanic = useMutation({
    mutationFn: async () => {
      if (!deliverer?.id || !company?.id) throw new Error('Missing data');
      
      // Create panic alert
      await supabase.from('deliverer_alerts').insert({
        company_id: company.id,
        deliverer_id: deliverer.id,
        alert_type: 'panic',
        message: `🚨 PÂNICO: ${deliverer.name} acionou o botão de emergência!`,
        latitude: lastLocation?.latitude ?? null,
        longitude: lastLocation?.longitude ?? null,
      });

      // Update deliverer status
      await supabase.from('deliverers').update({
        availability_status: 'panic',
      }).eq('id', deliverer.id);
    },
    onSuccess: () => {
      toast.success('Alerta de pânico enviado!');
      setPanicDialogOpen(false);
      refetch();
    },
    onError: () => {
      toast.error('Erro ao enviar alerta');
    },
  });

  // Set unavailable mutation
  const setUnavailable = useMutation({
    mutationFn: async (reason: string) => {
      if (!deliverer?.id) throw new Error('Missing deliverer');
      
      await supabase.from('deliverers').update({
        availability_status: 'unavailable',
        unavailability_reason: reason,
        is_online: false,
      }).eq('id', deliverer.id);
    },
    onSuccess: () => {
      toast.success('Status atualizado para indisponível');
      setUnavailableDialogOpen(false);
      setUnavailableReason('');
      stopTracking();
      queryClient.invalidateQueries({ queryKey: ['deliverer_by_token'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  // Set available again
  const setAvailable = useMutation({
    mutationFn: async () => {
      if (!deliverer?.id) throw new Error('Missing deliverer');
      
      await supabase.from('deliverers').update({
        availability_status: 'available',
        unavailability_reason: null,
        is_online: true,
      }).eq('id', deliverer.id);
    },
    onSuccess: () => {
      toast.success('Você está disponível novamente!');
      queryClient.invalidateQueries({ queryKey: ['deliverer_by_token'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  // GPS Tracking
  const {
    isTracking,
    lastLocation,
    batteryLevel,
    startTracking,
    stopTracking,
  } = useDelivererTracking({
    delivererId: deliverer?.id || '',
    companyId: company?.id || '',
    enabled: gpsEnabled && !!deliverer?.id && !!company?.id,
    intervalMs: 15000,
  });

  // Handle GPS toggle
  const handleGpsToggle = (enabled: boolean) => {
    setGpsEnabled(enabled);
    localStorage.setItem('deliverer_gps_enabled', enabled.toString());
    
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }
  };

  // Auto-start tracking if GPS was enabled
  useEffect(() => {
    if (gpsEnabled && deliverer?.id && company?.id && !isTracking) {
      startTracking();
    }
  }, [gpsEnabled, deliverer?.id, company?.id, isTracking, startTracking]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pronto': return 'bg-amber-500';
      case 'em_rota': return 'bg-blue-500';
      case 'entregue': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pronto': return 'Pronto para Entrega';
      case 'em_rota': return 'Em Rota';
      case 'entregue': return 'Entregue';
      default: return status;
    }
  };

  const openMaps = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  const callCustomer = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\D/g, '')}`;
  };

  if (delivererLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!deliverer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Package className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Link Inválido</h1>
        <p className="text-muted-foreground text-center">
          Este link de entregador não é válido ou expirou.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* PWA Install Prompt */}
      {showPwaPrompt && (
        <div className="fixed top-0 left-0 right-0 bg-primary text-primary-foreground p-4 flex items-center justify-between z-50">
          <div className="flex items-center gap-3">
            <Smartphone className="w-6 h-6" />
            <div>
              <p className="font-semibold">Instalar App</p>
              <p className="text-sm opacity-90">Acesse mais rápido</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleInstallPwa}>
              <Download className="w-4 h-4 mr-1" />
              Instalar
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowPwaPrompt(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{company?.name}</h1>
            <p className="text-sm opacity-90">Olá, {deliverer.name}</p>
          </div>
          <Badge variant="secondary">
            {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
          </Badge>
        </div>
      </header>

      {/* GPS Control Bar */}
      <div className="bg-card border-b p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isTracking ? 'bg-green-500/10' : 'bg-muted'
            }`}>
              {isTracking ? (
                <Navigation className="w-5 h-5 text-green-500" />
              ) : (
                <Navigation className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Rastreio GPS</span>
                {isTracking && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-green-600">Ativo</span>
                  </span>
                )}
              </div>
              {lastLocation && (
                <p className="text-xs text-muted-foreground">
                  Precisão: {lastLocation.accuracy?.toFixed(0)}m
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {batteryLevel !== null && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Battery className="w-4 h-4" />
                {batteryLevel}%
              </div>
            )}
            <Switch
              checked={gpsEnabled}
              onCheckedChange={handleGpsToggle}
            />
          </div>
        </div>
      </div>

      {/* Status & Action Bar */}
      <div className="bg-muted/50 border-b p-3">
        <div className="flex items-center gap-2">
          {/* Availability Status */}
          {deliverer.availability_status === 'unavailable' ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => setAvailable.mutate()}
              disabled={setAvailable.isPending}
            >
              <Wifi className="w-4 h-4 mr-2" />
              {setAvailable.isPending ? 'Atualizando...' : 'Ficar Disponível'}
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => setUnavailableDialogOpen(true)}
            >
              <Coffee className="w-4 h-4 mr-2" />
              Pausar
            </Button>
          )}
          
          {/* Panic Button */}
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => setPanicDialogOpen(true)}
          >
            <AlertOctagon className="w-4 h-4 mr-2" />
            Pânico
          </Button>
        </div>
        
        {deliverer.availability_status === 'unavailable' && (
          <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-sm text-amber-700 dark:text-amber-300">
            <WifiOff className="w-4 h-4 inline mr-2" />
            Você está pausado{deliverer.unavailability_reason ? `: ${deliverer.unavailability_reason}` : ''}
          </div>
        )}
      </div>

      {/* Orders List */}
      <main className="p-4 space-y-4 pb-20">
        {ordersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhuma entrega pendente</p>
              <p className="text-sm text-muted-foreground">Aguarde novas atribuições</p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Pedido #{order.order_number}</CardTitle>
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Info */}
                <div className="space-y-2">
                  {order.customer_name && (
                    <p className="font-medium">{order.customer_name}</p>
                  )}
                  {order.customer_address && (
                    <button
                      onClick={() => openMaps(order.customer_address!)}
                      className="flex items-start gap-2 text-sm text-primary hover:underline"
                    >
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <span className="text-left">{order.customer_address}</span>
                    </button>
                  )}
                  {order.customer_phone && (
                    <button
                      onClick={() => callCustomer(order.customer_phone!)}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Phone className="w-4 h-4" />
                      {order.customer_phone}
                    </button>
                  )}
                </div>

                {/* Items */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.product_name}</span>
                      <span className="text-muted-foreground">
                        R$ {(item.quantity * item.unit_price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>R$ {order.total.toFixed(2)}</span>
                </div>

                {/* Notes */}
                {order.notes && (
                  <p className="text-sm text-muted-foreground bg-amber-500/10 p-2 rounded">
                    📝 {order.notes}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {order.status === 'pronto' && (
                    <Button 
                      className="flex-1"
                      onClick={() => updateStatus.mutate({ orderId: order.id, status: 'em_rota' })}
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Iniciar Entrega
                    </Button>
                  )}
                  {order.status === 'em_rota' && (
                    <Button 
                      className="flex-1"
                      onClick={() => handleConfirmDelivery(order)}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmar Entrega
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      {/* Panic Dialog */}
      <Dialog open={panicDialogOpen} onOpenChange={setPanicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertOctagon className="w-5 h-5" />
              Confirmar Pânico
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso enviará um alerta de emergência para a central. Use apenas em situações de risco real.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPanicDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => triggerPanic.mutate()} disabled={triggerPanic.isPending}>
              {triggerPanic.isPending ? 'Enviando...' : 'Confirmar Pânico'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unavailable Dialog */}
      <Dialog open={unavailableDialogOpen} onOpenChange={setUnavailableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pausar Entregas</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Motivo da pausa (opcional)"
            value={unavailableReason}
            onChange={(e) => setUnavailableReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnavailableDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => setUnavailable.mutate(unavailableReason)} disabled={setUnavailable.isPending}>
              {setUnavailable.isPending ? 'Atualizando...' : 'Pausar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TenantEntregador() {
  return (
    <TenantProvider>
      <EntregadorContent />
    </TenantProvider>
  );
}
