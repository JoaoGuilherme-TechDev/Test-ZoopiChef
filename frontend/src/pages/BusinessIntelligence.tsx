import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useBIData } from '@/hooks/useBIData';
import { useDeliverers } from '@/hooks/useDeliverers';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  DollarSign, ShoppingBag, TrendingUp, Clock, Truck, AlertTriangle, 
  CreditCard, Banknote, Smartphone, Users, Timer, ArrowRight, Wallet,
  RefreshCw, CheckCircle, XCircle, Package, Zap
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// High contrast color palette
const CHART_COLORS = {
  primary: '#22c55e',      // Green
  secondary: '#3b82f6',    // Blue
  warning: '#f59e0b',      // Amber
  danger: '#ef4444',       // Red
  info: '#06b6d4',         // Cyan
  purple: '#a855f7',       // Purple
  pink: '#ec4899',         // Pink
  orange: '#f97316',       // Orange
};

const PAYMENT_COLORS: Record<string, string> = {
  dinheiro: CHART_COLORS.primary,
  pix: CHART_COLORS.secondary,
  cartao: CHART_COLORS.purple,
  fiado: CHART_COLORS.warning,
};

const CHANNEL_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.warning,
  CHART_COLORS.info,
  CHART_COLORS.purple,
  CHART_COLORS.pink,
  CHART_COLORS.orange,
];

