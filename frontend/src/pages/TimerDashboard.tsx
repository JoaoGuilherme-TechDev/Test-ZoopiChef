import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useTimerAnalytics } from '@/hooks/useTimerAnalytics';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Timer, Clock, AlertTriangle, TrendingUp, Users, Package,
  Zap, Target, ArrowRight, ChefHat, Truck, CheckCircle, XCircle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatMinutesShort } from '@/lib/timeFormat';
import { ItemTimingSection } from '@/components/kds/ItemTimingSection';

const COLORS = {
  aceite: '#f59e0b',
  preparo: '#3b82f6',
  expedicao: '#8b5cf6',
  entrega: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
};

const STAGE_ICONS = {
  Aceite: Clock,
  Preparo: ChefHat,
  Expedição: Package,
  Entrega: Truck,
};

export default function TimerDashboard() {
  const [period, setPeriod] = useState('0');

  const filters = {
    startDate: period === '0' ? startOfDay(new Date()) : subDays(new Date(), parseInt(period)),
    endDate: endOfDay(new Date()),
  };

  const {
    orderTimings,
    stageStats,
    productDelays,
    hourlyDelays,
    delivererDelays,
    bottleneckSummary,
    isLoading,
  } = useTimerAnalytics(filters);

  const formatMinutes = formatMinutesShort;

  const getDelayBadge = (percentage: number) => {
    if (percentage > 30) return <Badge className="bg-destructive text-destructive-foreground">{percentage}% atrasados</Badge>;
    if (percentage > 15) return <Badge className="bg-yellow-500 text-black">{percentage}% atrasados</Badge>;
    return <Badge className="bg-green-500 text-white">{percentage}% atrasados</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard de Cronômetros">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  const stageChartData = stageStats?.map(s => ({
    name: s.stage,
    'Tempo Médio': s.avgTime,
    'Tempo Máximo': s.maxTime,
    'Tempo Mínimo': s.minTime,
  })) || [];

  const delayChartData = stageStats?.map(s => ({
    name: s.stage,
    value: s.delayPercentage,
    fill: s.delayPercentage > 30 ? COLORS.danger : s.delayPercentage > 15 ? COLORS.warning : COLORS.success,
  })) || [];

  return (
    <DashboardLayout title="Dashboard de Cronômetros">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Timer className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Análise de Tempos</h1>
              <p className="text-muted-foreground text-sm">Monitore onde estão os gargalos da operação</p>
            </div>
          </div>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Hoje</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bottleneck Alert */}
        {bottleneckSummary && bottleneckSummary.worstStage && bottleneckSummary.worstStage.delayPercentage > 10 && (
          <Card className="border-2 border-destructive/50 bg-destructive/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-destructive/20">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-destructive">Gargalo Identificado: {bottleneckSummary.worstStage.stage}</h3>
                  <p className="text-muted-foreground mt-1">{bottleneckSummary.recommendation}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <Badge variant="destructive">
                      {bottleneckSummary.worstStage.delayPercentage}% dos pedidos atrasados nesta etapa
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Média: {formatMinutes(bottleneckSummary.worstStage.avgTime)} | Máximo: {formatMinutes(bottleneckSummary.worstStage.maxTime)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stage Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {stageStats?.map((stage, idx) => {
            const Icon = STAGE_ICONS[stage.stage as keyof typeof STAGE_ICONS] || Clock;
            const color = Object.values(COLORS)[idx];
            const isBottleneck = bottleneckSummary?.worstStage?.stage === stage.stage;

            return (
              <Card 
                key={stage.stage} 
                className={`relative overflow-hidden ${isBottleneck ? 'border-2 border-destructive ring-2 ring-destructive/20' : ''}`}
              >
                {isBottleneck && (
                  <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-bl-lg font-medium">
                    GARGALO
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <CardTitle className="text-base">{stage.stage}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-3xl font-bold">{formatMinutes(stage.avgTime)}</p>
                      <p className="text-xs text-muted-foreground">Tempo médio</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mín: {formatMinutes(stage.minTime)}</span>
                      <span className="text-muted-foreground">Máx: {formatMinutes(stage.maxTime)}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Atrasos</span>
                        <span className={stage.delayPercentage > 30 ? 'text-destructive font-medium' : ''}>
                          {stage.delayedCount}/{stage.totalCount} ({stage.delayPercentage}%)
                        </span>
                      </div>
                      <Progress 
                        value={stage.delayPercentage} 
                        className={`h-2 ${stage.delayPercentage > 30 ? '[&>div]:bg-destructive' : stage.delayPercentage > 15 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="visao-geral" className="space-y-4">
          <TabsList className="bg-background border">
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="itens">Itens</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="entregadores">Entregadores</TabsTrigger>
            <TabsTrigger value="horarios">Por Horário</TabsTrigger>
            <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          </TabsList>

          {/* Visão Geral Tab */}
          <TabsContent value="visao-geral" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Stage Time Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="w-5 h-5" />
                    Comparativo de Tempos por Etapa
                  </CardTitle>
                  <CardDescription>Tempo médio, mínimo e máximo por etapa</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stageChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tickFormatter={(v) => `${v}min`} stroke="hsl(var(--foreground))" />
                      <YAxis dataKey="name" type="category" width={80} stroke="hsl(var(--foreground))" />
                      <Tooltip 
                        formatter={(value: number) => [`${value} min`, '']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          color: 'hsl(var(--card-foreground))'
                        }}
                        labelStyle={{ color: 'hsl(var(--card-foreground))' }}
                        itemStyle={{ color: 'hsl(var(--card-foreground))' }}
                      />
                      <Legend />
                      <Bar dataKey="Tempo Mínimo" fill={COLORS.success} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Tempo Médio" fill={COLORS.preparo} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Tempo Máximo" fill={COLORS.danger} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Delay Percentage by Stage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Percentual de Atrasos por Etapa
                  </CardTitle>
                  <CardDescription>Onde estão os maiores problemas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={delayChartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                      <YAxis tickFormatter={(v) => `${v}%`} stroke="hsl(var(--foreground))" />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Atrasos']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          color: 'hsl(var(--card-foreground))'
                        }}
                        labelStyle={{ color: 'hsl(var(--card-foreground))' }}
                        itemStyle={{ color: 'hsl(var(--card-foreground))' }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {delayChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Hourly Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Performance por Horário
                </CardTitle>
                <CardDescription>Identificar horários de pico com mais atrasos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={hourlyDelays}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} stroke="hsl(var(--foreground))" />
                    <YAxis yAxisId="left" orientation="left" tickFormatter={(v) => `${v}min`} stroke="hsl(var(--foreground))" />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--foreground))" />
                    <Tooltip 
                      labelFormatter={(h) => `${h}:00`}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--card-foreground))'
                      }}
                      labelStyle={{ color: 'hsl(var(--card-foreground))' }}
                      itemStyle={{ color: 'hsl(var(--card-foreground))' }}
                    />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="avgTotal" 
                      name="Tempo Médio Total" 
                      stroke={COLORS.preparo} 
                      fill={`${COLORS.preparo}40`}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="orderCount" 
                      name="Qtd Pedidos" 
                      stroke={COLORS.success} 
                      strokeWidth={2}
                      dot={{ fill: COLORS.success }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Itens Tab - Item-level timing */}
          <TabsContent value="itens" className="space-y-4">
            <ItemTimingSection filters={filters} />
          </TabsContent>

          <TabsContent value="produtos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Produtos com Maior Tempo de Preparo
                </CardTitle>
                <CardDescription>Produtos que mais demoram na produção</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Tempo Médio</TableHead>
                      <TableHead className="text-right">Tempo Máximo</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Atrasos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productDelays?.map((product, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{product.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.categoryName}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={product.avgPrepTime > 20 ? 'text-destructive font-medium' : ''}>
                            {formatMinutes(product.avgPrepTime)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatMinutes(product.maxPrepTime)}</TableCell>
                        <TableCell className="text-right">{product.orderCount}</TableCell>
                        <TableCell className="text-right">
                          {getDelayBadge(product.delayPercentage)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!productDelays || productDelays.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum dado de produto disponível
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Entregadores Tab */}
          <TabsContent value="entregadores" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Performance dos Entregadores
                </CardTitle>
                <CardDescription>Tempo médio de entrega por entregador</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entregador</TableHead>
                      <TableHead className="text-right">Tempo Médio</TableHead>
                      <TableHead className="text-right">Tempo Máximo</TableHead>
                      <TableHead className="text-right">Entregas</TableHead>
                      <TableHead className="text-right">Atrasadas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delivererDelays?.map((deliverer) => (
                      <TableRow key={deliverer.id}>
                        <TableCell className="font-medium">{deliverer.name}</TableCell>
                        <TableCell className="text-right">
                          <span className={deliverer.avgDeliveryTime > 30 ? 'text-destructive font-medium' : ''}>
                            {formatMinutes(deliverer.avgDeliveryTime)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatMinutes(deliverer.maxDeliveryTime)}</TableCell>
                        <TableCell className="text-right">{deliverer.deliveryCount}</TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={deliverer.delayedCount > 0 ? 'destructive' : 'default'}
                            className={deliverer.delayedCount === 0 ? 'bg-green-500' : ''}
                          >
                            {deliverer.delayedCount}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!delivererDelays || delivererDelays.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum dado de entregador disponível
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Por Horário Tab */}
          <TabsContent value="horarios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Detalhamento por Hora
                </CardTitle>
                <CardDescription>Quantidade de pedidos e atrasos por hora do dia</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Horário</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Tempo Médio Total</TableHead>
                      <TableHead className="text-right">Atrasados</TableHead>
                      <TableHead className="text-right">% Atraso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hourlyDelays?.map((hour) => {
                      const delayPct = hour.orderCount > 0 ? Math.round((hour.delayedCount / hour.orderCount) * 100) : 0;
                      return (
                        <TableRow key={hour.hour}>
                          <TableCell className="font-medium">{hour.hour}:00 - {hour.hour}:59</TableCell>
                          <TableCell className="text-right">{hour.orderCount}</TableCell>
                          <TableCell className="text-right">{formatMinutes(hour.avgTotal)}</TableCell>
                          <TableCell className="text-right">{hour.delayedCount}</TableCell>
                          <TableCell className="text-right">
                            {getDelayBadge(delayPct)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!hourlyDelays || hourlyDelays.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum dado por horário disponível
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pedidos Tab */}
          <TabsContent value="pedidos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Últimos Pedidos com Tempos
                </CardTitle>
                <CardDescription>Detalhamento dos tempos de cada pedido</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead className="text-right">Aceite</TableHead>
                      <TableHead className="text-right">Preparo</TableHead>
                      <TableHead className="text-right">Expedição</TableHead>
                      <TableHead className="text-right">Entrega</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderTimings?.slice(0, 50).map((order) => (
                      <TableRow key={order.orderId}>
                        <TableCell className="font-mono">#{order.orderNumber}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{order.customerName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.channel}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={(order.acceptTime || 0) > 5 ? 'text-yellow-500' : ''}>
                            {formatMinutes(order.acceptTime)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={(order.prepTime || 0) > 20 ? 'text-destructive' : ''}>
                            {formatMinutes(order.prepTime)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={(order.expeditionTime || 0) > 10 ? 'text-yellow-500' : ''}>
                            {formatMinutes(order.expeditionTime)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={(order.deliveryTime || 0) > 30 ? 'text-destructive' : ''}>
                            {formatMinutes(order.deliveryTime)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={(order.totalTime || 0) > 45 ? 'text-destructive' : 'text-green-500'}>
                            {formatMinutes(order.totalTime)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={order.status === 'entregue' ? 'default' : 'secondary'}
                            className={order.status === 'entregue' ? 'bg-green-500' : ''}
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!orderTimings || orderTimings.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          Nenhum pedido encontrado no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
