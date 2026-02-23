import { Card, CardContent } from '@/components/ui/card';
import { useLoyalty } from '@/hooks/useLoyalty';
import { Users, Star, Gift, Bell, TrendingUp, Crown } from 'lucide-react';

export function LoyaltyStats() {
  const { stats, levels } = useLoyalty();

  const statCards = [
    {
      label: 'Clientes com Pontos',
      value: stats.totalCustomers.toLocaleString(),
      icon: Users,
      color: 'primary',
    },
    {
      label: 'Pontos em Circulação',
      value: stats.totalPointsCirculating.toLocaleString(),
      icon: Star,
      color: 'amber',
    },
    {
      label: 'Recompensas Ativas',
      value: stats.activeRewards.toString(),
      icon: Gift,
      color: 'green',
    },
    {
      label: 'Níveis Configurados',
      value: levels.length.toString(),
      icon: Crown,
      color: 'purple',
    },
    {
      label: 'Notificações Pendentes',
      value: stats.pendingNotifications.toString(),
      icon: Bell,
      color: 'blue',
    },
    {
      label: 'Pontos a Expirar',
      value: stats.expiringPoints.toLocaleString(),
      icon: TrendingUp,
      color: 'red',
    },
  ];

  const colorClasses: Record<string, { bg: string; icon: string }> = {
    primary: { bg: 'bg-primary/10', icon: 'text-primary' },
    amber: { bg: 'bg-amber-500/10', icon: 'text-amber-500' },
    green: { bg: 'bg-green-500/10', icon: 'text-green-500' },
    purple: { bg: 'bg-purple-500/10', icon: 'text-purple-500' },
    blue: { bg: 'bg-blue-500/10', icon: 'text-blue-500' },
    red: { bg: 'bg-red-500/10', icon: 'text-red-500' },
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat) => {
        const colors = colorClasses[stat.color];
        return (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${colors.bg}`}>
                  <stat.icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
