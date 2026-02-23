import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend 
} from 'recharts';
import { 
  FileText, 
  Receipt, 
  TrendingUp, 
  DollarSign, 
  Download,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

interface SalesData {
  date: string;
  total_gerencial: number;
  total_fiscal_nfce: number;
  total_fiscal_nfe: number;
  count_gerencial: number;
  count_fiscal_nfce: number;
  count_fiscal_nfe: number;
}

export function FiscalSalesReport() {
  const { data: company } = useCompany();
  const [period, setPeriod] = useState<'7d' | '30d' | 'month' | 'last_month'>('30d');

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case '7d':
        return { start: subDays(now, 7), end: now };
      case '30d':
        return { start: subDays(now, 30), end: now };
      case 'month':
        return { start: startOfMonth(now), end: now };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const dateRange = getDateRange();

  // Fetch gerencial (all orders)
  const { data: gerencialData = [], isLoading: isLoadingGerencial } = useQuery({
    queryKey: ['fiscal-report-gerencial', company?.id, period],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, created_at, status')
        .eq('company_id', company.id)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .eq('status', 'entregue');
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  // Fetch fiscal (NFC-e and NF-e)
  const { data: fiscalData = [], isLoading: isLoadingFiscal } = useQuery({
    queryKey: ['fiscal-report-fiscal', company?.id, period],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('fiscal_documents')
        .select('id, document_type, total_cents, created_at, status')
        .eq('company_id', company.id)
        .eq('status', 'authorized')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  // Process data for charts
  const processedData = (): SalesData[] => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      const dayGerencial = gerencialData.filter(
        (o) => format(new Date(o.created_at), 'yyyy-MM-dd') === dayStr
      );
      const dayFiscalNFCe = fiscalData.filter(
        (d) => format(new Date(d.created_at), 'yyyy-MM-dd') === dayStr && d.document_type === 'nfce'
      );
      const dayFiscalNFe = fiscalData.filter(
        (d) => format(new Date(d.created_at), 'yyyy-MM-dd') === dayStr && d.document_type === 'nfe'
      );

      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        total_gerencial: dayGerencial.reduce((sum, o) => sum + (o.total || 0), 0) / 100,
        total_fiscal_nfce: dayFiscalNFCe.reduce((sum, d) => sum + (d.total_cents || 0), 0) / 100,
        total_fiscal_nfe: dayFiscalNFe.reduce((sum, d) => sum + (d.total_cents || 0), 0) / 100,
        count_gerencial: dayGerencial.length,
        count_fiscal_nfce: dayFiscalNFCe.length,
        count_fiscal_nfe: dayFiscalNFe.length,
      };
    });
  };

  const chartData = processedData();

  // Totals
  const totalGerencial = gerencialData.reduce((sum, o) => sum + (o.total || 0), 0) / 100;
  const totalFiscalNFCe = fiscalData.filter((d) => d.document_type === 'nfce').reduce((sum, d) => sum + (d.total_cents || 0), 0) / 100;
  const totalFiscalNFe = fiscalData.filter((d) => d.document_type === 'nfe').reduce((sum, d) => sum + (d.total_cents || 0), 0) / 100;
  const totalFiscal = totalFiscalNFCe + totalFiscalNFe;
  const cobertura = totalGerencial > 0 ? ((totalFiscal / totalGerencial) * 100).toFixed(1) : '0';

  // Pie chart data
  const pieData = [
    { name: 'NFC-e', value: totalFiscalNFCe },
    { name: 'NF-e', value: totalFiscalNFe },
    { name: 'Sem Fiscal', value: Math.max(0, totalGerencial - totalFiscal) },
  ];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const isLoading = isLoadingGerencial || isLoadingFiscal;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Relatório de Vendas</h2>
          <p className="text-sm text-muted-foreground">Comparativo gerencial vs fiscal</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="last_month">Mês passado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendas Gerencial</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalGerencial)}</div>
            <p className="text-xs text-muted-foreground">{gerencialData.length} vendas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NFC-e Emitidas</CardTitle>
            <Receipt className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalFiscalNFCe)}</div>
            <p className="text-xs text-muted-foreground">
              {fiscalData.filter((d) => d.document_type === 'nfce').length} cupons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NF-e Emitidas</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalFiscalNFe)}</div>
            <p className="text-xs text-muted-foreground">
              {fiscalData.filter((d) => d.document_type === 'nfe').length} notas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cobertura Fiscal</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cobertura}%</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalGerencial - totalFiscal)} sem fiscal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bar Chart - Daily comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Dia</CardTitle>
            <CardDescription>Comparativo gerencial vs fiscal</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="total_gerencial" name="Gerencial" fill="#94a3b8" />
                  <Bar dataKey="total_fiscal_nfce" name="NFC-e" fill="#10b981" />
                  <Bar dataKey="total_fiscal_nfe" name="NF-e" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição Fiscal</CardTitle>
            <CardDescription>Proporção de vendas fiscalizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <Tabs defaultValue="fiscal">
        <TabsList>
          <TabsTrigger value="fiscal">Vendas Fiscais</TabsTrigger>
          <TabsTrigger value="gerencial">Vendas Gerenciais</TabsTrigger>
          <TabsTrigger value="pending">Pendentes de Fiscal</TabsTrigger>
        </TabsList>

        <TabsContent value="fiscal" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documentos Fiscais Emitidos</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fiscalData.slice(0, 10).map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Badge variant={doc.document_type === 'nfce' ? 'default' : 'secondary'}>
                          {doc.document_type === 'nfce' ? 'NFC-e' : 'NF-e'}
                        </Badge>
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{formatCurrency(doc.total_cents / 100)}</TableCell>
                      <TableCell>
                        {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-500">Autorizado</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gerencial" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Todas as Vendas (Gerencial)</CardTitle>
                <Button variant="outline" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Fiscal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gerencialData.slice(0, 10).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>#{order.id.slice(0, 8)}</TableCell>
                      <TableCell>{formatCurrency(order.total / 100)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Verificar</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendas sem Documento Fiscal</CardTitle>
              <CardDescription>
                Vendas finalizadas que não possuem NFC-e ou NF-e vinculada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Análise de vendas sem fiscal em desenvolvimento</p>
                <p className="text-sm">Este recurso cruzará pedidos com documentos fiscais</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
