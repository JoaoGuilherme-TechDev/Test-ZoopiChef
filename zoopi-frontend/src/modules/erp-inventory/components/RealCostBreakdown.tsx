import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import type { RealCostCalculation } from '../hooks/useOverheadConfig';

interface Props {
  calculation: RealCostCalculation;
  currentPrice?: number;
}

export function RealCostBreakdown({ calculation, currentPrice }: Props) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const priceDiff = currentPrice ? currentPrice - calculation.suggested_price : 0;
  const pricePercent = currentPrice ? ((priceDiff / currentPrice) * 100) : 0;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Custo Real do Prato
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo principal */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">CMV (Ingredientes)</p>
            <p className="text-lg font-bold">{formatCurrency(calculation.cmv)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Custo Real</p>
            <p className="text-lg font-bold text-orange-500">{formatCurrency(calculation.real_cost)}</p>
          </div>
        </div>

        <Separator />

        {/* Breakdown detalhado */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Composição do Preço Sugerido</p>
          {calculation.breakdown.map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {item.percent.toFixed(1)}%
                  </Badge>
                  <span className="font-medium w-20 text-right">{formatCurrency(item.value)}</span>
                </div>
              </div>
              <Progress value={item.percent} className="h-1.5" />
            </div>
          ))}
        </div>

        <Separator />

        {/* Preço sugerido */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Preço Sugerido</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(calculation.suggested_price)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Com {calculation.target_profit_percent}% de lucro líquido
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Overhead Total</p>
              <Badge variant="secondary">{calculation.total_overhead_percent.toFixed(1)}%</Badge>
            </div>
          </div>
        </div>

        {/* Comparação com preço atual */}
        {currentPrice !== undefined && (
          <div className={`p-3 rounded-lg flex items-center justify-between ${
            priceDiff >= 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {priceDiff >= 0 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">
                Preço atual: {formatCurrency(currentPrice)}
              </span>
            </div>
            <div className="text-right">
              <span className={`text-sm font-medium ${priceDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceDiff >= 0 ? '+' : ''}{formatCurrency(priceDiff)}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                ({pricePercent >= 0 ? '+' : ''}{pricePercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
