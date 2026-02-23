import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Area, ComposedChart, Bar } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProjectionDaily } from '../hooks/useSalesProjection';

interface ProjectionChartProps {
  dailyData: ProjectionDaily[];
  targetRevenue: number;
}

export function ProjectionChart({ dailyData, targetRevenue }: ProjectionChartProps) {
  const chartData = useMemo(() => {
    let cumulativeExpected = 0;
    let cumulativeActual = 0;
    
    return dailyData.map((day) => {
      cumulativeExpected += day.expected_revenue;
      cumulativeActual += day.actual_revenue;
      
      return {
        date: day.date,
        label: format(parseISO(day.date), 'dd/MM', { locale: ptBR }),
        expected: day.expected_revenue,
        actual: day.actual_revenue,
        cumulativeExpected,
        cumulativeActual,
        difference: day.difference_percent,
        status: day.status,
      };
    });
  }, [dailyData]);

  const chartConfig = {
    expected: { label: 'Esperado', color: 'hsl(var(--muted-foreground))' },
    actual: { label: 'Realizado', color: 'hsl(var(--primary))' },
    cumulativeExpected: { label: 'Acumulado Esperado', color: 'hsl(var(--muted-foreground))' },
    cumulativeActual: { label: 'Acumulado Real', color: 'hsl(var(--primary))' },
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Faturamento Diário</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px]">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10 }}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <Bar 
                dataKey="expected" 
                fill="hsl(var(--muted))" 
                name="Esperado"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="actual" 
                fill="hsl(var(--primary))" 
                name="Realizado"
                radius={[4, 4, 0, 0]}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Evolução Acumulada vs Meta</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px]">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10 }}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <ReferenceLine 
                y={targetRevenue} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="5 5"
                label={{ 
                  value: 'META', 
                  position: 'right', 
                  fill: 'hsl(var(--destructive))',
                  fontSize: 10,
                }}
              />
              <Line 
                type="monotone" 
                dataKey="cumulativeExpected" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Esperado"
              />
              <Line 
                type="monotone" 
                dataKey="cumulativeActual" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                name="Realizado"
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
