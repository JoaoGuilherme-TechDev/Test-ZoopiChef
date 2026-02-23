import { useState } from "react";
import { useERPCashFlow } from "../hooks";
import { ERPStatsCard, ERPDataTable } from "../components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Bar,
} from "recharts";
import { ExportDropdown } from "@/components/export/ExportDropdown";
import { SkeletonKPIGrid, SkeletonChart, SkeletonTable } from "@/components/ui/skeleton-table";

export function ERPCashFlowPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useERPCashFlow(days);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const formatCurrencyCompact = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
    }).format(value);

  const formatDate = (date: string) =>
    format(new Date(date), "dd/MM/yyyy", { locale: ptBR });

  const formatDateShort = (date: string) =>
    format(new Date(date), "dd/MM", { locale: ptBR });

  // Calcular totais
  const totalInflows = data?.reduce((sum, d) => sum + d.receivables, 0) || 0;
  const totalOutflows = data?.reduce((sum, d) => sum + d.payables, 0) || 0;
  const netFlow = totalInflows - totalOutflows;
  const projectedBalance = data?.[data.length - 1]?.cumulative_balance || 0;

  // Identificar dias críticos (saldo negativo)
  const criticalDays = data?.filter((d) => d.cumulative_balance < 0) || [];

  // Preparar dados para gráfico
  const chartData =
    data?.map((d) => ({
      ...d,
      dateLabel: formatDateShort(d.date),
    })) || [];

  // Export configuration
  const exportData = (data || []).map(d => ({
    data: formatDate(d.date),
    entradas: d.receivables,
    saidas: d.payables,
    fluxo_liquido: d.net_flow,
    saldo_acumulado: d.cumulative_balance,
  }));

  const exportColumns = [
    { key: 'data', label: 'Data' },
    { key: 'entradas', label: 'Entradas', format: (v: number) => formatCurrency(v) },
    { key: 'saidas', label: 'Saídas', format: (v: number) => formatCurrency(v) },
    { key: 'fluxo_liquido', label: 'Fluxo Líquido', format: (v: number) => formatCurrency(v) },
    { key: 'saldo_acumulado', label: 'Saldo Acumulado', format: (v: number) => formatCurrency(v) },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Fluxo de Caixa">
        <div className="space-y-6 animate-in fade-in duration-500">
          <SkeletonKPIGrid count={4} />
          <SkeletonChart height={300} />
          <SkeletonTable rows={10} columns={5} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Fluxo de Caixa">
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header com filtro de período */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Projeção de Fluxo de Caixa</h2>
            <p className="text-muted-foreground">
              Visualize entradas e saídas futuras
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
            <ExportDropdown
              data={exportData}
              columns={exportColumns}
              filename="fluxo-caixa"
              title={`Fluxo de Caixa - Próximos ${days} dias`}
              disabled={(data || []).length === 0}
            />
          </div>
        </div>

        {/* Alerta de dias críticos */}
        {criticalDays.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção: Saldo Negativo Previsto</AlertTitle>
            <AlertDescription>
              O saldo ficará negativo em {criticalDays.length} dia(s):
              {criticalDays
                .slice(0, 5)
                .map((d) => ` ${formatDate(d.date)}`)
                .join(",")}
              {criticalDays.length > 5 && " ..."}
            </AlertDescription>
          </Alert>
        )}

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ERPStatsCard
            title="Entradas Previstas"
            value={formatCurrency(totalInflows)}
            icon={ArrowDownCircle}
            className="bg-green-500/10"
          />
          <ERPStatsCard
            title="Saídas Previstas"
            value={formatCurrency(totalOutflows)}
            icon={ArrowUpCircle}
            className="bg-red-500/10"
          />
          <ERPStatsCard
            title="Saldo Líquido"
            value={formatCurrency(netFlow)}
            icon={Wallet}
            className={netFlow >= 0 ? "bg-green-500/10" : "bg-red-500/10"}
          />
          <ERPStatsCard
            title="Saldo Projetado Final"
            value={formatCurrency(projectedBalance)}
            subtitle={`Em ${days} dias`}
            icon={TrendingUp}
            className={projectedBalance < 0 ? "border-destructive" : ""}
          />
        </div>

        {/* Gráficos em Tabs */}
        <Tabs defaultValue="balance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="balance">Saldo Projetado</TabsTrigger>
            <TabsTrigger value="flow">Fluxo Diário</TabsTrigger>
          </TabsList>

          <TabsContent value="balance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Evolução do Saldo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--chart-2))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--chart-2))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tickFormatter={formatCurrencyCompact} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Legend />
                    <ReferenceLine
                      y={0}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="3 3"
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative_balance"
                      name="Saldo Projetado"
                      stroke="hsl(var(--chart-2))"
                      fill="url(#colorBalance)"
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flow">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Recebimentos vs Pagamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tickFormatter={formatCurrencyCompact} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Legend />
                    <Bar
                      dataKey="receivables"
                      name="Recebimentos"
                      fill="hsl(var(--chart-2))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="payables"
                      name="Pagamentos"
                      fill="hsl(var(--chart-1))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="net_flow"
                      name="Fluxo Líquido"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Tabela detalhada */}
        <Card>
          <CardHeader>
            <CardTitle>Projeção Diária - Próximos {days} dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ERPDataTable
              columns={[
                {
                  key: "date",
                  header: "Data",
                  render: (item) => formatDate((item as { date: string }).date),
                },
                {
                  key: "receivables",
                  header: "Entradas",
                  align: "right",
                  render: (item) => (
                    <span className="text-green-600">
                      {formatCurrency((item as { receivables: number }).receivables)}
                    </span>
                  ),
                },
                {
                  key: "payables",
                  header: "Saídas",
                  align: "right",
                  render: (item) => (
                    <span className="text-red-600">
                      {formatCurrency((item as { payables: number }).payables)}
                    </span>
                  ),
                },
                {
                  key: "net_flow",
                  header: "Fluxo do Dia",
                  align: "right",
                  render: (item) => {
                    const flow = (item as { net_flow: number }).net_flow;
                    return (
                      <span className={flow >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(flow)}
                      </span>
                    );
                  },
                },
                {
                  key: "cumulative_balance",
                  header: "Saldo Acumulado",
                  align: "right",
                  render: (item) => {
                    const balance = (item as { cumulative_balance: number })
                      .cumulative_balance;
                    return (
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={balance >= 0 ? "text-green-600" : "text-red-600"}
                        >
                          {formatCurrency(balance)}
                        </span>
                        {balance < 0 && (
                          <Badge variant="destructive" className="text-xs">
                            Negativo
                          </Badge>
                        )}
                      </div>
                    );
                  },
                },
              ]}
              data={(data || []).map((d, idx) => ({ ...d, id: `cf-${idx}` }))}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
