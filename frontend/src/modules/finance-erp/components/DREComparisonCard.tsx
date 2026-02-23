import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DREComparisonCardProps {
  title: string;
  currentValue: number;
  previousValue?: number;
  format?: 'currency' | 'percent';
  invertColors?: boolean;
  className?: string;
}

export function DREComparisonCard({
  title,
  currentValue,
  previousValue,
  format = 'currency',
  invertColors = false,
  className,
}: DREComparisonCardProps) {
  const formatValue = (value: number) => {
    if (format === 'percent') {
      return `${value.toFixed(2)}%`;
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const hasComparison = previousValue !== undefined;
  const variation = hasComparison ? currentValue - previousValue : 0;
  const variationPercent = hasComparison && previousValue !== 0
    ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100
    : 0;

  const isPositive = invertColors ? variation < 0 : variation > 0;
  const isNegative = invertColors ? variation > 0 : variation < 0;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(currentValue)}</div>
        
        {hasComparison && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">
              Anterior: {formatValue(previousValue)}
            </span>
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                isPositive && 'text-green-600',
                isNegative && 'text-red-600',
                !isPositive && !isNegative && 'text-muted-foreground'
              )}
            >
              {isPositive && <TrendingUp className="h-3 w-3" />}
              {isNegative && <TrendingDown className="h-3 w-3" />}
              {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
              {variationPercent > 0 ? '+' : ''}{variationPercent.toFixed(1)}%
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
