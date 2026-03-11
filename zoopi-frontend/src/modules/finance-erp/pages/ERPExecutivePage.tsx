import { useExecutiveDashboard } from '../hooks/useExecutiveDashboard';
import { DREComparisonCard } from '../components/DREComparisonCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  Receipt,
  ShoppingCart,
  Loader2,
  Building2,
  PiggyBank
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function ERPExecutivePage() {
  const { data, isLoading } = useExecutiveDashboard();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard Executivo">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Dashboard Executivo">
        <div className="text-center py-12 text-muted-foreground">
          Não foi possível carregar os dados
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard Executivo">
      <div className="space-y-6">
        {/* KPIs Principais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className={cn(
            data.receita_variacao_percent >= 0 ? 'border-green-500/30' : 'border-red-500/30'
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita do Mês
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.receita_mes_atual)}</div>
              <p className={cn(
                'text-xs flex items-center gap-1',
                data.receita_variacao_percent >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {data.receita_variacao_percent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatPercent(data.receita_variacao_percent)} vs mês anterior
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            data.despesas_variacao_percent <= 0 ? 'border-green-500/30' : 'border-red-500/30'
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas do Mês
              </CardTitle>
              <CreditCard className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(data.despesas_mes_atual)}</div>
              <p className={cn(
                'text-xs flex items-center gap-1',
                data.despesas_variacao_percent <= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {data.despesas_variacao_percent <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {formatPercent(Math.abs(data.despesas_variacao_percent))} vs mês anterior
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            data.lucro_mes_atual >= 0 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lucro do Mês
              </CardTitle>
              <TrendingUp className={cn('h-4 w-4', data.lucro_mes_atual >= 0 ? 'text-green-500' : 'text-red-500')} />
            </CardHeader>
            <CardContent>
              <div className={cn(
                'text-2xl font-bold',
                data.lucro_mes_atual >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {formatCurrency(data.lucro_mes_atual)}
              </div>
              <p className="text-xs text-muted-foreground">
                Margem: {formatPercent(data.margem_atual)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Disponível
              </CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.total_disponivel)}</div>
              <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                <span>Caixa: {formatCurrency(data.saldo_caixa)}</span>
                <span>•</span>
                <span>Bancos: {formatCurrency(data.saldo_bancos)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Segunda linha - Contas e Indicadores */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contas a Receber
              </CardTitle>
              <Receipt className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">{formatCurrency(data.contas_receber)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contas a Pagar
              </CardTitle>
              <CreditCard className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600">{formatCurrency(data.contas_pagar)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ticket Médio
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatCurrency(data.ticket_medio)}</div>
              <p className="text-xs text-muted-foreground">{data.total_pedidos} pedidos no mês</p>
            </CardContent>
          </Card>

          <Card className={cn(
            data.saldo_liquido >= 0 ? 'bg-green-500/5' : 'bg-red-500/5'
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Líquido
              </CardTitle>
              <PiggyBank className={cn('h-4 w-4', data.saldo_liquido >= 0 ? 'text-green-500' : 'text-red-500')} />
            </CardHeader>
            <CardContent>
              <div className={cn(
                'text-xl font-bold',
                data.saldo_liquido >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {formatCurrency(data.saldo_liquido)}
              </div>
              <p className="text-xs text-muted-foreground">Receber - Pagar</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Gráfico Receita Diária */}
          <Card>
            <CardHeader>
              <CardTitle>Receita Diária (30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.receita_diaria}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(d) => format(new Date(d), 'dd/MM')}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                    labelFormatter={(label) => format(new Date(label), "dd 'de' MMMM", { locale: ptBR })}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Despesas */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {data.top_despesas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma despesa registrada no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.top_despesas} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                    <YAxis 
                      type="category" 
                      dataKey="categoria" 
                      width={80}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Valor']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                      {data.top_despesas.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumo Comparativo */}
        <Card>
          <CardHeader>
            <CardTitle>Comparativo com Mês Anterior</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <DREComparisonCard
                title="Receita"
                currentValue={data.receita_mes_atual}
                previousValue={data.receita_mes_anterior}
              />
              <DREComparisonCard
                title="Despesas"
                currentValue={data.despesas_mes_atual}
                previousValue={data.despesas_mes_anterior}
                invertColors
              />
              <DREComparisonCard
                title="Lucro"
                currentValue={data.lucro_mes_atual}
                previousValue={data.lucro_mes_anterior}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
