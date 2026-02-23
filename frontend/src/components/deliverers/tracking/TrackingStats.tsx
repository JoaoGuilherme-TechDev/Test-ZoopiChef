import { Card, CardContent } from '@/components/ui/card';
import { Wifi, Truck, Clock, MapPin, TrendingUp } from 'lucide-react';

interface TrackingStatsProps {
  onlineCount: number;
  totalDeliverers: number;
  ordersInTransit: number;
  pendingOrders: number;
  avgDeliveryTime?: number; // in minutes
}

export function TrackingStats({
  onlineCount,
  totalDeliverers,
  ordersInTransit,
  pendingOrders,
  avgDeliveryTime,
}: TrackingStatsProps) {
  const stats = [
    {
      label: 'Online',
      value: onlineCount,
      subtitle: `de ${totalDeliverers}`,
      icon: Wifi,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Em Rota',
      value: ordersInTransit,
      subtitle: 'entregas',
      icon: Truck,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Aguardando',
      value: pendingOrders,
      subtitle: 'pedidos',
      icon: Clock,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Tempo Médio',
      value: avgDeliveryTime ? `${avgDeliveryTime}min` : '--',
      subtitle: 'por entrega',
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">
                  {stat.label} <span className="opacity-70">{stat.subtitle}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