export default function BusinessIntelligence() {
  const [period, setPeriod] = useState('0'); // 0 = today
  const [selectedDeliverer, setSelectedDeliverer] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');

  const { deliverers } = useDeliverers();

  const filters = {
    startDate: period === '0' ? startOfDay(new Date()) : subDays(new Date(), parseInt(period)),
    endDate: endOfDay(new Date()),
    delivererId: selectedDeliverer !== 'all' ? selectedDeliverer : undefined,
    paymentMethod: selectedPayment !== 'all' ? selectedPayment : undefined,
    channel: selectedChannel !== 'all' ? selectedChannel : undefined,
  };

  const { 
    overviewStats, 
    channelData, 
    delivererStats, 
    operationalTimes, 
    topProducts,
    financialData,
    isLoading 
  } = useBIData(filters);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });

  // Payment method chart data
  const paymentChartData = overviewStats ? [
    { name: 'Dinheiro', value: overviewStats.paymentTotals.dinheiro, count: overviewStats.paymentCounts.dinheiro },
    { name: 'PIX', value: overviewStats.paymentTotals.pix, count: overviewStats.paymentCounts.pix },
    { name: 'Cartão', value: overviewStats.paymentTotals.cartao, count: overviewStats.paymentCounts.cartao },
    { name: 'Fiado', value: overviewStats.paymentTotals.fiado, count: overviewStats.paymentCounts.fiado },
  ].filter(d => d.value > 0) : [];

  // Operational times chart data
  const timesChartData = operationalTimes ? [
    { name: 'Espera', value: operationalTimes.avgWait, color: CHART_COLORS.warning },
    { name: 'Preparo', value: operationalTimes.avgPrep, color: CHART_COLORS.info },
    { name: 'Pronto → Saída', value: operationalTimes.avgReady, color: CHART_COLORS.purple },
    { name: 'Entrega', value: operationalTimes.avgDelivery, color: CHART_COLORS.primary },
  ] : [];

  if (isLoading) {
    return (
      <DashboardLayout title="BI - Business Intelligence">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="BI - Business Intelligence">
      <div className="space-y-6">
        {/* Header with realtime indicator and filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Dados em tempo real
            </div>
            <span className="text-sm text-muted-foreground">{currentDate}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Hoje</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="15">Últimos 15 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedDeliverer} onValueChange={setSelectedDeliverer}>
              <SelectTrigger className="w-[150px] bg-background">
                <SelectValue placeholder="Entregador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Entregadores</SelectItem>
                {deliverers.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPayment} onValueChange={setSelectedPayment}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Pagamentos</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="fiado">Fiado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Receita */}
          <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-400">RECEITA TOTAL</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {formatCurrency(overviewStats?.totalRevenue || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-green-500/20">
                  <DollarSign className="w-8 h-8 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Pedidos */}
          <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-400">TOTAL PEDIDOS</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {overviewStats?.totalOrders || 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <ShoppingBag className="w-8 h-8 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Médio */}
          <Card className="border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-cyan-400">TICKET MÉDIO</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {formatCurrency(overviewStats?.avgTicket || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/20">
                  <TrendingUp className="w-8 h-8 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Em Atraso */}
          <Card className={`border-2 ${(overviewStats?.delayedOrders || 0) > 0 ? 'border-red-500/50 bg-gradient-to-br from-red-500/20 to-transparent' : 'border-gray-500/30 bg-gradient-to-br from-gray-500/10 to-transparent'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${(overviewStats?.delayedOrders || 0) > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    EM ATRASO
                  </p>
                  <p className={`text-3xl font-bold mt-1 ${(overviewStats?.delayedOrders || 0) > 0 ? 'text-red-400' : 'text-white'}`}>
                    {overviewStats?.delayedOrders || 0}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${(overviewStats?.delayedOrders || 0) > 0 ? 'bg-red-500/20' : 'bg-gray-500/20'}`}>
                  <AlertTriangle className={`w-8 h-8 ${(overviewStats?.delayedOrders || 0) > 0 ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Pills */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Status dos Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="text-base px-4 py-2 bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                <Clock className="w-4 h-4 mr-2" />
                Novo: {overviewStats?.statusCounts?.novo || 0}
              </Badge>
              <Badge variant="outline" className="text-base px-4 py-2 bg-orange-500/20 text-orange-400 border-orange-500/50">
                <RefreshCw className="w-4 h-4 mr-2" />
                Preparo: {overviewStats?.statusCounts?.preparo || 0}
              </Badge>
              <Badge variant="outline" className="text-base px-4 py-2 bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                <CheckCircle className="w-4 h-4 mr-2" />
                Pronto: {overviewStats?.statusCounts?.pronto || 0}
              </Badge>
              <Badge variant="outline" className="text-base px-4 py-2 bg-purple-500/20 text-purple-400 border-purple-500/50">
                <Truck className="w-4 h-4 mr-2" />
                Em Rota: {overviewStats?.statusCounts?.em_rota || 0}
              </Badge>
              <Badge variant="outline" className="text-base px-4 py-2 bg-green-500/20 text-green-400 border-green-500/50">
                <CheckCircle className="w-4 h-4 mr-2" />
                Entregue: {overviewStats?.statusCounts?.entregue || 0}
              </Badge>
              <Badge variant="outline" className="text-base px-4 py-2 bg-red-500/20 text-red-400 border-red-500/50">
                <XCircle className="w-4 h-4 mr-2" />
                Cancelado: {overviewStats?.statusCounts?.cancelado || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Banknote className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-sm text-green-400">Dinheiro</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(overviewStats?.paymentTotals?.dinheiro || 0)}</p>
                  <p className="text-xs text-muted-foreground">{overviewStats?.paymentCounts?.dinheiro || 0} pedidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-blue-400" />
                <div>
                  <p className="text-sm text-blue-400">PIX</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(overviewStats?.paymentTotals?.pix || 0)}</p>
                  <p className="text-xs text-muted-foreground">{overviewStats?.paymentCounts?.pix || 0} pedidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-purple-400" />
                <div>
                  <p className="text-sm text-purple-400">Cartão</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(overviewStats?.paymentTotals?.cartao || 0)}</p>
                  <p className="text-xs text-muted-foreground">{overviewStats?.paymentCounts?.cartao || 0} pedidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Wallet className="w-6 h-6 text-yellow-400" />
                <div>
                  <p className="text-sm text-yellow-400">Fiado</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(overviewStats?.paymentTotals?.fiado || 0)}</p>
                  <p className="text-xs text-muted-foreground">{overviewStats?.paymentCounts?.fiado || 0} pedidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="vendas" className="space-y-4">
          <TabsList className="bg-background/50 border border-border/50">
            <TabsTrigger value="vendas">Vendas por Canal</TabsTrigger>
            <TabsTrigger value="entregadores">Entregadores</TabsTrigger>
            <TabsTrigger value="tempos">Tempos Operacionais</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          </TabsList>

          {/* Vendas por Canal Tab */}
          <TabsContent value="vendas">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    Vendas por Canal de Venda
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Mostra quanto cada canal de venda representa no faturamento total
                  </p>
                </CardHeader>
                <CardContent>
                  {channelData && channelData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={channelData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          stroke="transparent"
                        >
                          {channelData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'Valor']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Sem dados no período
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Vendas por Forma de Pagamento
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Distribuição do faturamento por método de pagamento
                  </p>
                </CardHeader>
                <CardContent>
                  {paymentChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={paymentChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} stroke="#888" />
                        <YAxis dataKey="name" type="category" width={80} stroke="#888" />
                        <Tooltip 
                          formatter={(value: number, name: string) => [formatCurrency(value), 'Valor']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {paymentChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={PAYMENT_COLORS[entry.name.toLowerCase()] || CHART_COLORS.info} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Sem dados no período
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Entregadores Tab */}
          <TabsContent value="entregadores">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Desempenho dos Entregadores
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Quantidade de entregas, valor total, tempo médio e pedidos em rota de cada entregador
                </p>
              </CardHeader>
              <CardContent>
                {delivererStats && delivererStats.length > 0 ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left py-3 px-4 font-semibold text-white">Entregador</th>
                            <th className="text-center py-3 px-4 font-semibold text-white">Entregas</th>
                            <th className="text-right py-3 px-4 font-semibold text-white">Valor Total</th>
                            <th className="text-center py-3 px-4 font-semibold text-white">Tempo Médio</th>
                            <th className="text-center py-3 px-4 font-semibold text-white">Em Rota</th>
                            <th className="text-center py-3 px-4 font-semibold text-white">Atrasados</th>
                          </tr>
                        </thead>
                        <tbody>
                          {delivererStats.map((deliverer) => (
                            <tr key={deliverer.id} className="border-b border-border/30 hover:bg-white/5">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-blue-400" />
                                  <span className="font-medium text-white">{deliverer.name}</span>
                                </div>
                              </td>
                              <td className="text-center py-3 px-4">
                                <Badge className="bg-blue-500/20 text-blue-400 border-0">
                                  {deliverer.deliveries}
                                </Badge>
                              </td>
                              <td className="text-right py-3 px-4 text-green-400 font-medium">
                                {formatCurrency(deliverer.totalValue)}
                              </td>
                              <td className="text-center py-3 px-4">
                                <span className="text-cyan-400">{deliverer.avgDeliveryTime} min</span>
                              </td>
                              <td className="text-center py-3 px-4">
                                {deliverer.inRoute > 0 ? (
                                  <Badge className="bg-purple-500/20 text-purple-400 border-0">
                                    {deliverer.inRoute}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="text-center py-3 px-4">
                                {deliverer.delayed > 0 ? (
                                  <Badge className="bg-red-500/20 text-red-400 border-0">
                                    {deliverer.delayed}
                                  </Badge>
                                ) : (
                                  <span className="text-green-400">0</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Bar chart of deliveries */}
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={delivererStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="name" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="deliveries" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} name="Entregas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Nenhuma entrega no período
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tempos Operacionais Tab */}
          <TabsContent value="tempos">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="w-5 h-5" />
                    Tempos Médios por Etapa
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Tempo médio em minutos de cada etapa do pedido
                  </p>
                </CardHeader>
                <CardContent>
                  {operationalTimes ? (
                    <div className="space-y-6">
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={timesChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis type="number" unit=" min" stroke="#888" />
                          <YAxis dataKey="name" type="category" width={120} stroke="#888" />
                          <Tooltip 
                            formatter={(value: number) => [`${value} min`, 'Tempo']}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              color: 'hsl(var(--foreground))'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {timesChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Tempo Médio Total</p>
                          <p className="text-2xl font-bold text-white">{operationalTimes.avgTotal} min</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Gargalo Identificado</p>
                          <Badge className="bg-red-500/20 text-red-400 border-0 text-lg px-3 py-1">
                            {operationalTimes.bottleneck.name}: {operationalTimes.bottleneck.value} min
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Sem dados suficientes
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Análise de Gargalos
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Onde está perdendo mais tempo na operação
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {timesChartData.map((time, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-32 text-sm text-muted-foreground">{time.name}</div>
                        <div className="flex-1 h-8 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${operationalTimes ? (time.value / operationalTimes.avgTotal) * 100 : 0}%`,
                              backgroundColor: time.color
                            }}
                          />
                        </div>
                        <div className="w-16 text-right font-medium" style={{ color: time.color }}>
                          {time.value} min
                        </div>
                      </div>
                    ))}
                  </div>

                  {operationalTimes?.bottleneck && (
                    <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-red-400 mb-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-semibold">Atenção: Gargalo Detectado</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        A etapa <strong className="text-white">{operationalTimes.bottleneck.name}</strong> está 
                        levando mais tempo. Considere otimizar este processo para reduzir o tempo total de entrega.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Produtos Tab */}
          <TabsContent value="produtos">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Produtos Mais Vendidos
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Top 10 produtos por quantidade vendida
                  </p>
                </CardHeader>
                <CardContent>
                  {topProducts?.byQuantity && topProducts.byQuantity.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={topProducts.byQuantity} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis type="number" stroke="#888" />
                        <YAxis dataKey="name" type="category" width={150} stroke="#888" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(value: number) => [value, 'Quantidade']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="quantity" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                      Sem dados no período
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Produtos que Mais Faturam
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Top 10 produtos por receita gerada
                  </p>
                </CardHeader>
                <CardContent>
                  {topProducts?.byRevenue && topProducts.byRevenue.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={topProducts.byRevenue} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} stroke="#888" />
                        <YAxis dataKey="name" type="category" width={150} stroke="#888" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'Receita']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="revenue" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                      Sem dados no período
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financeiro Tab */}
          <TabsContent value="financeiro">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className={`border-2 ${financialData?.cashOpen ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Status do Caixa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    {financialData?.cashOpen ? (
                      <>
                        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                        <p className="text-xl font-bold text-green-400">CAIXA ABERTO</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Saldo inicial: {formatCurrency(financialData.cashBalance)}
                        </p>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                        <p className="text-xl font-bold text-red-400">CAIXA FECHADO</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Abra o caixa para operar
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    Contas a Pagar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                      <p className="text-2xl font-bold text-red-400">
                        {formatCurrency(financialData?.pendingPayable || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pagas no Período</p>
                      <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(financialData?.paidPayable || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-400">
                    <Wallet className="w-5 h-5" />
                    Fiado (Conta Corrente)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total em Aberto</p>
                      <p className="text-2xl font-bold text-yellow-400">
                        {formatCurrency(financialData?.totalFiadoOpen || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Recebido no Período</p>
                      <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(financialData?.fiadoReceived || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
