import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, Truck, Users, AlertTriangle, TrendingUp, Timer } from 'lucide-react';
import type { DashboardRealtimeData } from '@/hooks/useDashboardRealtime';

interface RealtimeMetricsWidgetProps {
  data: DashboardRealtimeData['metrics'];
}

export function RealtimeMetricsWidget({ data }: RealtimeMetricsWidgetProps) {
  const metrics = [
    {
      label: 'Tempo Preparo',
      value: data.avgPrepTime !== null ? `${data.avgPrepTime}min` : '--',
      icon: Clock,
      color: data.avgPrepTime && data.avgPrepTime > 30 ? 'text-orange-500' : 'text-green-500',
      bgColor: data.avgPrepTime && data.avgPrepTime > 30 ? 'bg-orange-50' : 'bg-green-50',
    },
    {
      label: 'Tempo Entrega',
      value: data.avgDeliveryTime !== null ? `${data.avgDeliveryTime}min` : '--',
      icon: Truck,
      color: data.avgDeliveryTime && data.avgDeliveryTime > 45 ? 'text-orange-500' : 'text-green-500',
      bgColor: data.avgDeliveryTime && data.avgDeliveryTime > 45 ? 'bg-orange-50' : 'bg-green-50',
    },
    {
      label: 'Taxa no Prazo',
      value: data.onTimeRate !== null ? `${data.onTimeRate}%` : '--',
      icon: TrendingUp,
      color: data.onTimeRate && data.onTimeRate < 80 ? 'text-red-500' : 'text-green-500',
      bgColor: data.onTimeRate && data.onTimeRate < 80 ? 'bg-red-50' : 'bg-green-50',
    },
    {
      label: 'Clientes',
      value: data.customersToday.toString(),
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Entregadores',
      value: data.activeDeliverers.toString(),
      icon: Truck,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Atrasados',
      value: data.delayedOrders.toString(),
      icon: AlertTriangle,
      color: data.delayedOrders > 0 ? 'text-red-500' : 'text-green-500',
      bgColor: data.delayedOrders > 0 ? 'bg-red-50' : 'bg-green-50',
      pulse: data.delayedOrders > 0,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Métricas de Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={`relative overflow-hidden p-3 rounded-lg ${metric.bgColor} border transition-all ${metric.pulse ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className={`text-xl font-bold ${metric.color}`}>{metric.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{metric.label}</p>
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center ml-2">
                  <metric.icon className={`w-4 h-4 ${metric.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
