/**
 * PWAWaiterTableDetailScreen - Table detail view for Waiter PWA
 * 
 * Uses WaiterPWALayout for session management (no need for individual WaiterSessionProvider).
 * Route: /:slug/garcom/mesa/:tableId
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWaiterLayoutSession } from '@/layouts/WaiterPWALayout';
import { usePWAWaiterTableSessionsWithCompany } from '@/hooks/usePWAWaiterHooks';
import { supabase } from '@/lib/supabase-shim';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  Users,
  Receipt,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function PWAWaiterTableDetailScreen() {
  const { slug, tableId } = useParams<{ slug: string; tableId: string }>();
  const navigate = useNavigate();
  
  // Use layout session - already validated
  const { companyId, refresh } = useWaiterLayoutSession();
  const { sessions, requestBill, updateSessionStatus } = usePWAWaiterTableSessionsWithCompany(companyId);
  
  // Get table details
  const { data: table, isLoading: tableLoading } = useQuery<any>({
    queryKey: ['pwa-waiter-table-detail', tableId, companyId],
    queryFn: async () => {
      if (!tableId || !companyId) return null;
      const client = supabase as any;
      const result = await client
        .from('tables')
        .select('*')
        .eq('id', tableId)
        .eq('company_id', companyId)
        .single();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!tableId && !!companyId,
  });

  // Get orders for this table session
  const session = sessions.find(s => s.table_id === tableId);
  
  const { data: orders = [], isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ['pwa-waiter-table-orders', session?.id],
    queryFn: async () => {
      if (!session?.id) return [];
      const client = supabase as any;
      
      const result = await client
        .from('orders')
        .select('id, order_number, status, total, created_at')
        .eq('table_session_id', session.id)
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
    enabled: !!session?.id,
  });

  const isLoading = tableLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando mesa...</p>
        </div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-warning mb-4" />
          <h2 className="text-xl font-bold mb-2">Mesa não encontrada</h2>
          <p className="text-muted-foreground mb-4">
            Esta mesa não existe ou não está disponível.
          </p>
          <Button onClick={() => navigate(`/${slug}/garcom/mesas`)}>
            Voltar às Mesas
          </Button>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100);
  };

  const handleRequestBill = async () => {
    if (!session) return;
    try {
      await requestBill.mutateAsync(session.id);
      toast.success('Conta solicitada!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao solicitar conta');
    }
  };

  const handleCloseTable = async () => {
    if (!session) return;
    try {
      await updateSessionStatus.mutateAsync({ sessionId: session.id, status: 'closed' });
      toast.success('Mesa fechada!');
      navigate(`/${slug}/garcom/mesas`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fechar mesa');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/${slug}/garcom/mesas`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Mesa {table.number}</h1>
            {table.name && <p className="text-sm text-muted-foreground">{table.name}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={() => refresh()}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Session Info */}
        {session ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Sessão Ativa</CardTitle>
                <Badge variant={session.status === 'bill_requested' ? 'secondary' : 'default'}>
                  {session.status === 'bill_requested' ? 'Conta Pedida' : 'Aberta'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatDistanceToNow(new Date(session.opened_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                {session.people_count && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{session.people_count} pessoas</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-muted-foreground">Total</span>
                <span className="text-xl font-bold">
                  {formatCurrency(session.total_amount_cents)}
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">Mesa livre</p>
          </Card>
        )}

        {/* Orders */}
        {session && orders.length > 0 && (
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
        {session && orders.length === 0 && !ordersLoading && (
          <Card className="p-6 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum pedido ainda</p>
          </Card>
        )}
      </div>

      {/* Fixed Bottom Actions */}
      {session && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-12"
              onClick={handleRequestBill}
              disabled={requestBill.isPending || session.status === 'bill_requested'}
            >
              <Receipt className="h-5 w-5 mr-2" />
              {session.status === 'bill_requested' ? 'Conta Pedida' : 'Pedir Conta'}
            </Button>
            <Button
              variant="default"
              className="h-12"
              onClick={handleCloseTable}
              disabled={updateSessionStatus.isPending}
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Fechar Mesa
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
