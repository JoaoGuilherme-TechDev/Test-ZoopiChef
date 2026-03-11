import { useERPFilters, useERPDiscounts } from '../hooks';
import { ERPFiltersBar, ERPStatsCard, ERPDataTable } from '../components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Percent, Ticket, AlertTriangle } from 'lucide-react';
import { ExportDropdown } from '@/components/export/ExportDropdown';
import { SkeletonKPIGrid, SkeletonTable } from '@/components/ui/skeleton-table';
import { EmptyData } from '@/components/ui/empty-state';

export function ERPDiscountsPage() {
  const { filters, setDateRange } = useERPFilters();
  const { totals, discountsByPeriod, isLoading } = useERPDiscounts(filters);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Export configuration
  const exportData = discountsByPeriod.map(d => ({
    data: d.date,
    pedidos_com_desconto: d.orders_with_discount,
    total_descontos: d.total_discounts,
  }));

  const exportColumns = [
    { key: 'data', label: 'Data' },
    { key: 'pedidos_com_desconto', label: 'Pedidos com Desconto' },
    { key: 'total_descontos', label: 'Total Descontos', format: (v: number) => formatCurrency(v) },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Relatório de Descontos">
        <div className="space-y-6 animate-in fade-in duration-500">
          <SkeletonKPIGrid count={3} />
          <SkeletonTable rows={8} columns={3} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Relatório de Descontos">
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
            filename="descontos-relatorio"
            title="Relatório de Descontos"
            disabled={discountsByPeriod.length === 0}
          />
        </div>

        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                {totals?._note || 'Coluna discount não existe na tabela orders. Valores zerados.'}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ERPStatsCard
            title="Total de Descontos"
            value={formatCurrency(totals?.total_discounts || 0)}
            icon={Percent}
          />
          <ERPStatsCard
            title="Pedidos com Desconto"
            value={totals?.orders_with_discount || 0}
            icon={Ticket}
          />
          <ERPStatsCard
            title="Desconto Médio %"
            value={`${(totals?.avg_discount_percent || 0).toFixed(2)}%`}
            icon={Percent}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Descontos por Período</CardTitle>
          </CardHeader>
          <CardContent>
            {discountsByPeriod.length === 0 ? (
              <EmptyData entity="descontos" type="table" />
            ) : (
              <ERPDataTable
                columns={[
                  { key: 'date', header: 'Data' },
                  { key: 'orders_with_discount', header: 'Pedidos', align: 'right' },
                  {
                    key: 'total_discounts',
                    header: 'Total Desconto',
                    align: 'right',
                    render: (item) => formatCurrency((item as { total_discounts: number }).total_discounts),
                  },
                ]}
                data={discountsByPeriod.map((d, idx) => ({ ...d, id: `disc-${idx}` }))}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
