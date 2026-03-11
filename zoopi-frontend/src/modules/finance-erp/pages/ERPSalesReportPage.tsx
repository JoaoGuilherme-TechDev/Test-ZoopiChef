import { useERPFilters, useERPSalesReport } from '../hooks';
import { ERPFiltersBar, ERPStatsCard, ERPDataTable } from '../components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { ExportDropdown } from '@/components/export/ExportDropdown';
import { SkeletonKPIGrid, SkeletonTable, SkeletonChart } from '@/components/ui/skeleton-table';
import { EmptyData } from '@/components/ui/empty-state';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function ERPSalesReportPage() {
  const { filters, setDateRange } = useERPFilters();
  const { salesByPeriod, salesByOperator, salesByPaymentMethod, totals, isLoading } = useERPSalesReport(filters);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Chart data
  const lineChartData = salesByPeriod.map(s => ({
    date: s.date,
    receita: s.total_revenue,
    pedidos: s.total_orders,
    ticket: s.avg_ticket,
  }));

  const pieChartData = salesByPaymentMethod.map(s => ({
    name: s.payment_method || 'Não informado',
    value: s.total_revenue,
  }));

  // Export configuration
  const exportData = salesByPeriod.map(s => ({
    data: s.date,
    pedidos: s.total_orders,
    receita: s.total_revenue,
    ticket_medio: s.avg_ticket,
  }));

  const exportColumns = [
    { key: 'data', label: 'Data' },
    { key: 'pedidos', label: 'Pedidos' },
    { key: 'receita', label: 'Receita', format: (v: number) => formatCurrency(v) },
    { key: 'ticket_medio', label: 'Ticket Médio', format: (v: number) => formatCurrency(v) },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Relatório de Vendas">
        <div className="space-y-6 animate-in fade-in duration-500">
          <SkeletonKPIGrid count={4} />
          <div className="grid gap-4 md:grid-cols-2">
            <SkeletonChart height={250} />
            <SkeletonChart height={250} />
          </div>
          <SkeletonTable rows={6} columns={4} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Relatório de Vendas">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <ERPFiltersBar
            startDate={filters.startDate}
            endDate={filters.endDate}
            onStartDateChange={(date) => setDateRange(date, filters.endDate)}
            onEndDateChange={(date) => setDateRange(filters.startDate, date)}
          />
          <ExportDropdown
            data={exportData}
            columns={exportColumns}
            filename="vendas-relatorio"
            title="Relatório de Vendas"
            disabled={salesByPeriod.length === 0}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ERPStatsCard
            title="Receita Total"
            value={formatCurrency(totals?.total_revenue || 0)}
            icon={DollarSign}
          />
          <ERPStatsCard
            title="Total de Pedidos"
            value={totals?.total_orders || 0}
            icon={ShoppingCart}
          />
          <ERPStatsCard
            title="Ticket Médio"
            value={formatCurrency(totals?.avg_ticket || 0)}
            icon={TrendingUp}
          />
          <ERPStatsCard
            title="Cortesias"
            value={totals?.cortesias_count || 0}
            icon={Users}
          />
        </div>

        {/* Charts */}
        {salesByPeriod.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Evolução das Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number, name) => [formatCurrency(v), name === 'receita' ? 'Receita' : 'Ticket Médio']} />
                    <Legend />
                    <Line type="monotone" dataKey="receita" name="Receita" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ticket" name="Ticket Médio" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Vendas por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              {salesByPeriod.length === 0 ? (
                <EmptyData entity="vendas" type="table" />
              ) : (
                <ERPDataTable
                  columns={[
                    { key: 'date', header: 'Data' },
                    { key: 'total_orders', header: 'Pedidos', align: 'right' },
                    {
                      key: 'total_revenue',
                      header: 'Receita',
                      align: 'right',
                      render: (item) => formatCurrency((item as { total_revenue: number }).total_revenue),
                    },
                    {
                      key: 'avg_ticket',
                      header: 'Ticket Médio',
                      align: 'right',
                      render: (item) => formatCurrency((item as { avg_ticket: number }).avg_ticket),
                    },
                  ]}
                  data={salesByPeriod.map((s, idx) => ({ ...s, id: `period-${idx}` }))}
                  isLoading={isLoading}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vendas por Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {salesByPaymentMethod.length === 0 ? (
                <EmptyData entity="pagamentos" type="table" />
              ) : (
                <ERPDataTable
                  columns={[
                    { key: 'payment_method', header: 'Método' },
                    { key: 'total_orders', header: 'Qtd', align: 'right' },
                    {
                      key: 'total_revenue',
                      header: 'Total',
                      align: 'right',
                      render: (item) => formatCurrency((item as { total_revenue: number }).total_revenue),
                    },
                  ]}
                  data={salesByPaymentMethod.map((s, idx) => ({ ...s, id: `payment-${idx}` }))}
                  isLoading={isLoading}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vendas por Operador</CardTitle>
          </CardHeader>
          <CardContent>
            {salesByOperator.length === 0 ? (
              <EmptyData entity="operadores" type="table" />
            ) : (
              <ERPDataTable
                columns={[
                  { key: 'operator_name', header: 'Operador' },
                  { key: 'total_orders', header: 'Pedidos', align: 'right' },
                  {
                    key: 'total_revenue',
                    header: 'Receita',
                    align: 'right',
                    render: (item) => formatCurrency((item as { total_revenue: number }).total_revenue),
                  },
                  {
                    key: 'avg_ticket',
                    header: 'Ticket Médio',
                    align: 'right',
                    render: (item) => formatCurrency((item as { avg_ticket: number }).avg_ticket),
                  },
                ]}
                data={salesByOperator.map((s, idx) => ({ ...s, id: `op-${idx}` }))}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
