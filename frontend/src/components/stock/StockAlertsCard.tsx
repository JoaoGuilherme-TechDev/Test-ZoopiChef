import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Package, Send, RefreshCw } from 'lucide-react';
import { useStockAlerts, StockAlertItem } from '@/hooks/useStockAlerts';

interface StockAlertsCardProps {
  showSendButton?: boolean;
  maxItems?: number;
  compact?: boolean;
}

export function StockAlertsCard({ 
  showSendButton = true, 
  maxItems = 5,
  compact = false 
}: StockAlertsCardProps) {
  const { 
    items, 
    isLoading, 
    criticalCount, 
    lowCount, 
    totalAlerts,
    sendAlertNotification,
    refetch
  } = useStockAlerts();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (totalAlerts === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="w-4 h-4 text-success" />
            Estoque OK
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Todos os itens estão com estoque adequado.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: StockAlertItem['status']) => {
    switch (status) {
      case 'critical':
        return 'bg-destructive text-destructive-foreground';
      case 'low':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-success text-white';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage <= 25) return 'bg-destructive';
    if (percentage <= 50) return 'bg-orange-500';
    if (percentage <= 100) return 'bg-yellow-500';
    return 'bg-success';
  };

  return (
    <Card className={criticalCount > 0 ? 'border-destructive/50' : 'border-orange-500/50'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${criticalCount > 0 ? 'text-destructive' : 'text-orange-500'}`} />
            <div>
              <CardTitle className="text-base font-medium">
                Alertas de Estoque
              </CardTitle>
              {!compact && (
                <CardDescription>
                  {criticalCount > 0 && `${criticalCount} crítico${criticalCount > 1 ? 's' : ''}`}
                  {criticalCount > 0 && lowCount > 0 && ', '}
                  {lowCount > 0 && `${lowCount} baixo${lowCount > 1 ? 's' : ''}`}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="h-8 w-8"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            {showSendButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendAlertNotification.mutate(items)}
                disabled={sendAlertNotification.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                {sendAlertNotification.isPending ? 'Enviando...' : 'Notificar'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.slice(0, maxItems).map((item) => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(item.status)} variant="secondary">
                  {item.status === 'critical' ? 'Crítico' : 'Baixo'}
                </Badge>
                <span className="text-sm font-medium truncate max-w-[150px]">
                  {item.name}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {item.current_stock}/{item.min_stock}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                value={Math.min(item.percentage, 100)} 
                className={`h-2 flex-1 ${getProgressColor(item.percentage)}`}
              />
              <span className="text-xs text-muted-foreground w-10 text-right">
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
        
        {items.length > maxItems && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{items.length - maxItems} outros itens com alerta
          </p>
        )}
      </CardContent>
    </Card>
  );
}
