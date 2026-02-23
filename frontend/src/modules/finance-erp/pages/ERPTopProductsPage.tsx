import { useERPFilters, useERPTopProducts } from '../hooks';
import { ERPFiltersBar, ERPDataTable } from '../components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ExportDropdown } from '@/components/export/ExportDropdown';
import { SkeletonTable, SkeletonChart } from '@/components/ui/skeleton-table';
import { EmptyData } from '@/components/ui/empty-state';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
} from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function ERPTopProductsPage() {
  const { filters, setDateRange } = useERPFilters();
  const { data, isLoading } = useERPTopProducts(filters);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Chart data - top 10
  const top10 = (data || []).slice(0, 10);
  
  const barChartData = top10.map((p, idx) => ({
    name: p.product_name.length > 12 ? p.product_name.slice(0, 12) + '...' : p.product_name,
    receita: p.total_revenue,
    quantidade: p.quantity_sold,
    rank: idx + 1,
  }));

  const treemapData = top10.map(p => ({
    name: p.product_name.length > 15 ? p.product_name.slice(0, 15) + '...' : p.product_name,
    size: p.total_revenue,
    fullName: p.product_name,
  }));

  // Export configuration
  const exportData = (data || []).map((p, idx) => ({
    rank: idx + 1,
    produto: p.product_name,
    quantidade: p.quantity_sold,
    receita: p.total_revenue,
    preco_medio: p.avg_price,
  }));

  const exportColumns = [
    { key: 'rank', label: '#' },
    { key: 'produto', label: 'Produto' },
    { key: 'quantidade', label: 'Qtd Vendida' },
    { key: 'receita', label: 'Receita', format: (v: number) => formatCurrency(v) },
    { key: 'preco_medio', label: 'Preço Médio', format: (v: number) => formatCurrency(v) },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Produtos Mais Vendidos">
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid gap-4 md:grid-cols-2">
            <SkeletonChart height={300} />
            <SkeletonChart height={300} />
          </div>
          <SkeletonTable rows={10} columns={5} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Produtos Mais Vendidos">
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
            filename="top-produtos"
            title="Ranking de Produtos"
            disabled={(data || []).length === 0}
          />
        </div>

        {/* Charts */}
        {top10.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Ranking por Receita (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip 
                      formatter={(v: number, name) => [
                        name === 'receita' ? formatCurrency(v) : v, 
                        name === 'receita' ? 'Receita' : 'Quantidade'
                      ]} 
                    />
                    <Legend />
                    <Bar dataKey="receita" name="Receita" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Distribuição por Receita</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={treemapData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="size"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {treemapData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Ranking de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            {(data || []).length === 0 ? (
              <EmptyData entity="produtos" type="table" />
            ) : (
              <ERPDataTable
                columns={[
                  { key: 'rank', header: '#', align: 'center' },
                  { key: 'product_name', header: 'Produto' },
                  { key: 'quantity_sold', header: 'Qtd Vendida', align: 'right' },
                  {
                    key: 'total_revenue',
                    header: 'Receita',
                    align: 'right',
                    render: (item) => formatCurrency((item as { total_revenue: number }).total_revenue),
                  },
                  {
                    key: 'avg_price',
                    header: 'Preço Médio',
                    align: 'right',
                    render: (item) => formatCurrency((item as { avg_price: number }).avg_price),
                  },
                ]}
                data={data?.map((item, idx) => ({ ...item, rank: idx + 1, id: `prod-${idx}` })) || []}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
