import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CalendarIcon, Calendar as CalendarIcon2, Loader2, Package, ClipboardList, Printer } from 'lucide-react';

interface ScheduledOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_cents?: number;
}

interface ScheduledOrder {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  total_cents: number;
  notes: string | null;
  items: ScheduledOrderItem[];
  customer_name: string | null;
}

interface ProductSummary {
  productId: string;
  productName: string;
  totalQuantity: number;
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export default function ProductionTab() {
  const { company } = useCompanyContext();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Fetch scheduled orders for the selected date
  const { data: orders, isLoading } = useQuery({
    queryKey: ['scheduled-production', company?.id, selectedDate?.toISOString().split('T')[0]],
    enabled: !!company?.id && !!selectedDate,
    queryFn: async () => {
      if (!company?.id || !selectedDate) return [];

      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const { data: ordersData, error: ordersError } = await supabase
        .from('scheduled_orders')
        .select('id, scheduled_date, scheduled_time, status, total_cents, notes, items, customer_name')
        .eq('company_id', company.id)
        .eq('scheduled_date', dateStr)
        .in('status', ['confirmed', 'pending'])
        .order('scheduled_time');

      if (ordersError) {
        console.error('Error fetching scheduled orders:', ordersError);
        return [];
      }

      return (ordersData || []).map(order => {
        let parsedItems: ScheduledOrderItem[] = [];
        try {
          if (Array.isArray(order.items)) {
            parsedItems = (order.items as unknown[]).map((item: unknown) => {
              const i = item as Record<string, unknown>;
              return {
                product_id: String(i.product_id || ''),
                product_name: String(i.product_name || 'Produto'),
                quantity: Number(i.quantity) || 1,
                unit_price_cents: Number(i.unit_price_cents) || 0,
              };
            });
          }
        } catch (e) {
          console.warn('Error parsing order items:', e);
        }
        
        return {
          ...order,
          items: parsedItems,
        } as ScheduledOrder;
      });
    },
  });

  // Calculate product summary
  const productSummary = useMemo(() => {
    if (!orders?.length) return [];

    const summary = new Map<string, ProductSummary>();

    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = item.product_id || item.product_name;
        const existing = summary.get(key);
        if (existing) {
          existing.totalQuantity += item.quantity || 1;
        } else {
          summary.set(key, {
            productId: item.product_id || key,
            productName: item.product_name || 'Produto',
            totalQuantity: item.quantity || 1,
          });
        }
      });
    });

    return Array.from(summary.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [orders]);

  const totalOrders = orders?.length || 0;
  const totalItems = productSummary.reduce((sum, p) => sum + p.totalQuantity, 0);
  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
          <Package className="w-7 h-7 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold">Produção do Dia</h1>
          <p className="text-muted-foreground">
            Planejamento de produção para pedidos agendados
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint} className="print:hidden">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      {/* Date Selector */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon2 className="w-5 h-5" />
            Selecione a Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[280px] justify-start text-left font-normal',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                    <p className="text-2xl font-bold">{totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Itens a Produzir</p>
                    <p className="text-2xl font-bold">{totalItems}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-success">R$</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Receita Esperada</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Produtos a Produzir
              </CardTitle>
              <CardDescription>
                Resumo consolidado de todos os produtos dos pedidos agendados para{' '}
                {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productSummary.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum pedido agendado para esta data
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Quantidade Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSummary.map((product) => (
                      <TableRow key={product.productId}>
                        <TableCell className="font-medium">{product.productName}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="text-lg px-3 py-1">
                            {product.totalQuantity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Order Details */}
          {orders && orders.length > 0 && (
            <Card className="print:break-before-page">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Detalhes dos Pedidos
                </CardTitle>
                <CardDescription>
                  Lista completa de pedidos agendados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.map((order, index) => (
                    <div key={order.id}>
                      {index > 0 && <Separator className="my-4" />}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={order.status === 'confirmed' ? 'default' : 'secondary'}>
                              {order.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {order.scheduled_time?.slice(0, 5) || '--:--'}
                            </span>
                            {order.customer_name && (
                              <span className="text-sm font-medium">
                                • {order.customer_name}
                              </span>
                            )}
                          </div>
                          <span className="font-medium">
                            {formatCurrency(order.total_cents || 0)}
                          </span>
                        </div>
                        {order.notes && (
                          <p className="text-sm text-muted-foreground italic">{order.notes}</p>
                        )}
                        <ul className="text-sm space-y-1 pl-4">
                          {(order.items || []).map((item, idx) => (
                            <li key={idx}>
                              • {item.quantity || 1}x {item.product_name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .container, .container * {
            visibility: visible;
          }
          .container {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
