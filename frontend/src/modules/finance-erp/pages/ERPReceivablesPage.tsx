import { useERPReceivables } from '../hooks';
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const COLORS = ['hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-1))'];

export function ERPReceivablesPage() {
  const { receivables, isLoading, totals, receivePayment } = useERPReceivables();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

  const formatDate = (date: string | null) =>
    date ? format(new Date(date), 'dd/MM/yyyy', { locale: ptBR }) : '-';

  const handleReceive = async (id: string, amount_cents: number) => {
    await receivePayment.mutateAsync({ id, amount_cents });
  };

  const openReceivables = receivables.filter(r => r.status === 'aberto' || r.status === 'parcial');
  const receivedReceivables = receivables.filter(r => r.status === 'recebido');

  // Chart data
  const pieChartData = [
    { name: 'Em Aberto', value: totals.open },
    { name: 'Recebido', value: totals.received },
    { name: 'Vencido', value: totals.overdue },
  ].filter(d => d.value > 0);

  // Export configuration
  const exportData = receivables.map(r => ({
    descricao: r.description,
    cliente: r.customer_name,
    valor: r.amount_cents,
    vencimento: r.due_date,
    status: r.status,
  }));

  const exportColumns = [
    { key: 'descricao', label: 'Descrição' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'valor', label: 'Valor', format: (v: number) => formatCurrency(v) },
    { key: 'vencimento', label: 'Vencimento', format: (v: string) => formatDate(v) },
    { key: 'status', label: 'Status' },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Contas a Receber">
        <div className="space-y-6 animate-in fade-in duration-500">
          <SkeletonKPIGrid count={4} />
          <SkeletonChart height={250} />
          <SkeletonTable rows={8} columns={5} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Contas a Receber">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-end">
          <ExportDropdown
            data={exportData}
            columns={exportColumns}
            filename="contas-receber"
            title="Relatório de Contas a Receber"
            disabled={receivables.length === 0}
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
            title="Recebido"
            value={formatCurrency(totals.received)}
            icon={CheckCircle}
            className="bg-green-500/10"
          />
          <ERPStatsCard
            title="Vencidos"
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
            {openReceivables.length === 0 ? (
              <EmptyData entity="recebíveis pendentes" type="table" />
            ) : (
              <ERPDataTable
                columns={[
                  { key: 'description', header: 'Descrição' },
                  { key: 'customer_name', header: 'Cliente' },
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
                        <Badge variant={s === 'parcial' ? 'secondary' : 'outline'}>
                          {s}
                        </Badge>
                      );
                    },
                  },
                  {
                    key: 'actions',
                    header: 'Ações',
                    render: (item) => {
                      const r = item as { id: string; amount_cents: number; paid_amount_cents: number };
                      const remaining = r.amount_cents - r.paid_amount_cents;
                      return (
                        <Button
                          size="sm"
                          onClick={() => handleReceive(r.id, remaining)}
                          disabled={receivePayment.isPending}
                        >
                          Receber
                        </Button>
                      );
                    },
                  },
                ]}
                data={openReceivables}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recebidos</CardTitle>
          </CardHeader>
          <CardContent>
            {receivedReceivables.length === 0 ? (
              <EmptyData entity="recebíveis" type="table" />
            ) : (
              <ERPDataTable
                columns={[
                  { key: 'description', header: 'Descrição' },
                  { key: 'customer_name', header: 'Cliente' },
                  {
                    key: 'amount_cents',
                    header: 'Valor',
                    align: 'right',
                    render: (item) => formatCurrency((item as { amount_cents: number }).amount_cents),
                  },
                  {
                    key: 'received_at',
                    header: 'Recebido em',
                    render: (item) => formatDate((item as { received_at: string | null }).received_at),
                  },
                ]}
                data={receivedReceivables}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
