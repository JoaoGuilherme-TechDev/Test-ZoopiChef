import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import type { DashboardRealtimeData } from '@/hooks/useDashboardRealtime';

interface DashboardChartsSectionProps {
  data: DashboardRealtimeData;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Custom tooltip component for recharts - using forwardRef to avoid warning
const CustomTooltip = React.forwardRef<HTMLDivElement, { active?: boolean; payload?: Array<{ name: string; value: number }> }>(
  ({ active, payload }, ref) => {
    if (active && payload && payload.length) {
      return (
        <div ref={ref} className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-primary font-bold">
            {typeof payload[0].value === 'number' && payload[0].value > 100 
              ? formatCurrency(payload[0].value)
              : payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  }
);
CustomTooltip.displayName = 'CustomTooltip';

export function DashboardChartsSection({ data }: DashboardChartsSectionProps) {
  // Dados para gráfico de pizza - Formas de Pagamento
  const paymentData = Object.entries(data.cashRegister.paymentBreakdown)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));

  // Dados para gráfico de barras - Status dos Pedidos
  const orderStatusData = [
    { name: 'Novos', value: data.orders.novo, fill: '#3b82f6' },
    { name: 'Preparo', value: data.orders.preparo, fill: '#f59e0b' },
    { name: 'Pronto', value: data.orders.pronto, fill: '#10b981' },
    { name: 'Em Rota', value: data.orders.em_rota, fill: '#8b5cf6' },
    { name: 'Entregue', value: data.orders.entregue, fill: '#06b6d4' },
    { name: 'Cancelado', value: data.orders.cancelled, fill: '#ef4444' },
  ].filter(item => item.value > 0);

  // Dados para gráfico de pizza - Mesas
  const tablesData = [
    { name: 'Livres', value: data.tables.free, fill: '#10b981' },
    { name: 'Ocupadas', value: data.tables.occupied, fill: '#f59e0b' },
    { name: 'Aguard. Pgto', value: data.tables.awaiting_payment, fill: '#ef4444' },
    { name: 'Reservadas', value: data.tables.reserved, fill: '#3b82f6' },
  ].filter(item => item.value > 0);

  // Dados para gráfico de comandas
  const comandasData = [
    { name: 'Abertas', value: data.comandas.open, fill: '#3b82f6' },
    { name: 'Aguard. Pgto', value: data.comandas.awaiting_payment, fill: '#f59e0b' },
    { name: 'Fechadas', value: data.comandas.closed, fill: '#10b981' },
  ].filter(item => item.value > 0);

  // Dados para gráfico financeiro
  const financialData = [
    { name: 'A Pagar Hoje', valor: data.financials.payablesToday, fill: '#ef4444' },
    { name: 'Vencidas', valor: data.financials.overduePayables, fill: '#dc2626' },
    { name: 'A Receber', valor: data.financials.receivablesToday, fill: '#10b981' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-display font-semibold flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        Visão Gráfica em Tempo Real
      </h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Gráfico Pizza - Formas de Pagamento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-primary" />
              Vendas por Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {paymentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem vendas ainda
              </div>
            )}
            <div className="mt-2 text-center">
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(data.cashRegister.totalSales)}
              </span>
              <p className="text-xs text-muted-foreground">Total em Vendas</p>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico Barras - Status Pedidos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Pedidos por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orderStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={orderStatusData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem pedidos ainda
              </div>
            )}
            <div className="mt-2 text-center">
              <span className="text-2xl font-bold">{data.orders.total}</span>
              <p className="text-xs text-muted-foreground">Total de Pedidos</p>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico Pizza - Mesas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-orange-500" />
              Ocupação de Mesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tablesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={tablesData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {tablesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem mesas cadastradas
              </div>
            )}
            <div className="mt-2 text-center">
              <span className="text-2xl font-bold">{data.tables.total}</span>
              <p className="text-xs text-muted-foreground">Total de Mesas</p>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico Pizza - Comandas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-500" />
              Status das Comandas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comandasData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={comandasData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {comandasData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem comandas abertas
              </div>
            )}
            <div className="mt-2 text-center">
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(data.comandas.totalAmount - data.comandas.paidAmount)}
              </span>
              <p className="text-xs text-muted-foreground">A Receber (Comandas)</p>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico Barras - Financeiro */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Balanço Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={financialData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis hide />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  {financialData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs">
              <div>
                <span className="font-bold text-red-600">{formatCurrency(data.financials.payablesToday + data.financials.overduePayables)}</span>
                <p className="text-muted-foreground">A Pagar</p>
              </div>
              <div>
                <span className="font-bold text-green-600">{formatCurrency(data.financials.receivablesToday)}</span>
                <p className="text-muted-foreground">A Receber</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo Caixa Visual */}
        <Card className={data.cashRegister.isOpen ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              💰 Resumo do Caixa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Abertura:</span>
              <span className="font-medium">{formatCurrency(data.cashRegister.openingBalance)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Vendas:</span>
              <span className="font-medium text-green-600">+{formatCurrency(data.cashRegister.totalSales)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Cancelamentos:</span>
              <span className="font-medium text-red-600">-{formatCurrency(data.deletions.cancelledAmount)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="text-sm font-semibold">Saldo Atual:</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(data.cashRegister.currentBalance)}</span>
            </div>
            <div className="text-center pt-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${data.cashRegister.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {data.cashRegister.isOpen ? '🟢 Caixa Aberto' : '🔴 Caixa Fechado'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
