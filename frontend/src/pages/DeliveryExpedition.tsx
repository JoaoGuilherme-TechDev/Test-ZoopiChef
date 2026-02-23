/**
 * Delivery Expedition Module
 * 
 * Terminal de expedição para entregadores:
 * - Tickets de entrega com código de barras
 * - Entregador escaneia tickets e depois o crachá
 * - Sistema faz o despacho automático
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  ScanBarcode, 
  User, 
  Package, 
  Truck, 
  Check, 
  X, 
  Clock,
  MapPin,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface DeliveryTicket {
  id: string;
  order_number: number;
  customer_name: string;
  customer_address: string;
  total: number;
  created_at: string;
}

interface Deliverer {
  id: string;
  name: string;
  whatsapp: string | null;
}

type ExpeditionMode = 'scanning' | 'badge' | 'dispatching' | 'complete';

export default function DeliveryExpedition() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();
  
  const [mode, setMode] = useState<ExpeditionMode>('scanning');
  const [scannedTickets, setScannedTickets] = useState<DeliveryTicket[]>([]);
  const [selectedDeliverer, setSelectedDeliverer] = useState<Deliverer | null>(null);
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input
  useEffect(() => {
    if ((mode === 'scanning' || mode === 'badge') && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  // Fetch pending delivery orders
  const { data: pendingOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['pending-deliveries', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_address, total, created_at')
        .eq('company_id', company.id)
        .eq('status', 'pronto')
        .eq('fulfillment_type', 'delivery')
        .is('deliverer_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data.map(o => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name || 'Cliente',
        customer_address: o.customer_address || '',
        total: o.total / 100,
        created_at: o.created_at,
      })) as DeliveryTicket[];
    },
    enabled: !!company?.id,
    refetchInterval: 10000,
  });

  // Fetch deliverers
  const { data: deliverers = [] } = useQuery({
    queryKey: ['deliverers', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('deliverers')
        .select('id, name, whatsapp, access_token')
        .eq('company_id', company.id)
        .eq('active', true);

      if (error) throw error;
      return data as Deliverer[];
    },
    enabled: !!company?.id,
  });

  // Dispatch orders to deliverer
  const dispatchOrders = useMutation({
    mutationFn: async () => {
      if (!selectedDeliverer || scannedTickets.length === 0) return;
      
      const orderIds = scannedTickets.map(t => t.id);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          deliverer_id: selectedDeliverer.id,
          status: 'em_rota',
          dispatched_at: new Date().toISOString(),
        })
        .in('id', orderIds);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      setMode('complete');
      queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
      toast.success(`${scannedTickets.length} entregas despachadas para ${selectedDeliverer?.name}!`);
    },
    onError: () => {
      toast.error('Erro ao despachar entregas');
    },
  });

  const handleScanTicket = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Extract order number from barcode (format: ORDER-{number})
    const orderNumber = parseInt(barcode.replace(/\D/g, ''));
    const order = pendingOrders.find(o => o.order_number === orderNumber);
    
    if (order) {
      if (scannedTickets.find(t => t.id === order.id)) {
        toast.warning('Ticket já escaneado');
      } else {
        setScannedTickets(prev => [...prev, order]);
        toast.success(`Pedido #${order.order_number} adicionado`);
      }
    } else {
      toast.error('Ticket não encontrado ou já despachado');
    }
    
    setBarcode('');
  };

  const handleScanBadge = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find deliverer by badge code (access_token)
    const deliverer = deliverers.find(d => 
      (d as any).access_token === barcode || 
      d.id === barcode ||
      d.name.toLowerCase().includes(barcode.toLowerCase())
    );
    
    if (deliverer) {
      setSelectedDeliverer(deliverer);
      setMode('dispatching');
    } else {
      toast.error('Crachá não reconhecido');
    }
    
    setBarcode('');
  };

  const removeTicket = (ticketId: string) => {
    setScannedTickets(prev => prev.filter(t => t.id !== ticketId));
  };

  const handleConfirmDispatch = () => {
    dispatchOrders.mutate();
  };

  const handleReset = () => {
    setMode('scanning');
    setScannedTickets([]);
    setSelectedDeliverer(null);
    setBarcode('');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Complete screen
  if (mode === 'complete') {
    return (
      <DashboardLayout title="Expedição">
        <div className="flex items-center justify-center min-h-[70vh]">
          <Card className="w-full max-w-md text-center">
            <CardContent className="py-12">
              <div className="w-24 h-24 rounded-full bg-green-500 mx-auto mb-6 flex items-center justify-center">
                <Check className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-green-600 mb-2">Despacho Concluído!</h1>
              <p className="text-xl text-muted-foreground mb-4">
                {scannedTickets.length} entregas para {selectedDeliverer?.name}
              </p>
              <Button size="lg" className="w-full" onClick={handleReset}>
                <RefreshCw className="mr-2 h-5 w-5" />
                Nova Expedição
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Expedição de Entregadores">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Expedição</h1>
            <p className="text-muted-foreground">
              Terminal de despacho de entregas
            </p>
          </div>
          <div className="flex gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Package className="mr-2 h-4 w-4" />
              {pendingOrders.length} Aguardando
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Truck className="mr-2 h-4 w-4" />
              {scannedTickets.length} Selecionados
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {mode === 'scanning' ? (
                  <>
                    <ScanBarcode className="h-5 w-5" />
                    Escanear Tickets
                  </>
                ) : mode === 'badge' ? (
                  <>
                    <User className="h-5 w-5" />
                    Escanear Crachá
                  </>
                ) : (
                  <>
                    <Truck className="h-5 w-5" />
                    Confirmar Despacho
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mode === 'scanning' && (
                <form onSubmit={handleScanTicket} className="space-y-4">
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Escaneie o código de barras do ticket..."
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="text-center text-xl h-14"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={!barcode}>
                      <ScanBarcode className="mr-2 h-4 w-4" />
                      Adicionar Ticket
                    </Button>
                    <Button 
                      type="button" 
                      variant="default"
                      className="flex-1"
                      disabled={scannedTickets.length === 0}
                      onClick={() => setMode('badge')}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Identificar Entregador
                    </Button>
                  </div>
                </form>
              )}

              {mode === 'badge' && (
                <form onSubmit={handleScanBadge} className="space-y-4">
                  <div className="text-center p-8 border-2 border-dashed rounded-lg">
                    <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium">Passe o crachá do entregador</p>
                  </div>
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Código do crachá..."
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="text-center text-xl h-14"
                    autoFocus
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setMode('scanning')}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                </form>
              )}

              {mode === 'dispatching' && selectedDeliverer && (
                <div className="space-y-4">
                  <div className="text-center p-6 bg-primary/10 rounded-lg">
                    <User className="h-12 w-12 mx-auto mb-2 text-primary" />
                    <h3 className="text-xl font-bold">{selectedDeliverer.name}</h3>
                    {selectedDeliverer.whatsapp && (
                      <p className="text-muted-foreground">{selectedDeliverer.whatsapp}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedDeliverer(null);
                        setMode('badge');
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Trocar
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleConfirmDispatch}
                      disabled={dispatchOrders.isPending}
                    >
                      {dispatchOrders.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Truck className="mr-2 h-4 w-4" />
                      )}
                      Despachar {scannedTickets.length} Entregas
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scanned Tickets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Tickets Selecionados</span>
                {scannedTickets.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setScannedTickets([])}>
                    Limpar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scannedTickets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum ticket escaneado</p>
                  <p className="text-sm">Escaneie os códigos de barras dos tickets de entrega</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {scannedTickets.map((ticket) => (
                      <div 
                        key={ticket.id}
                        className="p-4 border rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                            <Package className="h-5 w-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="font-medium">Pedido #{ticket.order_number}</p>
                            <p className="text-sm text-muted-foreground">{ticket.customer_name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {ticket.customer_address}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">{formatCurrency(ticket.total)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTicket(ticket.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Entregas Aguardando Expedição
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma entrega pendente</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pendingOrders.map((order) => {
                  const isScanned = scannedTickets.find(t => t.id === order.id);
                  return (
                    <Card 
                      key={order.id} 
                      className={`cursor-pointer transition-all ${isScanned ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'}`}
                      onClick={() => {
                        if (!isScanned) {
                          setScannedTickets(prev => [...prev, order]);
                          toast.success(`Pedido #${order.order_number} adicionado`);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={isScanned ? 'default' : 'outline'}>
                            #{order.order_number}
                          </Badge>
                          {isScanned && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="font-medium truncate">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{order.customer_address}</p>
                        <p className="text-sm font-bold mt-2">{formatCurrency(order.total)}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
