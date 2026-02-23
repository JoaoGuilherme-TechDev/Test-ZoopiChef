import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export interface TimerFilters {
  startDate: Date;
  endDate: Date;
  delivererId?: string;
  categoryId?: string;
}

interface StageTime {
  orderId: string;
  orderNumber: number;
  customerName: string;
  acceptTime: number | null;
  prepTime: number | null;
  expeditionTime: number | null;
  deliveryTime: number | null;
  totalTime: number | null;
  status: string;
  createdAt: string;
  channel: string;
}

interface ProductDelay {
  productName: string;
  categoryName: string;
  avgPrepTime: number;
  maxPrepTime: number;
  orderCount: number;
  delayedCount: number;
  delayPercentage: number;
}

interface StageStats {
  stage: string;
  avgTime: number;
  maxTime: number;
  minTime: number;
  medianTime: number;
  delayedCount: number;
  totalCount: number;
  delayPercentage: number;
}

interface HourlyDelay {
  hour: number;
  avgTotal: number;
  orderCount: number;
  delayedCount: number;
}

interface DelivererDelay {
  id: string;
  name: string;
  avgDeliveryTime: number;
  maxDeliveryTime: number;
  deliveryCount: number;
  delayedCount: number;
}

export function useTimerAnalytics(filters: TimerFilters) {
  const { data: company } = useCompany();

  // Fetch all orders with timestamps for detailed analysis
  const { data: orderTimings, isLoading: loadingOrders } = useQuery({
    queryKey: ['timer-orders', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return [];

      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          status,
          order_type,
          created_at,
          accepted_at,
          ready_at,
          dispatched_at,
          delivered_at,
          deliverer_id
        `)
        .eq('company_id', company.id)
        .not('status', 'eq', 'cancelado')
        .or(`and(status.eq.entregue,delivered_at.gte.${startIso},delivered_at.lte.${endIso}),and(status.neq.entregue,created_at.gte.${startIso},created_at.lte.${endIso})`)
        .order('created_at', { ascending: false })
        .limit(500); // Limit for performance

      if (error) throw error;

      return orders?.map(order => {
        const created = new Date(order.created_at);
        const accepted = order.accepted_at ? new Date(order.accepted_at) : null;
        const ready = order.ready_at ? new Date(order.ready_at) : null;
        const dispatched = order.dispatched_at ? new Date(order.dispatched_at) : null;
        const delivered = order.delivered_at ? new Date(order.delivered_at) : null;

        return {
          orderId: order.id,
          orderNumber: order.order_number || 0,
          customerName: order.customer_name || 'Sem nome',
          status: order.status,
          channel: order.order_type || 'delivery',
          createdAt: order.created_at,
          acceptTime: accepted ? Math.round((accepted.getTime() - created.getTime()) / (1000 * 60)) : null,
          prepTime: accepted && ready ? Math.round((ready.getTime() - accepted.getTime()) / (1000 * 60)) : null,
          expeditionTime: ready && dispatched ? Math.round((dispatched.getTime() - ready.getTime()) / (1000 * 60)) : null,
          deliveryTime: dispatched && delivered ? Math.round((delivered.getTime() - dispatched.getTime()) / (1000 * 60)) : null,
          totalTime: delivered ? Math.round((delivered.getTime() - created.getTime()) / (1000 * 60)) : null,
        } as StageTime;
      }) || [];
    },
    enabled: !!company?.id,
    staleTime: 30000, // 30 seconds
  });

  // Calculate stage statistics
  const { data: stageStats, isLoading: loadingStages } = useQuery({
    queryKey: ['timer-stages', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return [];

      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, accepted_at, ready_at, dispatched_at, delivered_at')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('delivered_at', startIso)
        .lte('delivered_at', endIso)
        .limit(500);

      if (error) throw error;

      const stages = {
        aceite: [] as number[],
        preparo: [] as number[],
        expedicao: [] as number[],
        entrega: [] as number[],
      };

      // Thresholds for delay (in minutes)
      const thresholds = {
        aceite: 5,
        preparo: 20,
        expedicao: 10,
        entrega: 30,
      };

      orders?.forEach(order => {
        const created = new Date(order.created_at);
        const accepted = order.accepted_at ? new Date(order.accepted_at) : null;
        const ready = order.ready_at ? new Date(order.ready_at) : null;
        const dispatched = order.dispatched_at ? new Date(order.dispatched_at) : null;
        const delivered = order.delivered_at ? new Date(order.delivered_at) : null;

        if (accepted) {
          stages.aceite.push((accepted.getTime() - created.getTime()) / (1000 * 60));
        }
        if (accepted && ready) {
          stages.preparo.push((ready.getTime() - accepted.getTime()) / (1000 * 60));
        }
        if (ready && dispatched) {
          stages.expedicao.push((dispatched.getTime() - ready.getTime()) / (1000 * 60));
        }
        if (dispatched && delivered) {
          stages.entrega.push((delivered.getTime() - dispatched.getTime()) / (1000 * 60));
        }
      });

      const calcStats = (times: number[], stageName: string, threshold: number): StageStats => {
        if (times.length === 0) {
          return {
            stage: stageName,
            avgTime: 0,
            maxTime: 0,
            minTime: 0,
            medianTime: 0,
            delayedCount: 0,
            totalCount: 0,
            delayPercentage: 0,
          };
        }

        const sorted = [...times].sort((a, b) => a - b);
        const delayedCount = times.filter(t => t > threshold).length;

        return {
          stage: stageName,
          avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
          maxTime: Math.round(Math.max(...times)),
          minTime: Math.round(Math.min(...times)),
          medianTime: Math.round(sorted[Math.floor(sorted.length / 2)]),
          delayedCount,
          totalCount: times.length,
          delayPercentage: Math.round((delayedCount / times.length) * 100),
        };
      };

      return [
        calcStats(stages.aceite, 'Aceite', thresholds.aceite),
        calcStats(stages.preparo, 'Preparo', thresholds.preparo),
        calcStats(stages.expedicao, 'Expedição', thresholds.expedicao),
        calcStats(stages.entrega, 'Entrega', thresholds.entrega),
      ];
    },
    enabled: !!company?.id,
    staleTime: 30000,
  });

  // Fetch product delays
  const { data: productDelays, isLoading: loadingProducts } = useQuery({
    queryKey: ['timer-products', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data: items, error } = await (supabase
        .from('order_items') as any)
        .select(`
          product_name,
          product:products(category:categories(name)),
          order:orders!inner(
            company_id,
            created_at,
            accepted_at,
            ready_at,
            status
          )
        `)
        .eq('order.company_id', company.id)
        .gte('order.created_at', startOfDay(filters.startDate).toISOString())
        .lte('order.created_at', endOfDay(filters.endDate).toISOString());

      if (error) throw error;

      const productMap: Record<string, {
        productName: string;
        categoryName: string;
        prepTimes: number[];
        delayedCount: number;
      }> = {};

      const PREP_THRESHOLD = 20; // minutes

      items?.forEach((item: any) => {
        const order = item.order;
        if (!order?.accepted_at || !order?.ready_at) return;

        const accepted = new Date(order.accepted_at);
        const ready = new Date(order.ready_at);
        const prepTime = (ready.getTime() - accepted.getTime()) / (1000 * 60);

        const name = item.product_name;
        const categoryName = item.product?.category?.name || 'Sem categoria';

        if (!productMap[name]) {
          productMap[name] = {
            productName: name,
            categoryName,
            prepTimes: [],
            delayedCount: 0,
          };
        }

        productMap[name].prepTimes.push(prepTime);
        if (prepTime > PREP_THRESHOLD) {
          productMap[name].delayedCount++;
        }
      });

      return Object.values(productMap)
        .map(p => ({
          productName: p.productName,
          categoryName: p.categoryName,
          avgPrepTime: Math.round(p.prepTimes.reduce((a, b) => a + b, 0) / p.prepTimes.length),
          maxPrepTime: Math.round(Math.max(...p.prepTimes)),
          orderCount: p.prepTimes.length,
          delayedCount: p.delayedCount,
          delayPercentage: Math.round((p.delayedCount / p.prepTimes.length) * 100),
        }))
        .sort((a, b) => b.avgPrepTime - a.avgPrepTime)
        .slice(0, 20) as ProductDelay[];
    },
    enabled: !!company?.id,
  });

  // Fetch hourly delay patterns
  const { data: hourlyDelays, isLoading: loadingHourly } = useQuery({
    queryKey: ['timer-hourly', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return [];

      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, delivered_at, status')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('delivered_at', startIso)
        .lte('delivered_at', endIso);

      if (error) throw error;

      const hourlyMap: Record<number, { totalTimes: number[]; delayedCount: number }> = {};

      for (let h = 0; h < 24; h++) {
        hourlyMap[h] = { totalTimes: [], delayedCount: 0 };
      }

      const TOTAL_THRESHOLD = 45; // minutes

      orders?.forEach(order => {
        if (!order.delivered_at) return;

        const created = new Date(order.created_at);
        const delivered = new Date(order.delivered_at);
        const totalTime = (delivered.getTime() - created.getTime()) / (1000 * 60);
        const hour = created.getHours();

        hourlyMap[hour].totalTimes.push(totalTime);
        if (totalTime > TOTAL_THRESHOLD) {
          hourlyMap[hour].delayedCount++;
        }
      });

      return Object.entries(hourlyMap)
        .map(([hour, data]) => ({
          hour: parseInt(hour),
          avgTotal: data.totalTimes.length > 0 
            ? Math.round(data.totalTimes.reduce((a, b) => a + b, 0) / data.totalTimes.length)
            : 0,
          orderCount: data.totalTimes.length,
          delayedCount: data.delayedCount,
        }))
        .filter(h => h.orderCount > 0) as HourlyDelay[];
    },
    enabled: !!company?.id,
  });

  // Fetch deliverer delays
  const { data: delivererDelays, isLoading: loadingDeliverers } = useQuery({
    queryKey: ['timer-deliverers', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return [];

      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          dispatched_at,
          delivered_at,
          deliverer:deliverers(id, name)
        `)
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .not('deliverer_id', 'is', null)
        .gte('delivered_at', startIso)
        .lte('delivered_at', endIso);

      if (error) throw error;

      const delivererMap: Record<string, {
        id: string;
        name: string;
        deliveryTimes: number[];
        delayedCount: number;
      }> = {};

      const DELIVERY_THRESHOLD = 30; // minutes

      orders?.forEach((order: any) => {
        if (!order.dispatched_at || !order.delivered_at || !order.deliverer) return;

        const dispatched = new Date(order.dispatched_at);
        const delivered = new Date(order.delivered_at);
        const deliveryTime = (delivered.getTime() - dispatched.getTime()) / (1000 * 60);

        const deliverer = order.deliverer;

        if (!delivererMap[deliverer.id]) {
          delivererMap[deliverer.id] = {
            id: deliverer.id,
            name: deliverer.name,
            deliveryTimes: [],
            delayedCount: 0,
          };
        }

        delivererMap[deliverer.id].deliveryTimes.push(deliveryTime);
        if (deliveryTime > DELIVERY_THRESHOLD) {
          delivererMap[deliverer.id].delayedCount++;
        }
      });

      return Object.values(delivererMap)
        .map(d => ({
          id: d.id,
          name: d.name,
          avgDeliveryTime: Math.round(d.deliveryTimes.reduce((a, b) => a + b, 0) / d.deliveryTimes.length),
          maxDeliveryTime: Math.round(Math.max(...d.deliveryTimes)),
          deliveryCount: d.deliveryTimes.length,
          delayedCount: d.delayedCount,
        }))
        .sort((a, b) => b.avgDeliveryTime - a.avgDeliveryTime) as DelivererDelay[];
    },
    enabled: !!company?.id,
  });

  // Calculate bottleneck summary
  const bottleneckSummary = stageStats ? (() => {
    const worst = [...stageStats].sort((a, b) => b.delayPercentage - a.delayPercentage)[0];
    const slowest = [...stageStats].sort((a, b) => b.avgTime - a.avgTime)[0];
    
    return {
      worstStage: worst,
      slowestStage: slowest,
      totalDelayedOrders: stageStats.reduce((sum, s) => sum + s.delayedCount, 0),
      recommendation: worst?.stage === 'Aceite' 
        ? 'Equipe demora para aceitar pedidos. Considere alertas sonoros ou notificações.'
        : worst?.stage === 'Preparo'
        ? 'Cozinha sobrecarregada. Avalie a capacidade de produção ou simplifique o cardápio.'
        : worst?.stage === 'Expedição'
        ? 'Pedidos prontos aguardando muito. Melhore a comunicação com entregadores.'
        : worst?.stage === 'Entrega'
        ? 'Entregas demoradas. Avalie rotas, trânsito ou performance dos entregadores.'
        : 'Operação dentro dos parâmetros normais.',
    };
  })() : null;

  return {
    orderTimings,
    stageStats,
    productDelays,
    hourlyDelays,
    delivererDelays,
    bottleneckSummary,
    isLoading: loadingOrders || loadingStages || loadingProducts || loadingHourly || loadingDeliverers,
  };
}
