import { useERPFilters, useERPDRE } from '../hooks';
import { ERPFiltersBar, ERPStatsCard } from '../components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { ExportDropdown } from '@/components/export/ExportDropdown';
import { SkeletonKPIGrid, SkeletonChart } from '@/components/ui/skeleton-table';
import {
  BarChart,
  Bar,
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

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export function ERPDREPage() {
  const { filters, setDateRange } = useERPFilters();
  const { data, isLoading } = useERPDRE(filters);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  // Data for charts
  const barChartData = [
    { name: 'Receita Bruta', value: data?.receita_bruta || 0, fill: 'hsl(var(--chart-2))' },
    { name: 'Descontos', value: data?.descontos || 0, fill: 'hsl(var(--chart-1))' },
    { name: 'CMV', value: data?.cmv || 0, fill: 'hsl(var(--chart-4))' },
    { name: 'Despesas Op.', value: data?.despesas_operacionais || 0, fill: 'hsl(var(--chart-3))' },
  ];

  const pieChartData = [
    { name: 'Lucro', value: Math.max(0, data?.resultado_final || 0) },
    { name: 'Custos', value: (data?.cmv || 0) + (data?.despesas_operacionais || 0) },
    { name: 'Descontos', value: data?.descontos || 0 },
  ].filter(d => d.value > 0);

  // Export configuration
  const exportData = data ? [
    { item: 'Receita Bruta', valor: data.receita_bruta },
    { item: 'Descontos', valor: data.descontos },
    { item: 'Taxas Delivery', valor: data.taxas_delivery },
    { item: 'Receita Líquida', valor: data.receita_liquida },
    { item: 'CMV', valor: data.cmv },
    { item: 'Lucro Bruto', valor: data.lucro_bruto },
    { item: 'Margem Bruta %', valor: data.margem_bruta_percent },
    { item: 'Despesas Operacionais', valor: data.despesas_operacionais },
    { item: 'Resultado Final', valor: data.resultado_final },
    { item: 'Margem Líquida %', valor: data.margem_liquida_percent },
  ] : [];

  const exportColumns = [
    { key: 'item', label: 'Item' },
    { key: 'valor', label: 'Valor', format: (v: number) => formatCurrency(v) },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="DRE">
        <div className="space-y-6 animate-in fade-in duration-500">
          <SkeletonKPIGrid count={4} />
          <SkeletonChart height={300} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="DRE - Demonstrativo de Resultados">
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
            filename="dre-relatorio"
            title={`DRE - ${data?.period || 'Período'}`}
            disabled={!data}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Período: {data?.period}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <ERPStatsCard
                title="Receita Bruta"
                value={formatCurrency(data?.receita_bruta || 0)}
                icon={DollarSign}
              />
              <ERPStatsCard
                title="(-) Descontos"
                value={formatCurrency(data?.descontos || 0)}
                icon={TrendingDown}
              />
              <ERPStatsCard
                title="(+) Taxas Delivery"
                value={formatCurrency(data?.taxas_delivery || 0)}
                icon={TrendingUp}
              />
              <ERPStatsCard
                title="= Receita Líquida"
                value={formatCurrency(data?.receita_liquida || 0)}
                icon={DollarSign}
                className="bg-primary/5"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <ERPStatsCard
                title="(-) CMV"
                value={formatCurrency(data?.cmv || 0)}
                subtitle="Custo de Mercadorias Vendidas"
                icon={TrendingDown}
              />
              <ERPStatsCard
                title="= Lucro Bruto"
                value={formatCurrency(data?.lucro_bruto || 0)}
                icon={DollarSign}
                className="bg-green-500/10"
              />
              <ERPStatsCard
                title="Margem Bruta"
                value={formatPercent(data?.margem_bruta_percent || 0)}
                icon={Percent}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <ERPStatsCard
                title="(-) Despesas Operacionais"
                value={formatCurrency(data?.despesas_operacionais || 0)}
                icon={TrendingDown}
              />
              <ERPStatsCard
                title="= Resultado Final"
                value={formatCurrency(data?.resultado_final || 0)}
                icon={DollarSign}
                className={(data?.resultado_final || 0) >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}
              />
              <ERPStatsCard
                title="Margem Líquida"
                value={formatPercent(data?.margem_liquida_percent || 0)}
                icon={Percent}
              />
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Receitas vs Custos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Composição do Resultado</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
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
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
