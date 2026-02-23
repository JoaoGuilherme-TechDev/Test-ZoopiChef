import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, Package, Clock, Users, DollarSign, ShoppingBag, PieChartIcon, BarChart3, AlertTriangle, Percent, Download, CalendarSearch } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExportButton } from '@/components/export/ExportButton';
import { formatCurrencyExport, formatDateExport } from '@/utils/exportUtils';
import { Button } from '@/components/ui/button';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--info))', '#8884d8', '#82ca9d', '#ffc658'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'hsl(var(--warning))',
  confirmed: 'hsl(var(--info))',
  preparing: 'hsl(var(--accent))',
  ready: 'hsl(var(--success))',
  delivered: 'hsl(var(--primary))',
  cancelled: 'hsl(var(--destructive))',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const CHANNEL_LABELS: Record<string, string> = {
  delivery: 'Delivery',
  balcao: 'Balcão',
  mesa: 'Mesa',
  totem: 'Totem',
  whatsapp: 'WhatsApp',
};

export default function Reports() {
  const navigate = useNavigate();
  const { data: company } = useCompany();
  const [period, setPeriod] = useState('7');

  // Sales by day
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['reports-sales', company?.id, period],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const startDate = startOfDay(subDays(new Date(), parseInt(period)));
      
      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at, status')
        .eq('company_id', company.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const grouped: Record<string, { date: string; total: number; count: number }> = {};
      data?.forEach((order) => {
        const day = format(new Date(order.created_at), 'dd/MM', { locale: ptBR });
        if (!grouped[day]) {
          grouped[day] = { date: day, total: 0, count: 0 };
        }
        grouped[day].total += order.total;
        grouped[day].count += 1;
      });
      
      return Object.values(grouped);
    },
    enabled: !!company?.id,
  });

  // Top products
  const { data: topProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['reports-top-products', company?.id, period],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const startDate = startOfDay(subDays(new Date(), parseInt(period)));
      
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          product_name,
          quantity,
          unit_price,
          order:orders!inner(company_id, created_at)
        `)
        .eq('order.company_id', company.id)
        .gte('order.created_at', startDate.toISOString());
      
      if (error) throw error;
      
      const grouped: Record<string, { name: string; quantity: number; revenue: number }> = {};
      data?.forEach((item: any) => {
        const name = item.product_name;
        if (!grouped[name]) {
          grouped[name] = { name, quantity: 0, revenue: 0 };
        }
        grouped[name].quantity += item.quantity;
        grouped[name].revenue += item.quantity * item.unit_price;
      });
      
      return Object.values(grouped)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    },
    enabled: !!company?.id,
  });

  // Hourly data
  const { data: hourlyData, isLoading: loadingHourly } = useQuery({
    queryKey: ['reports-hourly', company?.id, period],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const startDate = startOfDay(subDays(new Date(), parseInt(period)));
      
      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total')
        .eq('company_id', company.id)
        .gte('created_at', startDate.toISOString());
      
      if (error) throw error;
      
      const hourly: Record<string, { hour: string; count: number; total: number }> = {};
      for (let i = 0; i < 24; i++) {
        const hour = `${i.toString().padStart(2, '0')}:00`;
        hourly[hour] = { hour, count: 0, total: 0 };
      }
      
      data?.forEach((order) => {
        const hour = format(new Date(order.created_at), 'HH:00');
        if (hourly[hour]) {
          hourly[hour].count += 1;
          hourly[hour].total += order.total;
        }
      });
      
      return Object.values(hourly);
    },
    enabled: !!company?.id,
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['reports-stats', company?.id, period],
    queryFn: async () => {
      if (!company?.id) return null;
      
      const startDate = startOfDay(subDays(new Date(), parseInt(period)));
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, status, customer_id')
        .eq('company_id', company.id)
        .gte('created_at', startDate.toISOString());
      
      if (error) throw error;
      
      const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0;
      const totalOrders = orders?.length || 0;
      const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const uniqueCustomers = new Set(orders?.map(o => o.customer_id).filter(Boolean)).size;
      const cancelledStatuses = ['cancelled', 'cancelado'];
      const cancelledOrders = orders?.filter(o => cancelledStatuses.includes(o.status?.toLowerCase() || '')) .length || 0;
      const cancelRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
      
      return {
        totalRevenue,
        totalOrders,
        avgTicket,
        uniqueCustomers,
        cancelledOrders,
        cancelRate,
      };
    },
    enabled: !!company?.id,
  });

  // Category participation (Pizza chart)
  const { data: categoryData } = useQuery({
    queryKey: ['reports-categories', company?.id, period],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const startDate = startOfDay(subDays(new Date(), parseInt(period)));
      
      const { data: items, error } = await supabase
        .from('order_items')
        .select(`
          product_name,
          quantity,
          unit_price,
          product_id,
          order:orders!inner(company_id, created_at)
        `)
        .eq('order.company_id', company.id)
        .gte('order.created_at', startDate.toISOString());
      
      if (error) throw error;

      // Get products with categories
      const productIds = [...new Set(items?.map((i: any) => i.product_id).filter(Boolean))];
      
      if (productIds.length === 0) return [];
      
      const { data: products } = await supabase
        .from('products')
        .select(`
          id,
          subcategory:subcategories(
            category:categories(id, name)
          )
        `)
        .in('id', productIds);
      
      const productCategoryMap: Record<string, string> = {};
      products?.forEach((p: any) => {
        productCategoryMap[p.id] = p.subcategory?.category?.name || 'Sem categoria';
      });
      
      const categoryTotals: Record<string, number> = {};
      items?.forEach((item: any) => {
        const category = productCategoryMap[item.product_id] || 'Sem categoria';
        const revenue = item.quantity * item.unit_price;
        categoryTotals[category] = (categoryTotals[category] || 0) + revenue;
      });
      
      const total = Object.values(categoryTotals).reduce((sum, v) => sum + v, 0);
      
      return Object.entries(categoryTotals).map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
      }));
    },
    enabled: !!company?.id,
  });

  // Status by channel (Torre/Stacked bar)
  const { data: channelStatusData } = useQuery({
    queryKey: ['reports-channel-status', company?.id, period],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const startDate = startOfDay(subDays(new Date(), parseInt(period)));
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('status, order_type, total')
        .eq('company_id', company.id)
        .gte('created_at', startDate.toISOString());
      
      if (error) throw error;
      
      const channelData: Record<string, Record<string, number>> = {};
      
      orders?.forEach((order: any) => {
        const channel = order.order_type || 'delivery';
        const status = order.status || 'pending';
        
        if (!channelData[channel]) {
          channelData[channel] = {};
        }
        channelData[channel][status] = (channelData[channel][status] || 0) + 1;
      });
      
      return Object.entries(channelData).map(([channel, statuses]) => ({
        channel: CHANNEL_LABELS[channel] || channel,
        ...statuses,
      }));
    },
    enabled: !!company?.id,
  });

  const isLoading = loadingSales || loadingProducts || loadingHourly;
  const allStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

  return (
    <DashboardLayout title="BI - Business Intelligence">
      <div className="space-y-6">
        {/* Header com filtro */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold">BI - Relatórios Avançados</h2>
            <p className="text-muted-foreground">Análise detalhada para tomada de decisão</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/reports/sales-by-period')}
              className="gap-2"
            >
              <CalendarSearch className="w-4 h-4" />
              Vendas por Período
            </Button>
            <ExportButton
              data={salesData?.map(d => ({
                data: d.date,
                total: d.total,
                quantidade: d.count,
              })) || []}
              columns={[
                { key: 'data', label: 'Data' },
                { key: 'total', label: 'Total', format: formatCurrencyExport },
                { key: 'quantidade', label: 'Quantidade' },
              ]}
              filename={`relatorio-vendas-${period}dias`}
              title={`Relatório de Vendas - Últimos ${period} dias`}
            />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="15">Últimos 15 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento</p>
                  <p className="text-2xl font-bold">
                    R$ {stats?.totalRevenue.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <ShoppingBag className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Pedidos</p>
                  <p className="text-2xl font-bold">{stats?.totalOrders || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold">
                    R$ {stats?.avgTicket.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-info/10">
                  <Users className="w-6 h-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clientes Únicos</p>
                  <p className="text-2xl font-bold">{stats?.uniqueCustomers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cancelados</p>
                  <p className="text-2xl font-bold">{stats?.cancelledOrders || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Percent className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Cancelamento</p>
                  <p className="text-2xl font-bold">{stats?.cancelRate.toFixed(1) || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="pizza">Pizza (Categorias)</TabsTrigger>
            <TabsTrigger value="torre">Torre (Status/Canal)</TabsTrigger>
            <TabsTrigger value="sales">Vendas por Dia</TabsTrigger>
            <TabsTrigger value="products">Produtos Top</TabsTrigger>
            <TabsTrigger value="hourly">Horários de Pico</TabsTrigger>
          </TabsList>

          {/* Overview tab with summary charts */}
          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5" />
                    Participação por Categoria
                  </CardTitle>
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
                          label={({ name, percentage }) => `${name} (${percentage}%)`}
                          outerRadius={100}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                        >
                          {categoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
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
                    <BarChart3 className="w-5 h-5" />
                    Pedidos por Canal e Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {channelStatusData && channelStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={channelStatusData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                        <YAxis type="category" dataKey="channel" stroke="hsl(var(--muted-foreground))" width={80} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        {allStatuses.map((status) => (
                          <Bar
                            key={status}
                            dataKey={status}
                            stackId="a"
                            fill={STATUS_COLORS[status]}
                            name={STATUS_LABELS[status]}
                          />
                        ))}
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

          {/* Pizza tab */}
          <TabsContent value="pizza">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Participação por Categoria (Pizza)
                </CardTitle>
                <CardDescription>Distribuição de receita por categoria de produto</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData && categoryData.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-8">
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name} (${percentage}%)`}
                          outerRadius={150}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                        >
                          {categoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold">Detalhamento</h4>
                      {categoryData.map((cat, index) => (
                        <div key={cat.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                            />
                            <span className="font-medium">{cat.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">R$ {cat.value.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">{cat.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    Sem dados no período
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Torre tab */}
          <TabsContent value="torre">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Torre - Status por Canal (Barras Empilhadas)
                </CardTitle>
                <CardDescription>Distribuição de pedidos por canal e status</CardDescription>
              </CardHeader>
              <CardContent>
                {channelStatusData && channelStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={channelStatusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="channel" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      {allStatuses.map((status) => (
                        <Bar
                          key={status}
                          dataKey={status}
                          stackId="a"
                          fill={STATUS_COLORS[status]}
                          name={STATUS_LABELS[status]}
                          radius={status === 'cancelled' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    Sem dados no período
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Vendas por Dia
                </CardTitle>
                <CardDescription>Evolução das vendas no período selecionado</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Faturamento"
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--accent))" 
                        strokeWidth={2}
                        name="Pedidos"
                        dot={{ fill: 'hsl(var(--accent))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Produtos Mais Vendidos
                </CardTitle>
                <CardDescription>Top 10 produtos por quantidade vendida</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))" 
                        width={150}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Quantidade" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hourly">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Horários de Pico
                </CardTitle>
                <CardDescription>Distribuição de pedidos por hora do dia</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Pedidos" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
