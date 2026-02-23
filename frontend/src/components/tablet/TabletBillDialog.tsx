import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Receipt, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateServiceCall } from '@/hooks/useTableServiceCalls';

interface TabletBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  tableNumber: number;
  deviceId: string;
  primaryColor?: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  item_status: string;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  items: OrderItem[];
}

interface SessionData {
  id: string;
  opened_at: string;
  people_count: number | null;
}

// Helper to bypass deep type issues
const sb = supabase as any;

async function fetchSessionData(companyId: string, tableNumber: number): Promise<SessionData | null> {
  const { data: table } = await sb
    .from('tables')
    .select('id')
    .eq('company_id', companyId)
    .eq('number', tableNumber)
    .single();

  if (!table) return null;

  const { data: session } = await sb
    .from('table_sessions')
    .select('id, opened_at, people_count')
    .eq('table_id', table.id)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return null;
  return {
    id: session.id,
    opened_at: session.opened_at,
    people_count: session.people_count,
  };
}

async function fetchOrdersWithItems(sessionId: string): Promise<Order[]> {
  const { data: orderData } = await sb
    .from('orders')
    .select('id, created_at, status')
    .eq('table_session_id', sessionId)
    .order('created_at', { ascending: true });

  if (!orderData || orderData.length === 0) return [];

  const orderIds = orderData.map((o: any) => o.id);
  
  const { data: itemsData } = await sb
    .from('order_items')
    .select('id, order_id, product_name, quantity, unit_price, item_status')
    .in('order_id', orderIds);

  const itemsByOrder: Record<string, OrderItem[]> = {};
  (itemsData || []).forEach((item: any) => {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push({
      id: item.id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_status: item.item_status,
    });
  });

  return orderData.map((o: any) => ({
    id: o.id,
    created_at: o.created_at,
    status: o.status,
    items: itemsByOrder[o.id] || [],
  }));
}

export function TabletBillDialog({
  open,
  onOpenChange,
  companyId,
  tableNumber,
  deviceId,
  primaryColor = '#000000',
}: TabletBillDialogProps) {
  const [isClosingBill, setIsClosingBill] = useState(false);
  const createServiceCall = useCreateServiceCall();

  const { data: tableSession } = useQuery({
    queryKey: ['tablet-table-session', companyId, tableNumber],
    queryFn: () => fetchSessionData(companyId, tableNumber),
    enabled: open && !!companyId && !!tableNumber,
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['tablet-session-orders', tableSession?.id],
    queryFn: () => fetchOrdersWithItems(tableSession!.id),
    enabled: open && !!tableSession?.id,
    refetchInterval: open ? 10000 : false,
  });

  const allItems = orders.flatMap((o) => o.items);
  const totalValue = allItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const handleCloseBill = async () => {
    setIsClosingBill(true);
    try {
      await createServiceCall.mutateAsync({
        table_number: String(tableNumber),
        call_type: 'bill',
        tablet_device_id: deviceId,
      });
      toast.success('Conta solicitada! O garçom virá em breve.');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao solicitar conta');
    } finally {
      setIsClosingBill(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'entregue':
        return 'Entregue';
      case 'pronto':
        return 'Pronto';
      case 'preparo':
        return 'Em preparo';
      case 'novo':
        return 'Novo';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" style={{ color: primaryColor }} />
            Sua Conta - Mesa {tableNumber}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : !tableSession ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4" />
            <p>Nenhuma sessão ativa</p>
          </div>
        ) : allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Receipt className="h-12 w-12 mb-4" />
            <p>Nenhum consumo registrado</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="space-y-4 p-1">
              {orders.map((order) => (
                <div key={order.id} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {new Date(order.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground">{item.quantity}x</span>
                        <span>{item.product_name}</span>
                      </div>
                      <span className="font-medium">
                        R$ {(item.quantity * item.unit_price).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  ))}
                  <Separator />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {allItems.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span style={{ color: primaryColor }}>
                R$ {totalValue.toFixed(2).replace('.', ',')}
              </span>
            </div>
            {tableSession?.people_count && tableSession.people_count > 1 && (
              <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                <span>Por pessoa ({tableSession.people_count} pessoas)</span>
                <span>
                  R$ {(totalValue / tableSession.people_count).toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            onClick={handleCloseBill}
            disabled={isClosingBill || allItems.length === 0}
            style={{ backgroundColor: primaryColor }}
            className="text-white"
          >
            {isClosingBill ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Receipt className="h-4 w-4 mr-2" />
            )}
            Pedir Conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
