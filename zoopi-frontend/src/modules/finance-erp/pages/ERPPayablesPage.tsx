import { useERPPayablesInstallments } from '../hooks';
import { ERPDataTable, ERPStatsCard } from '../components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExportDropdown } from '@/components/export/ExportDropdown';
import { SkeletonKPIGrid, SkeletonTable, SkeletonChart } from '@/components/ui/skeleton-table';
import { EmptyData } from '@/components/ui/empty-state';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = ['hsl(var(--chart-3))', 'hsl(var(--chart-2))', 'hsl(var(--chart-1))'];

export function ERPPayablesPage() {
  const { installments, isLoading, totals, payInstallment } = useERPPayablesInstallments();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

  const formatDate = (date: string) =>
    format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });

  const handlePay = async (id: string) => {
    await payInstallment.mutateAsync({ id });
  };

  const openInstallments = installments.filter(i => i.status === 'aberto' || i.status === 'atrasado');
  const paidInstallments = installments.filter(i => i.status === 'pago');

  // Chart data
  const pieChartData = [
    { name: 'Em Aberto', value: totals.open },
    { name: 'Pago', value: totals.paid },
    { name: 'Vencido', value: totals.overdue },
  ].filter(d => d.value > 0);

  // Export configuration
  const exportData = installments.map(i => ({
    descricao: i.description,
    parcela: `${i.installment_number}/${i.total_installments}`,
    valor: i.amount_cents,
    vencimento: i.due_date,
    status: i.status,
  }));

  const exportColumns = [
    { key: 'descricao', label: 'Descrição' },
    { key: 'parcela', label: 'Parcela' },
    { key: 'valor', label: 'Valor', format: (v: number) => formatCurrency(v) },
    { key: 'vencimento', label: 'Vencimento', format: (v: string) => formatDate(v) },
    { key: 'status', label: 'Status' },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Contas a Pagar">
        <div className="space-y-6 animate-in fade-in duration-500">
          <SkeletonKPIGrid count={4} />
          <SkeletonChart height={250} />
          <SkeletonTable rows={8} columns={5} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Contas a Pagar">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-end">
          <ExportDropdown
            data={exportData}
            columns={exportColumns}
            filename="contas-pagar"
            title="Relatório de Contas a Pagar"
            disabled={installments.length === 0}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ERPStatsCard
            title="Total"
            value={formatCurrency(totals.total)}
            icon={DollarSign}
          />
          <ERPStatsCard
            title="Em Aberto"
            value={formatCurrency(totals.open)}
            icon={Clock}
            className="bg-yellow-500/10"
          />
          <ERPStatsCard
            title="Pago"
            value={formatCurrency(totals.paid)}
            icon={CheckCircle}
            className="bg-green-500/10"
          />
          <ERPStatsCard
            title="Vencidas"
            value={formatCurrency(totals.overdue)}
            icon={AlertTriangle}
            className="bg-red-500/10"
          />
        </div>

        {/* Chart */}
        {pieChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Distribuição por Status</CardTitle>
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
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {openInstallments.length === 0 ? (
              <EmptyData entity="contas pendentes" type="table" />
            ) : (
              <ERPDataTable
                columns={[
                  { key: 'description', header: 'Descrição' },
                  {
                    key: 'installment',
                    header: 'Parcela',
                    render: (item) => {
                      const i = item as { installment_number: number; total_installments: number };
                      return `${i.installment_number}/${i.total_installments}`;
                    },
                  },
                  {
                    key: 'amount_cents',
                    header: 'Valor',
                    align: 'right',
                    render: (item) => formatCurrency((item as { amount_cents: number }).amount_cents),
                  },
                  {
                    key: 'due_date',
                    header: 'Vencimento',
                    render: (item) => formatDate((item as { due_date: string }).due_date),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (item) => {
                      const s = (item as { status: string }).status;
                      return (
                        <Badge variant={s === 'atrasado' ? 'destructive' : 'secondary'}>
                          {s}
                        </Badge>
                      );
                    },
                  },
                  {
                    key: 'actions',
                    header: 'Ações',
                    render: (item) => {
                      const i = item as { id: string };
                      return (
                        <Button
                          size="sm"
                          onClick={() => handlePay(i.id)}
                          disabled={payInstallment.isPending}
                        >
                          Pagar
                        </Button>
                      );
                    },
                  },
                ]}
                data={openInstallments}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagas</CardTitle>
          </CardHeader>
          <CardContent>
            {paidInstallments.length === 0 ? (
              <EmptyData entity="contas pagas" type="table" />
            ) : (
              <ERPDataTable
                columns={[
                  { key: 'description', header: 'Descrição' },
                  {
                    key: 'installment',
                    header: 'Parcela',
                    render: (item) => {
                      const i = item as { installment_number: number; total_installments: number };
                      return `${i.installment_number}/${i.total_installments}`;
                    },
                  },
                  {
                    key: 'amount_cents',
                    header: 'Valor',
                    align: 'right',
                    render: (item) => formatCurrency((item as { amount_cents: number }).amount_cents),
                  },
                  {
                    key: 'paid_at',
                    header: 'Pago em',
                    render: (item) => {
                      const paidAt = (item as { paid_at: string | null }).paid_at;
                      return paidAt ? formatDate(paidAt) : '-';
                    },
                  },
                ]}
                data={paidInstallments}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
