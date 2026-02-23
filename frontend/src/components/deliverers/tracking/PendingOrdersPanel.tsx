import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, MapPin, Clock, User, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-shim';
import { useQueryClient } from '@tanstack/react-query';

interface Order {
  id: string;
  order_number: number;
  customer_name: string | null;
  customer_address: string | null;
  destination_address?: string | null;
  total: number;
  status: string;
  created_at: string;
  order_type: string;
  company_id?: string;
}

interface Deliverer {
  id: string;
  name: string;
  is_online: boolean;
  orders_count: number;
  last_latitude?: number | null;
  last_longitude?: number | null;
}

interface PendingOrdersPanelProps {
  orders: Order[];
  deliverers: Deliverer[];
  isLoading?: boolean;
  onDispatch?: (orderId: string, delivererId: string) => void;
}

export function PendingOrdersPanel({
  orders,
  deliverers,
  isLoading = false,
  onDispatch,
}: PendingOrdersPanelProps) {
  const [selectedDeliverers, setSelectedDeliverers] = useState<Record<string, string>>({});
  const [dispatchingOrders, setDispatchingOrders] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const availableDeliverers = deliverers.filter(d => d.is_online);

  // Calculate ETA based on simple distance (3 min/km)
  const calculateETA = (delivererLat: number | null, delivererLng: number | null, destLat: number | null, destLng: number | null): number => {
    if (!delivererLat || !delivererLng || !destLat || !destLng) return 30; // Default 30 min
    
    const R = 6371; // km
    const dLat = (destLat - delivererLat) * Math.PI / 180;
    const dLng = (destLng - delivererLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(delivererLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.max(5, Math.round(distance * 3)); // 3 min/km, minimum 5 min
  };

  const handleDispatch = async (orderId: string) => {
    const delivererId = selectedDeliverers[orderId];
    if (!delivererId) {
      toast.error('Selecione um entregador');
      return;
    }

    const order = orders.find(o => o.id === orderId);
    const deliverer = deliverers.find(d => d.id === delivererId);

    setDispatchingOrders(prev => new Set(prev).add(orderId));

    try {
      // Calculate ETA
      const etaMinutes = calculateETA(
        deliverer?.last_latitude ?? null,
        deliverer?.last_longitude ?? null,
        null, // Will be filled from delivery_address_id lookup
        null
      );

      // Update order with deliverer and status
      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update({
          deliverer_id: delivererId,
          status: 'em_rota',
          dispatched_at: new Date().toISOString(),
          delivery_eta_minutes: etaMinutes,
        })
        .eq('id', orderId)
        .select('tracking_token, customer_phone, customer_name, order_number')
        .single();

      if (error) throw error;

      // Send WhatsApp notification if customer has phone
      if (updatedOrder?.tracking_token && updatedOrder?.customer_phone) {
        const trackingUrl = `${window.location.origin}/rastrear/${updatedOrder.tracking_token}`;
        const message = `🚚 Seu pedido #${updatedOrder.order_number} saiu para entrega!\n\n` +
          `Previsão: ~${etaMinutes} minutos\n\n` +
          `📍 Acompanhe em tempo real:\n${trackingUrl}`;
        
        // Try to send via WhatsApp integration
        try {
          await supabase.functions.invoke('send-whatsapp-direct', {
            body: {
              company_id: order?.company_id,
              phone: updatedOrder.customer_phone,
              message,
            },
          });
        } catch (whatsappError) {
          console.warn('WhatsApp notification failed:', whatsappError);
          // Don't fail the dispatch if WhatsApp fails
        }
      }

      toast.success('Pedido despachado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['pending-orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliverer-locations'] });
      
      if (onDispatch) {
        onDispatch(orderId, delivererId);
      }
    } catch (error) {
      console.error('Dispatch error:', error);
      toast.error('Erro ao despachar pedido');
    } finally {
      setDispatchingOrders(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Pedidos Aguardando Despacho
          </div>
          <Badge variant="secondary">{orders.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum pedido aguardando</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">
                        #{order.order_number}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(order.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {formatCurrency(order.total)}
                    </Badge>
                  </div>

                  <div className="space-y-1 mb-3">
                    {order.customer_name && (
                      <p className="text-sm flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        {order.customer_name}
                      </p>
                    )}
                    {(order.customer_address || order.destination_address) && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{order.destination_address || order.customer_address}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Select
                      value={selectedDeliverers[order.id] || ''}
                      onValueChange={(value) =>
                        setSelectedDeliverers(prev => ({ ...prev, [order.id]: value }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Selecionar entregador" />
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
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                {d.name}
                                {d.orders_count > 0 && (
                                  <span className="text-muted-foreground">
                                    ({d.orders_count})
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={
                        !selectedDeliverers[order.id] ||
                        dispatchingOrders.has(order.id)
                      }
                      onClick={() => handleDispatch(order.id)}
                    >
                      {dispatchingOrders.has(order.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          Despachar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
