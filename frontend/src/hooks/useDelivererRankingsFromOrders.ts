import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { startOfDay, subDays } from 'date-fns';

export interface DelivererRanking {
  deliverer_id: string;
  deliverer_name: string;
  total_deliveries: number;
  total_on_time: number;
  total_delayed: number;
  avg_time_minutes: number;
  on_time_rate: number;
  total_bonus_cents: number;
  rank: number;
}

export function useDelivererRankingsFromOrders(period: 'today' | 'week' | 'month' = 'today') {
  const { data: company } = useCompany();

  const config = ((company as any)?.feature_flags as any)?.deliverer_ranking ?? {};
  const bonusTop1Cents = Number(config.bonusTop1Cents ?? 2000);
  const bonusTop2Cents = Number(config.bonusTop2Cents ?? 1000);
  const bonusTop3Cents = Number(config.bonusTop3Cents ?? 500);
  const onTimeThresholdMinutes = Number(config.onTimeThresholdMinutes ?? 45);

  const { data: rankings, isLoading } = useQuery({
    queryKey: ['deliverer-rankings-orders', company?.id, period],
    queryFn: async () => {
      if (!company?.id) return [];

      // Fetch ALL delivered orders - no date filter for test/demo purposes
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          dispatched_at,
          delivered_at,
          deliverer_id,
          deliverer:deliverers(id, name)
        `)
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .not('deliverer_id', 'is', null)
        .not('delivered_at', 'is', null)
        .order('delivered_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      if (!orders || orders.length === 0) return [];

      // Group by deliverer and calculate stats
      const delivererMap: Record<string, {
        deliverer_id: string;
        deliverer_name: string;
        total_deliveries: number;
        total_on_time: number;
        total_delayed: number;
        delivery_times: number[];
      }> = {};

      const ON_TIME_THRESHOLD = onTimeThresholdMinutes; // minutes from creation to delivery

      orders.forEach((order: any) => {
        const delivererId = order.deliverer_id;
        const deliverer = order.deliverer;
        if (!delivererId || !deliverer) return;

        if (!delivererMap[delivererId]) {
          delivererMap[delivererId] = {
            deliverer_id: delivererId,
            deliverer_name: deliverer.name || 'Desconhecido',
            total_deliveries: 0,
            total_on_time: 0,
            total_delayed: 0,
            delivery_times: [],
          };
        }

        delivererMap[delivererId].total_deliveries++;

        if (order.delivered_at && order.created_at) {
          const totalMinutes = (new Date(order.delivered_at).getTime() - new Date(order.created_at).getTime()) / (1000 * 60);
          
          if (totalMinutes <= ON_TIME_THRESHOLD) {
            delivererMap[delivererId].total_on_time++;
          } else {
            delivererMap[delivererId].total_delayed++;
          }

          if (order.dispatched_at) {
            const deliveryTime = (new Date(order.delivered_at).getTime() - new Date(order.dispatched_at).getTime()) / (1000 * 60);
            delivererMap[delivererId].delivery_times.push(deliveryTime);
          }
        }
      });

      // Convert to array and calculate final stats
      const results = Object.values(delivererMap)
        .map(d => ({
          deliverer_id: d.deliverer_id,
          deliverer_name: d.deliverer_name,
          total_deliveries: d.total_deliveries,
          total_on_time: d.total_on_time,
          total_delayed: d.total_delayed,
          avg_time_minutes: d.delivery_times.length > 0 
            ? Math.round(d.delivery_times.reduce((a, b) => a + b, 0) / d.delivery_times.length)
            : 0,
          on_time_rate: d.total_deliveries > 0 
            ? Math.round((d.total_on_time / d.total_deliveries) * 100)
            : 0,
          total_bonus_cents: 0,
        }))
        .sort((a, b) => {
          if (b.on_time_rate !== a.on_time_rate) return b.on_time_rate - a.on_time_rate;
          return b.total_deliveries - a.total_deliveries;
        })
        .map((r, idx) => ({
          ...r,
          rank: idx + 1,
          total_bonus_cents: idx === 0 ? bonusTop1Cents : idx === 1 ? bonusTop2Cents : idx === 2 ? bonusTop3Cents : 0,
        }));

      return results as DelivererRanking[];
    },
    enabled: !!company?.id,
  });

  return {
    rankings: rankings ?? [],
    isLoading,
  };
}
