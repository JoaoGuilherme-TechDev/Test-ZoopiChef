import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWeeklyComparison, WeeklyComparisonReport as ReportType } from '@/hooks/useWeeklyComparison';
import { formatCurrency } from '@/lib/format';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, Calendar, ShoppingCart, Users, Receipt, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function WeeklyComparisonReport() {
  const { reports, latestReport, isLoading, generateReport } = useWeeklyComparison();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Comparativo Semanal</h2>
          <p className="text-muted-foreground">Análise de desempenho semana a semana</p>
        </div>
        <Button onClick={() => generateReport.mutate()} disabled={generateReport.isPending}>
          {generateReport.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Gerar Relatório
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : latestReport ? (
        <>
          {/* Current Week Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Pedidos"
              currentValue={latestReport.current_total_orders}
              previousValue={latestReport.previous_total_orders}
              variation={latestReport.orders_variation_percent}
              icon={<ShoppingCart className="w-5 h-5" />}
            />
            <MetricCard
              title="Faturamento"
              currentValue={formatCurrency(latestReport.current_total_revenue_cents / 100)}
              previousValue={formatCurrency(latestReport.previous_total_revenue_cents / 100)}
              variation={latestReport.revenue_variation_percent}
              icon={<Receipt className="w-5 h-5" />}
              isCurrency
            />
            <MetricCard
              title="Ticket Médio"
              currentValue={formatCurrency(latestReport.current_avg_ticket_cents / 100)}
              previousValue={formatCurrency(latestReport.previous_avg_ticket_cents / 100)}
              variation={
                latestReport.previous_avg_ticket_cents > 0
                  ? ((latestReport.current_avg_ticket_cents - latestReport.previous_avg_ticket_cents) / latestReport.previous_avg_ticket_cents) * 100
                  : null
              }
              icon={<TrendingUp className="w-5 h-5" />}
              isCurrency
            />
            <MetricCard
              title="Clientes"
              currentValue={latestReport.current_total_customers}
              previousValue={latestReport.previous_total_customers}
              variation={latestReport.customers_variation_percent}
              icon={<Users className="w-5 h-5" />}
            />
          </div>

          {/* Comparison Tables */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Week vs Previous Week */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Semana Atual vs Anterior</CardTitle>
                <CardDescription>
                  Comparando com a semana passada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ComparisonRow
                    label="Pedidos"
                    current={latestReport.current_total_orders}
                    previous={latestReport.previous_total_orders}
                  />
                  <ComparisonRow
                    label="Faturamento"
                    current={latestReport.current_total_revenue_cents}
                    previous={latestReport.previous_total_revenue_cents}
                    isCurrency
                  />
                  <ComparisonRow
                    label="Ticket Médio"
                    current={latestReport.current_avg_ticket_cents}
                    previous={latestReport.previous_avg_ticket_cents}
                    isCurrency
                  />
                  <ComparisonRow
                    label="Clientes"
                    current={latestReport.current_total_customers}
                    previous={latestReport.previous_total_customers}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Week vs Same Week Last Month */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">vs Mesma Semana (Mês Anterior)</CardTitle>
                <CardDescription>
                  Comparando com 4 semanas atrás
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ComparisonRow
                    label="Pedidos"
                    current={latestReport.current_total_orders}
                    previous={latestReport.same_week_last_month_orders}
                  />
                  <ComparisonRow
                    label="Faturamento"
                    current={latestReport.current_total_revenue_cents}
                    previous={latestReport.same_week_last_month_revenue_cents}
                    isCurrency
                  />
                  <ComparisonRow
                    label="Ticket Médio"
                    current={latestReport.current_avg_ticket_cents}
                    previous={latestReport.same_week_last_month_avg_ticket_cents}
                    isCurrency
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          {latestReport.insights && latestReport.insights.length > 0 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {latestReport.insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Historical Reports */}
          {reports.length > 1 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Histórico de Relatórios</CardTitle>
                <CardDescription>Últimos relatórios gerados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reports.slice(0, 10).map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>
                          Semana {report.week_number}/{report.year}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({format(new Date(report.report_date), "dd/MM/yyyy", { locale: ptBR })})
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>{report.current_total_orders} pedidos</span>
                        <span className="font-medium">
                          {formatCurrency(report.current_total_revenue_cents / 100)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum relatório gerado</h3>
            <p className="text-muted-foreground mb-4">
              Clique em "Gerar Relatório" para criar o primeiro comparativo semanal
            </p>
            <Button onClick={() => generateReport.mutate()} disabled={generateReport.isPending}>
              {generateReport.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Gerar Primeiro Relatório
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  currentValue: string | number;
  previousValue: string | number;
  variation: number | null;
  icon: React.ReactNode;
  isCurrency?: boolean;
}

function MetricCard({ title, currentValue, previousValue, variation, icon, isCurrency }: MetricCardProps) {
  const isPositive = variation !== null && variation > 0;
  const isNegative = variation !== null && variation < 0;
  const isNeutral = variation === null || variation === 0;

  return (
    <Card className="border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          {variation !== null && (
            <Badge 
              variant="outline" 
              className={cn(
                isPositive && "text-green-600 border-green-500/30 bg-green-500/10",
                isNegative && "text-red-600 border-red-500/30 bg-red-500/10",
                isNeutral && "text-muted-foreground"
              )}
            >
              {isPositive && <TrendingUp className="w-3 h-3 mr-1" />}
              {isNegative && <TrendingDown className="w-3 h-3 mr-1" />}
              {isNeutral && <Minus className="w-3 h-3 mr-1" />}
              {variation.toFixed(1)}%
            </Badge>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{currentValue}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Anterior: {previousValue}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ComparisonRowProps {
  label: string;
  current: number;
  previous: number;
  isCurrency?: boolean;
}

function ComparisonRow({ label, current, previous, isCurrency }: ComparisonRowProps) {
  const diff = current - previous;
  const percentChange = previous > 0 ? (diff / previous) * 100 : 0;
  const isPositive = diff > 0;
  const isNegative = diff < 0;

  const formatValue = (val: number) => {
    if (isCurrency) return formatCurrency(val / 100);
    return val.toString();
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-medium">{formatValue(current)}</span>
        <span className="text-sm text-muted-foreground">vs {formatValue(previous)}</span>
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            isPositive && "text-green-600 border-green-500/30 bg-green-500/10",
            isNegative && "text-red-600 border-red-500/30 bg-red-500/10",
            !isPositive && !isNegative && "text-muted-foreground"
          )}
        >
          {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
        </Badge>
      </div>
    </div>
  );
}
