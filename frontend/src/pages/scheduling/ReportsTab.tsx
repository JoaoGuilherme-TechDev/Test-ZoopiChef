import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns';
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
import { cn } from '@/lib/utils';
import { CalendarIcon, BarChart3, Loader2, TrendingUp, CalendarDays, Package, DollarSign } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface ScheduledOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

interface ScheduledOrder {
  id: string;
  scheduled_date: string;
  status: string;
  total_cents: number;
  items: ScheduledOrderItem[];
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export default function ReportsTab() {
  const { company } = useCompanyContext();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Fetch scheduled orders for the date range
  const { data: orders, isLoading } = useQuery({
    queryKey: ['scheduled-reports', company?.id, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    enabled: !!company?.id && !!dateRange?.from && !!dateRange?.to,
    queryFn: async () => {
      if (!company?.id || !dateRange?.from || !dateRange?.to) return [];

      const fromStr = format(dateRange.from, 'yyyy-MM-dd');
      const toStr = format(dateRange.to, 'yyyy-MM-dd');

      const { data: ordersData, error } = await supabase
        .from('scheduled_orders')
        .select('id, scheduled_date, status, total_cents, items')
        .eq('company_id', company.id)
        .gte('scheduled_date', fromStr)
        .lte('scheduled_date', toStr)
        .order('scheduled_date');

      if (error) {
        console.error('Error fetching scheduled orders:', error);
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

  // Calculate statistics
  const stats = useMemo(() => {
    if (!orders?.length) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        totalItems: 0,
        avgOrderValue: 0,
        statusBreakdown: { pending: 0, confirmed: 0, preparing: 0, completed: 0, cancelled: 0 },
        dailyBreakdown: [] as { date: string; orders: number; revenue: number }[],
      };
    }

    const statusBreakdown: Record<string, number> = { pending: 0, confirmed: 0, preparing: 0, completed: 0, cancelled: 0 };
    let totalRevenue = 0;
    let totalItems = 0;

    const dailyMap = new Map<string, { orders: number; revenue: number }>();

    orders.forEach(order => {
      statusBreakdown[order.status] = (statusBreakdown[order.status] || 0) + 1;
      totalRevenue += order.total_cents || 0;
      totalItems += (order.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);

      const dateKey = order.scheduled_date;
      const existing = dailyMap.get(dateKey);
      if (existing) {
        existing.orders += 1;
        existing.revenue += order.total_cents || 0;
      } else {
        dailyMap.set(dateKey, { orders: 1, revenue: order.total_cents || 0 });
      }
    });

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalOrders: orders.length,
      totalRevenue,
      totalItems,
      avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      statusBreakdown,
      dailyBreakdown,
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
          <BarChart3 className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise de pedidos agendados por período
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Período de Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[320px] justify-start text-left font-normal',
                  !dateRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                      {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  <span>Selecione um período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ptBR}
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
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                    <p className="text-2xl font-bold">{stats.totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Receita Total</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
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
                    <p className="text-sm text-muted-foreground">Total de Itens</p>
                    <p className="text-2xl font-bold">{stats.totalItems}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
              <CardDescription>
                Pedidos agendados por status no período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Pendente</Badge>
                  <span className="font-bold">{stats.statusBreakdown.pending}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Confirmado</Badge>
                  <span className="font-bold">{stats.statusBreakdown.confirmed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Preparando</Badge>
                  <span className="font-bold">{stats.statusBreakdown.preparing}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-success">Concluído</Badge>
                  <span className="font-bold">{stats.statusBreakdown.completed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Cancelado</Badge>
                  <span className="font-bold">{stats.statusBreakdown.cancelled}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo Diário</CardTitle>
              <CardDescription>
                Pedidos e receita por dia no período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.dailyBreakdown.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum pedido agendado no período selecionado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.dailyBreakdown.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">
                          {format(new Date(day.date + 'T12:00:00'), "EEEE, dd/MM", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{day.orders}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(day.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
