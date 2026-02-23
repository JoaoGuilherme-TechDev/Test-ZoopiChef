import { useERPFilters, useERPCMV } from '../hooks';
import { ERPFiltersBar, ERPStatsCard, ERPDataTable } from '../components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Package, TrendingDown, Percent, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ExportDropdown } from '@/components/export/ExportDropdown';
import { SkeletonKPIGrid, SkeletonTable, SkeletonChart } from '@/components/ui/skeleton-table';
import { EmptyData } from '@/components/ui/empty-state';
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

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function ERPCMVPage() {
  const { filters, setDateRange } = useERPFilters();
  const { cmvData, productMargins, isLoading } = useERPCMV(filters);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  const itemsWithoutCost = productMargins.filter(p => !p.has_cost).length;

  // Chart data - top 5 by cost
  const topByCost = [...productMargins]
    .sort((a, b) => (b.unit_cost * b.quantity_sold) - (a.unit_cost * a.quantity_sold))
    .slice(0, 5);

  const barChartData = topByCost.map(p => ({
    name: p.product_name.length > 15 ? p.product_name.slice(0, 15) + '...' : p.product_name,
    custo: p.unit_cost * p.quantity_sold,
    margem: p.margin_percent,
  }));

  const pieChartData = topByCost.map(p => ({
    name: p.product_name.length > 12 ? p.product_name.slice(0, 12) + '...' : p.product_name,
    value: p.unit_cost * p.quantity_sold,
  }));

  // Export configuration
  const exportData = productMargins.map(p => ({
    produto: p.product_name,
    qtd_vendida: p.quantity_sold,
    custo_unitario: p.unit_cost,
    custo_total: p.unit_cost * p.quantity_sold,
    preco_medio: p.avg_sale_price,
    margem_percent: p.margin_percent,
    tem_custo: p.has_cost ? 'Sim' : 'Não',
  }));

  const exportColumns = [
    { key: 'produto', label: 'Produto' },
    { key: 'qtd_vendida', label: 'Qtd Vendida' },
    { key: 'custo_unitario', label: 'Custo Unit.', format: (v: number) => formatCurrency(v) },
    { key: 'custo_total', label: 'Custo Total', format: (v: number) => formatCurrency(v) },
    { key: 'preco_medio', label: 'Preço Médio', format: (v: number) => formatCurrency(v) },
    { key: 'margem_percent', label: 'Margem %', format: (v: number) => formatPercent(v) },
    { key: 'tem_custo', label: 'Custo Cadastrado' },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="CMV">
        <div className="space-y-6 animate-in fade-in duration-500">
          <SkeletonKPIGrid count={4} />
          <div className="grid gap-4 md:grid-cols-2">
            <SkeletonChart height={250} />
            <SkeletonChart height={250} />
          </div>
          <SkeletonTable rows={8} columns={6} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="CMV - Custo de Mercadorias Vendidas">
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
            filename="cmv-relatorio"
            title="Relatório CMV por Produto"
            disabled={productMargins.length === 0}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ERPStatsCard
            title="CMV Total"
            value={formatCurrency(cmvData.total_cost)}
            icon={TrendingDown}
          />
          <ERPStatsCard
            title="Receita Total"
            value={formatCurrency(cmvData.total_revenue)}
            icon={Package}
          />
          <ERPStatsCard
            title="% CMV"
            value={formatPercent(cmvData.cmv_percent)}
            icon={Percent}
          />
          <ERPStatsCard
            title="Produtos sem Custo"
            value={cmvData.products_without_cost}
            icon={AlertTriangle}
            className={cmvData.products_without_cost > 0 ? 'bg-yellow-500/10' : ''}
          />
        </div>

        {itemsWithoutCost > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">
                  Existem {itemsWithoutCost} produtos vendidos sem custo cadastrado. 
                  O CMV apresentado é estimado.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        {productMargins.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Top 5 - CMV por Produto</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="custo" name="Custo Total" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Distribuição do CMV</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>CMV por Produto</CardTitle>
          </CardHeader>
          <CardContent>
            {productMargins.length === 0 ? (
              <EmptyData entity="produtos" type="table" />
            ) : (
              <ERPDataTable
                columns={[
                  { key: 'product_name', header: 'Produto' },
                  { key: 'quantity_sold', header: 'Qtd', align: 'right' },
                  {
                    key: 'unit_cost',
                    header: 'Custo Unit.',
                    align: 'right',
                    render: (item) => {
                      const p = item as { unit_cost: number; has_cost: boolean };
                      return p.has_cost ? formatCurrency(p.unit_cost) : (
                        <Badge variant="outline" className="text-yellow-600">
                          Não informado
                        </Badge>
                      );
                    },
                  },
                  {
                    key: 'margin_value',
                    header: 'Custo Total',
                    align: 'right',
                    render: (item) => {
                      const p = item as { unit_cost: number; quantity_sold: number };
                      return formatCurrency(p.unit_cost * p.quantity_sold);
                    },
                  },
                  {
                    key: 'avg_sale_price',
                    header: 'Preço Médio',
                    align: 'right',
                    render: (item) => formatCurrency((item as { avg_sale_price: number }).avg_sale_price),
                  },
                  {
                    key: 'margin_percent',
                    header: 'Margem',
                    align: 'right',
                    render: (item) => formatPercent((item as { margin_percent: number }).margin_percent),
                  },
                ]}
                data={productMargins.map((p, idx) => ({ ...p, id: `pm-${idx}` }))}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
