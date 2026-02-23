import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export interface DelivererRanking {
  id: string;
  company_id: string;
  deliverer_id: string;
  period_date: string;
  total_deliveries: number;
  avg_delivery_time_minutes: number | null;
  on_time_count: number;
  delayed_count: number;
  ranking_position: number | null;
  bonus_cents: number;
  created_at: string;
  updated_at: string;
  // Joined data
  deliverer?: {
    id: string;
    name: string;
    whatsapp: string | null;
  };
}

export function useDelivererRankings(period: 'today' | 'week' | 'month' = 'today') {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    const start = new Date(today);
    
    switch (period) {
      case 'week':
        start.setDate(today.getDate() - 7);
        break;
      case 'month':
        start.setDate(today.getDate() - 30);
        break;
      default: // today
        start.setHours(0, 0, 0, 0);
    }
    
    return { 
      start: start.toISOString().split('T')[0], 
      end: today.toISOString().split('T')[0] 
    };
  };

  const { data: rankings, isLoading } = useQuery({
    queryKey: ['deliverer-rankings', company?.id, period],
    queryFn: async () => {
      if (!company?.id) return [];

      const { start, end } = getDateRange();

      const { data, error } = await supabase
        .from('deliverer_rankings')
        .select(`
          *,
          deliverer:deliverers(id, name, whatsapp)
        `)
        .eq('company_id', company.id)
        .gte('period_date', start)
        .lte('period_date', end)
        .order('ranking_position', { ascending: true });

      if (error) throw error;
      return data as DelivererRanking[];
    },
    enabled: !!company?.id,
  });

  // Aggregate rankings for period
  const aggregatedRankings = rankings?.reduce((acc, r) => {
    const key = r.deliverer_id;
    if (!acc[key]) {
      acc[key] = {
        deliverer_id: r.deliverer_id,
        deliverer_name: r.deliverer?.name || 'Desconhecido',
        total_deliveries: 0,
        total_on_time: 0,
        total_delayed: 0,
        total_time_minutes: 0,
        delivery_count_for_avg: 0,
        total_bonus_cents: 0,
      };
    }
    acc[key].total_deliveries += r.total_deliveries;
    acc[key].total_on_time += r.on_time_count;
    acc[key].total_delayed += r.delayed_count;
    acc[key].total_bonus_cents += r.bonus_cents;
    if (r.avg_delivery_time_minutes) {
      acc[key].total_time_minutes += r.avg_delivery_time_minutes * r.total_deliveries;
      acc[key].delivery_count_for_avg += r.total_deliveries;
    }
    return acc;
  }, {} as Record<string, {
    deliverer_id: string;
    deliverer_name: string;
    total_deliveries: number;
    total_on_time: number;
    total_delayed: number;
    total_time_minutes: number;
    delivery_count_for_avg: number;
    total_bonus_cents: number;
  }>);

  const sortedRankings = Object.values(aggregatedRankings || {})
    .map(r => ({
      ...r,
      avg_time_minutes: r.delivery_count_for_avg > 0 
        ? Math.round(r.total_time_minutes / r.delivery_count_for_avg) 
        : 0,
      on_time_rate: r.total_deliveries > 0 
        ? Math.round((r.total_on_time / r.total_deliveries) * 100) 
        : 0,
    }))
    .sort((a, b) => {
      // Sort by on-time rate first, then by total deliveries
      if (b.on_time_rate !== a.on_time_rate) return b.on_time_rate - a.on_time_rate;
      return b.total_deliveries - a.total_deliveries;
    })
    .map((r, idx) => ({ ...r, rank: idx + 1 }));

  // Calculate rankings from orders (for recalculation)
  const recalculateRankings = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No company');

      const today = new Date().toISOString().split('T')[0];

      // Fetch today's delivered orders with deliverer
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .not('deliverer_id', 'is', null);

      if (error) throw error;

      // Group by deliverer
      const delivererStats: Record<string, {
        total: number;
        on_time: number;
        delayed: number;
        times: number[];
      }> = {};

      orders?.forEach(order => {
        const delivererId = order.deliverer_id;
        if (!delivererId) return;

        if (!delivererStats[delivererId]) {
          delivererStats[delivererId] = { total: 0, on_time: 0, delayed: 0, times: [] };
        }

        delivererStats[delivererId].total++;

        // Calculate delivery time
        if (order.dispatched_at && order.delivered_at) {
          const minutes = (new Date(order.delivered_at).getTime() - new Date(order.dispatched_at).getTime()) / (1000 * 60);
          delivererStats[delivererId].times.push(minutes);

          // Total time from creation
          const totalMinutes = (new Date(order.delivered_at).getTime() - new Date(order.created_at).getTime()) / (1000 * 60);
          if (totalMinutes <= 45) {
            delivererStats[delivererId].on_time++;
          } else {
            delivererStats[delivererId].delayed++;
          }
        }
      });

      // Sort by on-time rate to determine ranking
      const sorted = Object.entries(delivererStats)
        .map(([id, stats]) => ({
          deliverer_id: id,
          ...stats,
          avgTime: stats.times.length > 0 
            ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length 
            : 0,
          onTimeRate: stats.total > 0 ? stats.on_time / stats.total : 0,
        }))
        .sort((a, b) => {
          if (b.onTimeRate !== a.onTimeRate) return b.onTimeRate - a.onTimeRate;
          return b.total - a.total;
        });

      // Upsert rankings
      for (let i = 0; i < sorted.length; i++) {
        const s = sorted[i];
        const bonusCents = i === 0 ? 2000 : i === 1 ? 1000 : i === 2 ? 500 : 0; // R$20, R$10, R$5

        await supabase
          .from('deliverer_rankings')
          .upsert({
            company_id: company.id,
            deliverer_id: s.deliverer_id,
            period_date: today,
            total_deliveries: s.total,
            avg_delivery_time_minutes: Math.round(s.avgTime * 100) / 100,
            on_time_count: s.on_time,
            delayed_count: s.delayed,
            ranking_position: i + 1,
            bonus_cents: bonusCents,
          }, { onConflict: 'company_id,deliverer_id,period_date' });
      }

      return sorted.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverer-rankings'] });
    },
  });

  return {
    rankings: sortedRankings,
    rawRankings: rankings ?? [],
    isLoading,
    recalculateRankings,
  };
}
