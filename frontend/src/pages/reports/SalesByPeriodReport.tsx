import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { format, startOfDay, endOfDay, eachDayOfInterval, eachHourOfInterval, setHours, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  CalendarIcon, Search, Loader2, DollarSign, ShoppingBag, 
  Clock, TrendingUp, Filter
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ExportButton } from '@/components/export/ExportButton';
import { formatCurrencyExport, formatDateExport } from '@/utils/exportUtils';

/**
 * Relatório de Vendas por Período
 * 
 * Este relatório permite buscar vendas por data/horário específico,
 * INDEPENDENTE do caixa. Útil quando:
 * - O caixa não foi fechado ainda
 * - Quer ver vendas de um período específico
 * - Precisa comparar diferentes dias/horários
 */
export default function SalesByPeriodReport() {
  const { data: company } = useCompany();
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [searchTriggered, setSearchTriggered] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Fetch sales data by period
  const { data: salesData, isLoading, refetch } = useQuery({
    queryKey: ['sales-by-period', company?.id, startDate?.toISOString(), endDate?.toISOString(), searchTriggered],
    queryFn: async () => {
      if (!company?.id || !startDate || !endDate) return null;

      const start = startOfDay(startDate);
      const end = endOfDay(endDate);

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          status,
          payment_method,
          created_at,
          cancelled_at,
          delivery_fee,
          order_type,
          cash_session_id
        `)
        .eq('company_id', company.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const validOrders = orders?.filter(o => !o.cancelled_at) || [];
      const cancelledOrders = orders?.filter(o => o.cancelled_at) || [];

      // Agrupar por dia
      const byDay: Record<string, { date: string; orders: number; revenue: number; avgTicket: number }> = {};
      const days = eachDayOfInterval({ start, end });
      days.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        byDay[dayStr] = { date: dayStr, orders: 0, revenue: 0, avgTicket: 0 };
      });

      validOrders.forEach(order => {
        const dayStr = format(new Date(order.created_at), 'yyyy-MM-dd');
        if (byDay[dayStr]) {
          byDay[dayStr].orders += 1;
          byDay[dayStr].revenue += Number(order.total) || 0;
        }
      });

      // Calcular ticket médio
      Object.values(byDay).forEach(day => {
        day.avgTicket = day.orders > 0 ? day.revenue / day.orders : 0;
      });

      // Agrupar por hora
      const byHour: Record<string, { hour: string; orders: number; revenue: number }> = {};
      for (let h = 0; h < 24; h++) {
        const hourStr = `${h.toString().padStart(2, '0')}:00`;
        byHour[hourStr] = { hour: hourStr, orders: 0, revenue: 0 };
      }

      validOrders.forEach(order => {
        const hour = format(new Date(order.created_at), 'HH:00');
        if (byHour[hour]) {
          byHour[hour].orders += 1;
          byHour[hour].revenue += Number(order.total) || 0;
        }
      });

      // Agrupar por método de pagamento
      const byPayment: Record<string, { method: string; orders: number; revenue: number }> = {};
      validOrders.forEach(order => {
        const method = order.payment_method || 'Não informado';
        if (!byPayment[method]) {
          byPayment[method] = { method, orders: 0, revenue: 0 };
        }
        byPayment[method].orders += 1;
        byPayment[method].revenue += Number(order.total) || 0;
      });

      // Verificar caixas relacionados
      const sessionIds = [...new Set(validOrders.map(o => o.cash_session_id).filter(Boolean))];
      let relatedSessions: any[] = [];
      if (sessionIds.length > 0) {
        const { data: sessions } = await supabase
          .from('cash_sessions')
          .select('id, business_date, status, total_orders, total_revenue')
          .in('id', sessionIds);
        relatedSessions = sessions || [];
      }

      const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const totalOrders = validOrders.length;

      return {
        totalOrders,
        totalRevenue,
        avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        cancelledOrders: cancelledOrders.length,
        cancelledValue: cancelledOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
        deliveryFees: validOrders.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0),
        byDay: Object.values(byDay).map(d => ({
          ...d,
          dateFormatted: format(new Date(d.date + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
        })),
        byHour: Object.values(byHour),
        byPayment: Object.values(byPayment).sort((a, b) => b.revenue - a.revenue),
        relatedSessions,
      };
    },
    enabled: !!company?.id && searchTriggered,
  });

  const handleSearch = () => {
    if (startDate && endDate) {
      setSearchTriggered(true);
      refetch();
    }
  };

  return (
    <DashboardLayout title="Vendas por Período">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Vendas por Período
          </h1>
          <p className="text-muted-foreground">
            Busque vendas por data e horário específico, independente do caixa
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button onClick={handleSearch} disabled={!startDate || !endDate || isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Buscar
              </Button>

              {salesData && (
                <ExportButton
                  data={salesData.byDay.map(d => ({
                    data: d.dateFormatted,
                    pedidos: d.orders,
                    receita: d.revenue,
                    ticketMedio: d.avgTicket,
                  }))}
                  columns={[
                    { key: 'data', label: 'Data' },
                    { key: 'pedidos', label: 'Pedidos' },
                    { key: 'receita', label: 'Receita', format: formatCurrencyExport },
                    { key: 'ticketMedio', label: 'Ticket Médio', format: formatCurrencyExport },
                  ]}
                  filename="vendas-por-periodo"
                  title="Relatório de Vendas por Período"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {salesData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <ShoppingBag className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pedidos</p>
                      <p className="text-2xl font-bold">{salesData.totalOrders}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Receita</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(salesData.totalRevenue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ticket Médio</p>
                      <p className="text-2xl font-bold">{formatCurrency(salesData.avgTicket)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                      <ShoppingBag className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cancelados</p>
                      <p className="text-2xl font-bold text-red-600">{salesData.cancelledOrders}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Related Cash Sessions Info */}
            {salesData.relatedSessions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Caixas Relacionados</CardTitle>
                  <CardDescription>
                    Estes pedidos estão vinculados aos seguintes caixas por data de negócio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {salesData.relatedSessions.map((session: any) => (
                      <Badge 
                        key={session.id} 
                        variant={session.status === 'open' ? 'default' : 'secondary'}
                      >
                        {session.business_date} - {session.status === 'open' ? 'Aberto' : 'Fechado'}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Revenue by Day */}
              <Card>
                <CardHeader>
                  <CardTitle>Receita por Dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesData.byDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="dateFormatted" className="text-xs" />
                      <YAxis tickFormatter={(v) => `R$${v}`} className="text-xs" />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Receita']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Orders by Hour */}
              <Card>
                <CardHeader>
                  <CardTitle>Pedidos por Horário</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesData.byHour}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="hour" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        formatter={(value: number) => [value, 'Pedidos']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Payment Methods Table */}
            <Card>
              <CardHeader>
                <CardTitle>Por Método de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">% do Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.byPayment.map((payment) => (
                      <TableRow key={payment.method}>
                        <TableCell className="font-medium capitalize">{payment.method}</TableCell>
                        <TableCell className="text-right">{payment.orders}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(payment.revenue)}</TableCell>
                        <TableCell className="text-right">
                          {salesData.totalRevenue > 0 
                            ? ((payment.revenue / salesData.totalRevenue) * 100).toFixed(1) 
                            : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* Empty State */}
        {!salesData && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Selecione um período</p>
              <p className="text-sm">Escolha as datas inicial e final para buscar as vendas</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
