import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  useRevenueTrend, 
  useSalesByCategory, 
  usePeakHoursAnalysis, 
  useCustomerRetention,
  useCohortAnalysis
} from '@/hooks/useBIAdvanced';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, AreaChart, Area, Legend,
  PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Clock, Users, DollarSign, 
  Target, ArrowUp, ArrowDown, Minus, Activity, Calendar,
  BarChart3, PieChart as PieIcon, LineChart as LineIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899'];

export default function BIAdvanced() {
  const [days, setDays] = useState(30);
  
  const { data: revenueTrend, isLoading: revenueLoading } = useRevenueTrend(days);
  const { data: categoryData, isLoading: categoryLoading } = useSalesByCategory(days);
  const { data: peakHoursData, isLoading: peakLoading } = usePeakHoursAnalysis(days);
  const peakHours = peakHoursData && !Array.isArray(peakHoursData) ? peakHoursData : null;
  const { data: retention, isLoading: retentionLoading } = useCustomerRetention(days * 3);
  const { data: cohorts, isLoading: cohortsLoading } = useCohortAnalysis();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const isLoading = revenueLoading || categoryLoading || peakLoading || retentionLoading || cohortsLoading;

  if (isLoading) {
    return (
      <DashboardLayout title="BI Avançado">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="BI Avançado">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Business Intelligence Avançado</h1>
            <p className="text-muted-foreground">Análises preditivas e insights estratégicos</p>
          </div>
          <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="14">Últimos 14 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPIs with Trend */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-2 border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Média/Dia</p>
                  <p className="text-2xl font-bold">{formatCurrency(revenueTrend?.avgRevenue || 0)}</p>
                  {revenueTrend?.trend && (
                    <div className={`flex items-center gap-1 text-sm mt-1 ${revenueTrend.trend === 'up' ? 'text-green-400' : revenueTrend.trend === 'down' ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {revenueTrend.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : revenueTrend.trend === 'down' ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {Math.abs(revenueTrend.trendPercent).toFixed(1)}% tendência
                    </div>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${revenueTrend?.trend === 'up' ? 'bg-green-500/20' : revenueTrend?.trend === 'down' ? 'bg-red-500/20' : 'bg-muted'}`}>
                  {revenueTrend?.trend === 'up' ? <TrendingUp className="w-6 h-6 text-green-400" /> : revenueTrend?.trend === 'down' ? <TrendingDown className="w-6 h-6 text-red-400" /> : <Activity className="w-6 h-6" />}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Retenção</p>
                  <p className="text-2xl font-bold">{(retention?.retentionRate || 0).toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">{retention?.retainedCustomers || 0} clientes retidos</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Horário de Pico</p>
                  <p className="text-2xl font-bold">{peakHours?.busiest?.label || '-'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{peakHours?.busiest?.orders || 0} pedidos nesse horário</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <Clock className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Novos Clientes</p>
                  <p className="text-2xl font-bold">{retention?.newCustomers || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Churn: {(retention?.churnRate || 0).toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/20">
                  <Target className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="forecast" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forecast" className="gap-2"><LineIcon className="w-4 h-4" /> Previsão</TabsTrigger>
            <TabsTrigger value="categories" className="gap-2"><PieIcon className="w-4 h-4" /> Categorias</TabsTrigger>
            <TabsTrigger value="hours" className="gap-2"><Clock className="w-4 h-4" /> Horários</TabsTrigger>
            <TabsTrigger value="cohorts" className="gap-2"><Users className="w-4 h-4" /> Cohorts</TabsTrigger>
          </TabsList>

          {/* Forecast Tab */}
          <TabsContent value="forecast">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Tendência e Previsão de Receita
                </CardTitle>
                <CardDescription>Histórico com previsão para os próximos 7 dias</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueTrend && (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={[
                      ...revenueTrend.historical.map(d => ({ ...d, type: 'historical' })),
                      ...revenueTrend.predictions.map(d => ({ date: d.date, revenue: d.predicted, type: 'prediction', lower: d.lower, upper: d.upper }))
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#888" tickFormatter={(v) => format(new Date(v), 'dd/MM')} />
                      <YAxis stroke="#888" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? 'Receita' : 'Previsão']}
                        labelFormatter={(label) => format(new Date(label), "dd 'de' MMMM", { locale: ptBR })}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      />
                      <Area type="monotone" dataKey="lower" stroke="transparent" fill="#3b82f6" fillOpacity={0.1} />
                      <Area type="monotone" dataKey="upper" stroke="transparent" fill="#3b82f6" fillOpacity={0.1} />
                      <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Histórico</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500/50" />
                    <span>Previsão (intervalo de confiança)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Vendas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryData && categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="revenue"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Sem dados suficientes
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ranking de Categorias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryData?.slice(0, 6).map((cat, index) => (
                      <div key={cat.name} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: COLORS[index % COLORS.length] + '30', color: COLORS[index % COLORS.length] }}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{cat.name}</span>
                            <span className="font-bold">{formatCurrency(cat.revenue)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {cat.quantity} itens vendidos • {cat.products} produtos
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Hours Tab */}
          <TabsContent value="hours">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Análise de Horários
                </CardTitle>
                <CardDescription>Volume de pedidos por hora do dia</CardDescription>
              </CardHeader>
              <CardContent>
                {peakHours && (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={peakHours.hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="label" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip 
                          formatter={(value: number, name: string) => [value, name === 'orders' ? 'Pedidos' : 'Receita']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        />
                        <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                          {peakHours.hourlyData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={peakHours.peakHours.includes(entry.hour) ? '#22c55e' : '#3b82f6'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span>Normal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Horário de Pico</span>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm">
                        <strong>Insight:</strong> Seus horários de pico são {peakHours.peakHours.map(h => `${h}:00`).join(', ')}. 
                        Considere reforçar a equipe nesses horários.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cohorts Tab */}
          <TabsContent value="cohorts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Análise de Cohorts
                </CardTitle>
                <CardDescription>Comportamento de clientes por mês de aquisição</CardDescription>
              </CardHeader>
              <CardContent>
                {cohorts && cohorts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3">Cohort</th>
                          <th className="text-center py-2 px-3">Clientes</th>
                          {[0, 1, 2, 3, 4, 5].map(month => (
                            <th key={month} className="text-center py-2 px-3">Mês {month}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cohorts.map((cohort) => (
                          <tr key={cohort.cohort} className="border-b">
                            <td className="py-2 px-3 font-medium">{format(new Date(cohort.cohort + '-01'), 'MMM yyyy', { locale: ptBR })}</td>
                            <td className="text-center py-2 px-3">{cohort.customers}</td>
                            {[0, 1, 2, 3, 4, 5].map(month => {
                              const revenue = cohort.revenue[month] || 0;
                              const maxRevenue = Math.max(...Object.values(cohort.revenue).map(Number));
                              const intensity = maxRevenue > 0 ? revenue / maxRevenue : 0;
                              return (
                                <td key={month} className="text-center py-2 px-3">
                                  <div 
                                    className="px-2 py-1 rounded text-xs"
                                    style={{ 
                                      backgroundColor: intensity > 0 ? `rgba(34, 197, 94, ${intensity * 0.5})` : 'transparent',
                                      color: intensity > 0.3 ? 'white' : 'inherit'
                                    }}
                                  >
                                    {revenue > 0 ? formatCurrency(revenue) : '-'}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Dados insuficientes para análise de cohorts
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
