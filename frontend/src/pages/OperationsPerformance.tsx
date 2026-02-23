/**
 * Operations Performance Dashboard
 * 
 * Tela única em tempo real mostrando:
 * - Cozinha: itens preparando/prontos
 * - Bar: itens preparando/prontos  
 * - Setores: status de cada setor
 * - Expedição: entregas aguardando/em rota
 * - Pedidos: novo/preparo/pronto/em_rota/entregue
 * 
 * Visual colorido com barras que crescem/diminuem
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChefHat, 
  Truck, 
  Package, 
  CheckCircle, 
  PlayCircle,
  AlertCircle,
  MapPin,
  Users,
  Timer,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';

interface OrderStats {
  novo: number;
  preparo: number;
  pronto: number;
  em_rota: number;
  entregue: number;
  total: number;
}

interface SectorStats {
  id: string;
  name: string;
  pending: number;
  inProgress: number;
  done: number;
  avgTime: number;
}

interface DeliveryStats {
  waiting: number;
  inRoute: number;
  delivered: number;
  onlineDeliverers: number;
}

const STATUS_COLORS = {
  novo: { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-500/20' },
  preparo: { bg: 'bg-yellow-500', text: 'text-yellow-500', light: 'bg-yellow-500/20' },
  pronto: { bg: 'bg-green-500', text: 'text-green-500', light: 'bg-green-500/20' },
  em_rota: { bg: 'bg-purple-500', text: 'text-purple-500', light: 'bg-purple-500/20' },
  entregue: { bg: 'bg-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-500/20' },
};

export default function OperationsPerformance() {
  const { company } = useCompanyContext();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch order stats - real-time
  const { data: orderStats } = useQuery({
    queryKey: ['performance-orders', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('orders')
        .select('status')
        .eq('company_id', company.id)
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const stats: OrderStats = {
        novo: 0,
        preparo: 0,
        pronto: 0,
        em_rota: 0,
        entregue: 0,
        total: data.length,
      };

      data.forEach(order => {
        const status = order.status as keyof OrderStats;
        if (status in stats) {
          stats[status]++;
        }
      });

      return stats;
    },
    enabled: !!company?.id,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch sector stats using print_sectors
  const { data: sectorStats = [] } = useQuery({
    queryKey: ['performance-sectors', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data: sectors } = await supabase
        .from('print_sectors')
        .select('id, name')
        .eq('company_id', company.id)
        .eq('active', true);

      if (!sectors) return [];

      // Get order items by checking item_status
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats: SectorStats[] = [];

      for (const sector of sectors) {
        // For simplicity, count items from orders today
        const { data: items } = await supabase
          .from('order_items')
          .select('item_status, created_at, finished_at')
          .gte('created_at', today.toISOString());

        const pending = items?.filter(i => i.item_status === 'pending').length || 0;
        const inProgress = items?.filter(i => i.item_status === 'preparing').length || 0;
        const done = items?.filter(i => i.item_status === 'ready' || i.item_status === 'delivered').length || 0;

        // Calculate average time
        const completedItems = items?.filter(i => i.item_status === 'ready' && i.finished_at) || [];
        let avgTime = 0;
        if (completedItems.length > 0) {
          const totalTime = completedItems.reduce((sum, item) => {
            const start = new Date(item.created_at).getTime();
            const end = new Date(item.finished_at!).getTime();
            return sum + (end - start);
          }, 0);
          avgTime = Math.round((totalTime / completedItems.length) / 60000); // minutes
        }

        stats.push({
          id: sector.id,
          name: sector.name,
          pending,
          inProgress,
          done,
          avgTime,
        });
      }

      return stats;
    },
    enabled: !!company?.id,
    refetchInterval: 10000,
  });

  // Fetch delivery stats
  const { data: deliveryStats } = useQuery({
    queryKey: ['performance-delivery', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: orders } = await supabase
        .from('orders')
        .select('status')
        .eq('company_id', company.id)
        .eq('fulfillment_type', 'delivery')
        .gte('created_at', today.toISOString());

      const { data: deliverers } = await supabase
        .from('deliverers')
        .select('is_online')
        .eq('company_id', company.id)
        .eq('active', true);

      return {
        waiting: orders?.filter(o => o.status === 'pronto' || o.status === 'novo').length || 0,
        inRoute: orders?.filter(o => o.status === 'em_rota').length || 0,
        delivered: orders?.filter(o => o.status === 'entregue').length || 0,
        onlineDeliverers: deliverers?.filter(d => d.is_online).length || 0,
      } as DeliveryStats;
    },
    enabled: !!company?.id,
    refetchInterval: 5000,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel('performance-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          // Queries will auto-refetch due to refetchInterval
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id]);

  const getPercentage = (value: number, total: number) => 
    total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <DashboardLayout title="Performance Operacional">
      <div className="space-y-6">
        {/* Header with Clock */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Performance em Tempo Real</h1>
            <p className="text-muted-foreground">Visão completa das operações</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-mono font-bold text-primary">
              {currentTime.toLocaleTimeString('pt-BR')}
            </div>
            <p className="text-muted-foreground">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>
        </div>

        {/* Order Status Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pipeline de Pedidos ({orderStats?.total || 0} hoje)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {(['novo', 'preparo', 'pronto', 'em_rota', 'entregue'] as const).map((status) => {
                const count = orderStats?.[status] || 0;
                const total = orderStats?.total || 1;
                const percentage = getPercentage(count, total);
                const colors = STATUS_COLORS[status];
                
                const labels = {
                  novo: 'Novos',
                  preparo: 'Preparando',
                  pronto: 'Prontos',
                  em_rota: 'Em Rota',
                  entregue: 'Entregues',
                };

                const icons = {
                  novo: AlertCircle,
                  preparo: PlayCircle,
                  pronto: CheckCircle,
                  em_rota: Truck,
                  entregue: Package,
                };

                const Icon = icons[status];

                return (
                  <motion.div
                    key={status}
                    className={`p-4 rounded-xl ${colors.light} relative overflow-hidden`}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {/* Animated background bar */}
                    <motion.div
                      className={`absolute bottom-0 left-0 right-0 ${colors.bg} opacity-30`}
                      initial={{ height: 0 }}
                      animate={{ height: `${percentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`h-6 w-6 ${colors.text}`} />
                        <Badge variant="secondary" className="text-lg font-bold">
                          {count}
                        </Badge>
                      </div>
                      <p className="font-medium">{labels[status]}</p>
                      <p className="text-sm text-muted-foreground">{percentage}%</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Sectors Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Setores de Produção
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sectorStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum setor configurado
                </div>
              ) : (
                <div className="space-y-4">
                  {sectorStats.map((sector) => {
                    const total = sector.pending + sector.inProgress + sector.done;
                    const progressPending = getPercentage(sector.pending, total);
                    const progressInProgress = getPercentage(sector.inProgress, total);
                    const progressDone = getPercentage(sector.done, total);

                    return (
                      <div key={sector.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{sector.name}</span>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                              {sector.pending} aguardando
                            </Badge>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                              {sector.inProgress} fazendo
                            </Badge>
                            <Badge variant="outline" className="bg-green-500/10 text-green-500">
                              {sector.done} prontos
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Stacked progress bar */}
                        <div className="h-4 rounded-full overflow-hidden flex bg-muted">
                          <motion.div 
                            className="bg-yellow-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPending}%` }}
                            transition={{ duration: 0.5 }}
                          />
                          <motion.div 
                            className="bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressInProgress}%` }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                          />
                          <motion.div 
                            className="bg-green-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressDone}%` }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                          />
                        </div>

                        {sector.avgTime > 0 && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Timer className="h-3 w-3" />
                            Tempo médio: {sector.avgTime} min
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Expedição & Entregas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <motion.div 
                  className="p-6 rounded-xl bg-orange-500/10 text-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <Package className="h-10 w-10 mx-auto mb-2 text-orange-500" />
                  <div className="text-4xl font-bold text-orange-500">
                    {deliveryStats?.waiting || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Aguardando Expedição</p>
                </motion.div>

                <motion.div 
                  className="p-6 rounded-xl bg-purple-500/10 text-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <MapPin className="h-10 w-10 mx-auto mb-2 text-purple-500" />
                  <div className="text-4xl font-bold text-purple-500">
                    {deliveryStats?.inRoute || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Em Rota</p>
                </motion.div>

                <motion.div 
                  className="p-6 rounded-xl bg-green-500/10 text-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                  <div className="text-4xl font-bold text-green-500">
                    {deliveryStats?.delivered || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Entregues Hoje</p>
                </motion.div>

                <motion.div 
                  className="p-6 rounded-xl bg-blue-500/10 text-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <Users className="h-10 w-10 mx-auto mb-2 text-blue-500" />
                  <div className="text-4xl font-bold text-blue-500">
                    {deliveryStats?.onlineDeliverers || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Entregadores Online</p>
                </motion.div>
              </div>

              {/* Delivery progress */}
              {deliveryStats && deliveryStats.waiting + deliveryStats.inRoute + deliveryStats.delivered > 0 && (
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progresso de Entregas</span>
                    <span>
                      {deliveryStats.delivered} de {deliveryStats.waiting + deliveryStats.inRoute + deliveryStats.delivered}
                    </span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden flex bg-muted">
                    <motion.div 
                      className="bg-orange-500"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${getPercentage(deliveryStats.waiting, deliveryStats.waiting + deliveryStats.inRoute + deliveryStats.delivered)}%` 
                      }}
                    />
                    <motion.div 
                      className="bg-purple-500"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${getPercentage(deliveryStats.inRoute, deliveryStats.waiting + deliveryStats.inRoute + deliveryStats.delivered)}%` 
                      }}
                    />
                    <motion.div 
                      className="bg-green-500"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${getPercentage(deliveryStats.delivered, deliveryStats.waiting + deliveryStats.inRoute + deliveryStats.delivered)}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
