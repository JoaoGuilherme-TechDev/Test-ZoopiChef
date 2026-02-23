import { useERPFilters, useERPDeliveryFees } from '../hooks';
import { ERPFiltersBar, ERPStatsCard, ERPDataTable } from '../components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Truck, MapPin } from 'lucide-react';
import { ExportDropdown } from '@/components/export/ExportDropdown';
import { SkeletonKPIGrid, SkeletonTable } from '@/components/ui/skeleton-table';
import { EmptyData } from '@/components/ui/empty-state';

export function ERPDeliveryFeesPage() {
  const { filters, setDateRange } = useERPFilters();
  const { totals, feesByPeriod, isLoading } = useERPDeliveryFees(filters);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Export configuration
  const exportData = feesByPeriod.map((f: any) => ({
    periodo: f.period || f.date || '-',
    entregas: f.delivery_orders || f.orders || 0,
    total_taxas: f.total_delivery_fees || 0,
    taxa_media: f.avg_fee || 0,
  }));

  const exportColumns = [
    { key: 'periodo', label: 'Período' },
    { key: 'entregas', label: 'Entregas' },
    { key: 'total_taxas', label: 'Total Taxa', format: (v: number) => formatCurrency(v) },
    { key: 'taxa_media', label: 'Taxa Média', format: (v: number) => formatCurrency(v) },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Taxas de Entrega">
        <div className="space-y-6 animate-in fade-in duration-500">
          <SkeletonKPIGrid count={3} />
          <SkeletonTable rows={8} columns={4} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Taxas de Entrega">
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
            filename="taxas-entrega"
            title="Relatório de Taxas de Entrega"
            disabled={feesByPeriod.length === 0}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ERPStatsCard
            title="Total Arrecadado"
            value={formatCurrency(totals.total_delivery_fees)}
            icon={Truck}
          />
          <ERPStatsCard
            title="Entregas Realizadas"
            value={totals.delivery_orders}
            icon={MapPin}
          />
          <ERPStatsCard
            title="Taxa Média"
            value={formatCurrency(totals.avg_fee)}
            icon={Truck}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Taxas por Período</CardTitle>
          </CardHeader>
          <CardContent>
            {feesByPeriod.length === 0 ? (
              <EmptyData entity="entregas" type="table" />
            ) : (
              <ERPDataTable
                columns={[
                  { key: 'period', header: 'Período' },
                  { key: 'delivery_orders', header: 'Entregas', align: 'right' },
                  {
                    key: 'total_delivery_fees',
                    header: 'Total Taxa',
                    align: 'right',
                    render: (item) => formatCurrency((item as { total_delivery_fees: number }).total_delivery_fees),
                  },
                  {
                    key: 'avg_fee',
                    header: 'Taxa Média',
                    align: 'right',
                    render: (item) => formatCurrency((item as { avg_fee: number }).avg_fee),
                  },
                ]}
                data={feesByPeriod.map((f, idx) => ({ ...f, id: `fee-${idx}` }))}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
