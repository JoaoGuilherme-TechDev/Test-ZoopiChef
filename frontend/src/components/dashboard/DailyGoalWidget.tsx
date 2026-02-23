import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, TrendingDown, Trophy, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyGoalWidgetProps {
  goalMinutes?: number;
  className?: string;
}

export function DailyGoalWidget({ goalMinutes = 35, className }: DailyGoalWidgetProps) {
  const { data: company } = useCompany();

  const { data: todayMetrics, isLoading } = useQuery({
    queryKey: ['daily-goal-metrics', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Get delivered orders with timestamps
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, created_at, delivered_at, status')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${todayStr}T00:00:00`)
        .lt('created_at', `${todayStr}T23:59:59.999`);

      if (error) throw error;

      // Calculate average delivery time
      const deliveryTimes = orders
        ?.filter(o => o.delivered_at)
        .map(o => {
          const created = new Date(o.created_at);
          const delivered = new Date(o.delivered_at!);
          return (delivered.getTime() - created.getTime()) / (1000 * 60);
        }) || [];

      const avgTime = deliveryTimes.length > 0
        ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length)
        : 0;

      const fastOrders = deliveryTimes.filter(t => t <= goalMinutes).length;
      const slowOrders = deliveryTimes.filter(t => t > goalMinutes).length;

      // Get in-progress orders
      const { data: inProgress } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', company.id)
        .in('status', ['novo', 'preparo', 'pronto', 'em_rota'])
        .gte('created_at', `${todayStr}T00:00:00`);

      return {
        avgTime,
        totalDelivered: deliveryTimes.length,
        fastOrders,
        slowOrders,
        inProgress: inProgress?.length || 0,
        successRate: deliveryTimes.length > 0 
          ? Math.round((fastOrders / deliveryTimes.length) * 100)
          : 100,
      };
    },
    enabled: !!company?.id,
    refetchInterval: 30000,
  });

  const status = useMemo(() => {
    if (!todayMetrics || todayMetrics.totalDelivered === 0) {
      return { level: 'neutral', color: 'text-muted-foreground', bg: 'bg-muted' };
    }

    if (todayMetrics.avgTime <= goalMinutes * 0.8) {
      return { level: 'excellent', color: 'text-green-500', bg: 'bg-green-500/20' };
    }
    if (todayMetrics.avgTime <= goalMinutes) {
      return { level: 'good', color: 'text-blue-500', bg: 'bg-blue-500/20' };
    }
    if (todayMetrics.avgTime <= goalMinutes * 1.2) {
      return { level: 'warning', color: 'text-yellow-500', bg: 'bg-yellow-500/20' };
    }
    return { level: 'danger', color: 'text-red-500', bg: 'bg-red-500/20' };
  }, [todayMetrics, goalMinutes]);

  const progressValue = todayMetrics
    ? Math.min(100, (goalMinutes / Math.max(todayMetrics.avgTime, 1)) * 100)
    : 0;

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader className="pb-2">
          <div className="h-4 bg-muted rounded w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded w-1/3 mb-2" />
          <div className="h-2 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="w-4 h-4" />
          Meta de Tempo Hoje
          <Badge variant="outline" className="ml-auto text-xs">
            Meta: {goalMinutes}min
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Metric */}
        <div className="flex items-center gap-3">
          <div className={cn('p-3 rounded-lg', status.bg)}>
            {status.level === 'excellent' && <Trophy className={cn('w-6 h-6', status.color)} />}
            {status.level === 'good' && <TrendingUp className={cn('w-6 h-6', status.color)} />}
            {status.level === 'warning' && <Clock className={cn('w-6 h-6', status.color)} />}
            {status.level === 'danger' && <TrendingDown className={cn('w-6 h-6', status.color)} />}
            {status.level === 'neutral' && <Zap className={cn('w-6 h-6', status.color)} />}
          </div>
          <div>
            <p className={cn('text-2xl font-bold', status.color)}>
              {todayMetrics?.avgTime || 0}min
            </p>
            <p className="text-xs text-muted-foreground">
              Tempo médio de entrega
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Performance</span>
            <span>{todayMetrics?.successRate || 0}% dentro da meta</span>
          </div>
          <Progress 
            value={progressValue} 
            className="h-2"
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold">{todayMetrics?.totalDelivered || 0}</p>
            <p className="text-xs text-muted-foreground">Entregues</p>
          </div>
          <div className="p-2 rounded-lg bg-green-500/10">
            <p className="text-lg font-semibold text-green-500">{todayMetrics?.fastOrders || 0}</p>
            <p className="text-xs text-muted-foreground">No prazo</p>
          </div>
          <div className="p-2 rounded-lg bg-red-500/10">
            <p className="text-lg font-semibold text-red-500">{todayMetrics?.slowOrders || 0}</p>
            <p className="text-xs text-muted-foreground">Atrasados</p>
          </div>
        </div>

        {/* In Progress */}
        {(todayMetrics?.inProgress || 0) > 0 && (
          <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-blue-500/10">
            <span className="text-muted-foreground">Em andamento</span>
            <Badge variant="secondary">{todayMetrics?.inProgress} pedidos</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
