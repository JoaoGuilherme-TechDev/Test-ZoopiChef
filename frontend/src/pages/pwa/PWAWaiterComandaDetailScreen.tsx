/**
 * PWAWaiterComandaDetailScreen - Comanda detail view for Waiter PWA
 * 
 * Uses WaiterPWALayout for session management (no need for individual WaiterSessionProvider).
 * Route: /:slug/garcom/comanda/:comandaId
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWaiterLayoutSession } from '@/layouts/WaiterPWALayout';
import { supabase } from '@/lib/supabase-shim';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  Tag,
  Receipt,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

type ComandaStatus = 'free' | 'open' | 'no_activity' | 'requested_bill' | 'closed';

const statusConfig: Record<ComandaStatus, { label: string; color: string }> = {
  free: { label: 'Livre', color: 'text-emerald-600' },
  open: { label: 'Aberta', color: 'text-primary' },
  no_activity: { label: 'Sem Consumo', color: 'text-muted-foreground' },
  requested_bill: { label: 'Pediu Conta', color: 'text-secondary-foreground' },
  closed: { label: 'Fechada', color: 'text-muted-foreground' },
};

export default function PWAWaiterComandaDetailScreen() {
  const { slug, comandaId } = useParams<{ slug: string; comandaId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Use layout session - already validated
  const { companyId, refresh } = useWaiterLayoutSession();
  
  // Get comanda details
  const { data: comanda, isLoading: comandaLoading } = useQuery<any>({
    queryKey: ['pwa-waiter-comanda-detail', comandaId, companyId],
    queryFn: async () => {
      if (!comandaId || !companyId) return null;
      const client = supabase as any;
      const result = await client
        .from('comandas')
        .select('*')
        .eq('id', comandaId)
        .eq('company_id', companyId)
        .single();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!comandaId && !!companyId,
  });

  // Get orders for this comanda
  const { data: orders = [], isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ['pwa-waiter-comanda-orders', comandaId],
    queryFn: async () => {
      if (!comandaId) return [];
      const client = supabase as any;
      
      const result = await client
        .from('orders')
        .select('id, order_number, status, total, created_at')
        .eq('comanda_id', comandaId)
        .order('created_at', { ascending: false });
      
      if (result.error) throw result.error;
      const data = result.data || [];
      if (data.length === 0) return [];
      
      const orderIds = data.map((o: any) => o.id);
      const itemsResult = await client
        .from('order_items')
        .select('id, order_id, product_name, quantity, unit_price')
        .in('order_id', orderIds);
      
      const items = itemsResult.data || [];
      return data.map((order: any) => ({
        ...order,
        order_items: items.filter((i: any) => i.order_id === order.id)
      }));
    },
    enabled: !!comandaId,
  });

  // Request bill mutation
  const requestBill = useMutation({
    mutationFn: async () => {
      if (!comandaId) throw new Error('Comanda não encontrada');
      const client = supabase as any;
      const result = await client
        .from('comandas')
        .update({ status: 'requested_bill' })
        .eq('id', comandaId);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-comanda-detail'] });
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-comandas'] });
      toast.success('Conta solicitada!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao solicitar conta');
    },
  });

  // Close comanda mutation
  const closeComanda = useMutation({
    mutationFn: async () => {
      if (!comandaId) throw new Error('Comanda não encontrada');
      const client = supabase as any;
      const result = await client
        .from('comandas')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', comandaId);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-comanda-detail'] });
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-comandas'] });
      toast.success('Comanda fechada!');
      navigate(`/${slug}/garcom/comandas`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao fechar comanda');
    },
  });

  const isLoading = comandaLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando comanda...</p>
        </div>
      </div>
    );
  }

  if (!comanda) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-warning mb-4" />
          <h2 className="text-xl font-bold mb-2">Comanda não encontrada</h2>
          <p className="text-muted-foreground mb-4">
            Esta comanda não existe ou não está disponível.
          </p>
          <Button onClick={() => navigate(`/${slug}/garcom/comandas`)}>
            Voltar às Comandas
          </Button>
        </Card>
      </div>
    );
  }

  const status = (comanda.status || 'open') as ComandaStatus;
  const statusInfo = statusConfig[status] || statusConfig.open;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const isClosed = status === 'closed';
  const billRequested = status === 'requested_bill';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/${slug}/garcom/comandas`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Comanda #{comanda.command_number}
            </h1>
            {comanda.name && <p className="text-sm text-muted-foreground">{comanda.name}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={() => refresh()}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Comanda Info */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Informações</CardTitle>
              <Badge variant="outline" className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Aberta {formatDistanceToNow(new Date(comanda.opened_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-bold">
                {formatCurrency(comanda.total_amount || 0)}
              </span>
            </div>

            {comanda.apply_service_fee && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taxa de serviço ({comanda.service_fee_percent}%)</span>
                <span>
                  {formatCurrency((comanda.total_amount || 0) * (comanda.service_fee_percent / 100))}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders */}
        {orders.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Pedidos ({orders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {orders.map((order: any) => (
                    <div key={order.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">#{order.order_number}</span>
                        <Badge variant="outline" className="text-xs">
                          {order.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between">
                            <span>{item.quantity}x {item.product_name}</span>
                            <span>{formatCurrency(item.unit_price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-medium">
                        <span>Total</span>
                        <span>{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Empty orders */}
        {orders.length === 0 && !ordersLoading && (
          <Card className="p-6 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum pedido ainda</p>
          </Card>
        )}
      </div>

      {/* Fixed Bottom Actions */}
      {!isClosed && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-12"
              onClick={() => requestBill.mutate()}
              disabled={requestBill.isPending || billRequested}
            >
              <Receipt className="h-5 w-5 mr-2" />
              {billRequested ? 'Conta Pedida' : 'Pedir Conta'}
            </Button>
            <Button
              variant="default"
              className="h-12"
              onClick={() => closeComanda.mutate()}
              disabled={closeComanda.isPending}
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Fechar Comanda
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
