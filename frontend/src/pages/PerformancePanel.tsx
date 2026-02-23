import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { usePerformancePanel } from '@/hooks/usePerformancePanel';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  ShoppingBag, DollarSign, TrendingUp, Users, Truck, Store, 
  MapPin, CreditCard, Package, CalendarIcon, Tag
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PerformanceDetailModal } from '@/components/performance/PerformanceDetailModal';

// Tipos para modais
type ModalType = 'modality' | 'channel' | 'neighborhoods' | 'cities' | 'payments' | 'customers' | 'categories' | 'products' | null;

// Cores vibrantes para os gráficos
const CHART_COLORS = [
  '#22c55e', // Verde
  '#3b82f6', // Azul
  '#a855f7', // Roxo
  '#06b6d4', // Ciano
  '#f59e0b', // Âmbar
  '#ec4899', // Rosa
  '#f97316', // Laranja
  '#14b8a6', // Teal
];

const PIE_COLORS = ['#22c55e', '#3b82f6', '#a855f7'];

type PeriodType = '7' | '30' | '60' | 'last_month' | '6_months' | 'custom';

// Truncar texto longo
const truncateText = (text: string, maxLength: number = 15) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

export default function PerformancePanel() {
  const [period, setPeriod] = useState<PeriodType>('7');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [openModal, setOpenModal] = useState<ModalType>(null);

  // Calculate date range based on period
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (period) {
      case '7':
        return { startDate: subDays(now, 7), endDate: now };
      case '30':
        return { startDate: subDays(now, 30), endDate: now };
      case '60':
        return { startDate: subDays(now, 60), endDate: now };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
      case '6_months':
        return { startDate: subMonths(now, 6), endDate: now };
      case 'custom':
        return { 
          startDate: customStartDate || subDays(now, 7), 
          endDate: customEndDate || now 
        };
      default:
        return { startDate: subDays(now, 7), endDate: now };
    }
  }, [period, customStartDate, customEndDate]);

  const { 
    mainStats,
    deliveryModality,
    channelSales,
    topNeighborhoods,
    topCities,
    paymentMethods,
    topCustomers,
    topCategories,
    topProducts,
    isLoading 
  } = usePerformancePanel({ startDate, endDate });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const periodLabel = useMemo(() => {
    switch (period) {
      case '7': return 'Últimos 7 dias';
      case '30': return 'Últimos 30 dias';
      case '60': return 'Últimos 60 dias';
      case 'last_month': return 'Mês passado';
      case '6_months': return 'Últimos 6 meses';
      case 'custom': return 'Personalizado';
      default: return 'Últimos 7 dias';
    }
  }, [period]);

  if (isLoading) {
    return (
      <DashboardLayout title="Painel de Desempenho">
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
    <DashboardLayout title="Painel de Desempenho">
      <div className="space-y-6">
        {/* Filter Bar */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">Período:</span>
              </div>
              
              <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
                <SelectTrigger className="w-[200px] bg-background border-primary/30">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="last_month">Mês passado</SelectItem>
                  <SelectItem value="6_months">Últimos 6 meses</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {period === 'custom' && (
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="border-primary/30">
                        {customStartDate ? format(customStartDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data início'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">até</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="border-primary/30">
                        {customEndDate ? format(customEndDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data fim'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="ml-auto text-sm text-muted-foreground">
                {format(startDate, 'dd/MM/yyyy', { locale: ptBR })} - {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent shadow-lg shadow-blue-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-400">Total de vendas realizadas</p>
                  <p className="text-4xl font-bold text-white mt-2">
                    {mainStats?.totalOrders || 0}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/20">
                  <ShoppingBag className="w-8 h-8 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent shadow-lg shadow-green-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-400">Valor total das vendas</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {formatCurrency(mainStats?.totalRevenue || 0)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-green-500/20">
                  <DollarSign className="w-8 h-8 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent shadow-lg shadow-purple-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-400">Ticket médio</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {formatCurrency(mainStats?.avgTicket || 0)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/20">
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent shadow-lg shadow-cyan-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-cyan-400">Novos clientes</p>
                  <p className="text-4xl font-bold text-white mt-2">
                    {mainStats?.newCustomers || 0}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-cyan-500/20">
                  <Users className="w-8 h-8 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pie Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Delivery Modality */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="w-5 h-5 text-primary" />
                Modalidade de Entrega
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setOpenModal('modality')}>Detalhes</Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-primary mb-4">
                Maior participação = {deliveryModality?.topModality} — {formatCurrency(deliveryModality?.topValue || 0)}
              </p>
              {deliveryModality?.data && deliveryModality.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={deliveryModality.data}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ percentage }) => `${percentage}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="transparent"
                    >
                      {deliveryModality.data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales by Channel */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Store className="w-5 h-5 text-primary" />
                Vendas por canal
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setOpenModal('channel')}>Detalhes</Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-primary mb-4">
                Maior participação = {channelSales?.topChannel} — {formatCurrency(channelSales?.topValue || 0)}
              </p>
              {channelSales?.data && channelSales.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={channelSales.data}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ percentage }) => `${percentage}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="transparent"
                    >
                      {channelSales.data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bar Charts Row - Neighborhoods and Cities */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Neighborhoods */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-primary" />
                Melhores bairros
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setOpenModal('neighborhoods')}>Detalhes</Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-primary mb-4">
                Bairro com maior faturamento = {truncateText(topNeighborhoods?.topNeighborhood || '', 20)}, {formatCurrency(topNeighborhoods?.topValue || 0)}
              </p>
              {topNeighborhoods?.data && topNeighborhoods.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    layout="vertical"
                    data={topNeighborhoods.data.slice(0, 8)}
                    margin={{ left: 20, right: 60 }}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10}
                      tickFormatter={(v) => truncateText(v, 12)}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => label}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]}>
                      {topNeighborhoods.data.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Cities */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-primary" />
                Melhores cidades
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setOpenModal('cities')}>Detalhes</Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-primary mb-4">
                Cidade com maior faturamento = {truncateText(topCities?.topCity || '', 20)}, {formatCurrency(topCities?.topValue || 0)}
              </p>
              {topCities?.data && topCities.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    layout="vertical"
                    data={topCities.data.slice(0, 8)}
                    margin={{ left: 20, right: 60 }}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10}
                      tickFormatter={(v) => truncateText(v, 12)}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => label}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]}>
                      {topCities.data.slice(0, 8).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#a855f7' : '#06b6d4'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Methods and Top Customers */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Payment Methods */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="w-5 h-5 text-primary" />
                Formas de pagamento
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setOpenModal('payments')}>Detalhes</Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-primary mb-4">
                Maior = {truncateText(paymentMethods?.topPayment || '', 15)}, {formatCurrency(paymentMethods?.topValue || 0)}
              </p>
              {paymentMethods?.data && paymentMethods.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    layout="vertical"
                    data={paymentMethods.data.slice(0, 6)}
                    margin={{ left: 20, right: 40 }}
                    barSize={22}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={90} 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10}
                      tickFormatter={(v) => truncateText(v, 10)}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Valor']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                      {paymentMethods.data.slice(0, 6).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" />
                Top 10 clientes
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setOpenModal('customers')}>Detalhes</Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-primary mb-4">
                Maior = {truncateText(topCustomers?.topCustomer || '', 15)}, {formatCurrency(topCustomers?.topValue || 0)}
              </p>
              {topCustomers?.data && topCustomers.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    layout="vertical"
                    data={topCustomers.data.slice(0, 8)}
                    margin={{ left: 20, right: 40 }}
                    barSize={22}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={90} 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10}
                      tickFormatter={(v) => truncateText(v, 10)}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => label}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]}>
                      {topCustomers.data.slice(0, 8).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Categories and Products */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Categories */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tag className="w-5 h-5 text-primary" />
                Top categorias
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setOpenModal('categories')}>Detalhes</Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-primary mb-4">
                Maior = {truncateText(topCategories?.topCategory || '', 15)}, {formatCurrency(topCategories?.topValue || 0)}
              </p>
              {topCategories?.data && topCategories.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    layout="vertical"
                    data={topCategories.data.slice(0, 10)}
                    margin={{ left: 20, right: 50 }}
                    barSize={18}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={9}
                      tickFormatter={(v) => truncateText(v, 12)}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => label}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]}>
                      {topCategories.data.slice(0, 10).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#93c5fd'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="w-5 h-5 text-primary" />
                Top produtos
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setOpenModal('products')}>Detalhes</Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-primary mb-4">
                Maior = {truncateText(topProducts?.topProduct || '', 15)}, {formatCurrency(topProducts?.topValue || 0)}
              </p>
              {topProducts?.data && topProducts.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    layout="vertical"
                    data={topProducts.data.slice(0, 10)}
                    margin={{ left: 20, right: 50 }}
                    barSize={18}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={9}
                      tickFormatter={(v) => truncateText(v, 12)}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => label}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]}>
                      {topProducts.data.slice(0, 10).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#93c5fd'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modais de detalhes */}
        <PerformanceDetailModal
          open={openModal === 'modality'}
          onOpenChange={(open) => !open && setOpenModal(null)}
          title="Modalidade de Entrega - Detalhes"
          data={deliveryModality?.data || []}
          showPercentage
        />
        <PerformanceDetailModal
          open={openModal === 'channel'}
          onOpenChange={(open) => !open && setOpenModal(null)}
          title="Vendas por Canal - Detalhes"
          data={channelSales?.data || []}
          showPercentage
        />
        <PerformanceDetailModal
          open={openModal === 'neighborhoods'}
          onOpenChange={(open) => !open && setOpenModal(null)}
          title="Melhores Bairros - Detalhes"
          data={topNeighborhoods?.data || []}
          showCount
        />
        <PerformanceDetailModal
          open={openModal === 'cities'}
          onOpenChange={(open) => !open && setOpenModal(null)}
          title="Melhores Cidades - Detalhes"
          data={topCities?.data || []}
          showCount
        />
        <PerformanceDetailModal
          open={openModal === 'payments'}
          onOpenChange={(open) => !open && setOpenModal(null)}
          title="Formas de Pagamento - Detalhes"
          data={paymentMethods?.data || []}
          showPercentage
        />
        <PerformanceDetailModal
          open={openModal === 'customers'}
          onOpenChange={(open) => !open && setOpenModal(null)}
          title="Top Clientes - Detalhes"
          data={topCustomers?.data || []}
          showCount
        />
        <PerformanceDetailModal
          open={openModal === 'categories'}
          onOpenChange={(open) => !open && setOpenModal(null)}
          title="Top Categorias - Detalhes"
          data={topCategories?.data || []}
          showCount
        />
        <PerformanceDetailModal
          open={openModal === 'products'}
          onOpenChange={(open) => !open && setOpenModal(null)}
          title="Top Produtos - Detalhes"
          data={topProducts?.data || []}
          showCount
        />
      </div>
    </DashboardLayout>
  );
}
