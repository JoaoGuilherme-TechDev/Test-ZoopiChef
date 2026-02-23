import { useMemo } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useKDSSettings } from '@/hooks/useKDSSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChefHat, AlertTriangle, Flame, Snowflake, ThermometerSun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KitchenLoadWidgetProps {
  className?: string;
}

export function KitchenLoadWidget({ className }: KitchenLoadWidgetProps) {
  const { orders } = useOrders();
  const { settings } = useKDSSettings();

  const capacity = settings?.kitchen_capacity_units_per_10min || 10;

  const kitchenLoad = useMemo(() => {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // Count orders in active states
    const activeOrders = orders.filter(o => 
      ['novo', 'preparo'].includes(o.status)
    );

    // Count recent orders (last 10 min)
    const recentOrders = orders.filter(o => 
      new Date(o.created_at) >= tenMinutesAgo &&
      !['entregue', 'cancelado'].includes(o.status)
    );

    // Calculate load percentage
    const currentLoad = activeOrders.length;
    const loadPercentage = Math.round((currentLoad / capacity) * 100);

    // Determine load level
    let level: 'low' | 'normal' | 'high' | 'critical' = 'normal';
    if (loadPercentage >= 100) level = 'critical';
    else if (loadPercentage >= 80) level = 'high';
    else if (loadPercentage <= 30) level = 'low';

    // Count by status
    const byStatus = {
      novo: orders.filter(o => o.status === 'novo').length,
      preparo: orders.filter(o => o.status === 'preparo').length,
      pronto: orders.filter(o => o.status === 'pronto').length,
      em_rota: orders.filter(o => o.status === 'em_rota').length,
    };

    // Calculate average wait time for current orders
    const waitTimes = activeOrders.map(o => {
      const created = new Date(o.created_at);
      return (now.getTime() - created.getTime()) / (1000 * 60);
    });
    const avgWaitTime = waitTimes.length > 0
      ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
      : 0;

    return {
      currentLoad,
      capacity,
      loadPercentage: Math.min(loadPercentage, 150),
      level,
      recentOrdersCount: recentOrders.length,
      byStatus,
      avgWaitTime,
    };
  }, [orders, capacity]);

  const levelConfig = {
    low: { 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/20', 
      label: 'Calmo',
      icon: Snowflake 
    },
    normal: { 
      color: 'text-green-500', 
      bg: 'bg-green-500/20', 
      label: 'Normal',
      icon: ThermometerSun 
    },
    high: { 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-500/20', 
      label: 'Intenso',
      icon: Flame 
    },
    critical: { 
      color: 'text-red-500', 
      bg: 'bg-red-500/20', 
      label: 'Crítico',
      icon: AlertTriangle 
    },
  };

  const config = levelConfig[kitchenLoad.level];
  const Icon = config.icon;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ChefHat className="w-4 h-4" />
          Carga da Cozinha
          <Badge 
            variant="outline" 
            className={cn('ml-auto', config.color)}
          >
            {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Load Indicator */}
        <div className="flex items-center gap-3">
          <div className={cn('p-3 rounded-lg', config.bg)}>
            <Icon className={cn('w-6 h-6', config.color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn('text-2xl font-bold', config.color)}>
                {kitchenLoad.currentLoad}
              </span>
              <span className="text-sm text-muted-foreground">
                / {kitchenLoad.capacity} capacidade
              </span>
            </div>
            <Progress 
              value={kitchenLoad.loadPercentage} 
              className="h-2 mt-1"
            />
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-4 gap-1 text-center">
          <div className="p-2 rounded bg-yellow-500/10">
            <p className="text-sm font-semibold text-yellow-500">
              {kitchenLoad.byStatus.novo}
            </p>
            <p className="text-xs text-muted-foreground">Novo</p>
          </div>
          <div className="p-2 rounded bg-orange-500/10">
            <p className="text-sm font-semibold text-orange-500">
              {kitchenLoad.byStatus.preparo}
            </p>
            <p className="text-xs text-muted-foreground">Preparo</p>
          </div>
          <div className="p-2 rounded bg-green-500/10">
            <p className="text-sm font-semibold text-green-500">
              {kitchenLoad.byStatus.pronto}
            </p>
            <p className="text-xs text-muted-foreground">Pronto</p>
          </div>
          <div className="p-2 rounded bg-purple-500/10">
            <p className="text-sm font-semibold text-purple-500">
              {kitchenLoad.byStatus.em_rota}
            </p>
            <p className="text-xs text-muted-foreground">Rota</p>
          </div>
        </div>

        {/* Extra Info */}
        {kitchenLoad.avgWaitTime > 0 && (
          <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
            <span className="text-muted-foreground">Tempo médio em fila</span>
            <Badge variant="secondary">{kitchenLoad.avgWaitTime}min</Badge>
          </div>
        )}

        {kitchenLoad.level === 'critical' && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/20 text-red-500 text-sm animate-pulse">
            <AlertTriangle className="w-4 h-4" />
            <span>Cozinha sobrecarregada! Considere pausar novos pedidos.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
