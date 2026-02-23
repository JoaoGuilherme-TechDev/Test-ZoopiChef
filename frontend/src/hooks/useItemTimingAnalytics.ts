import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useMemo } from 'react';

interface ItemTimingStats {
  itemId: string;
  productName: string;
  orderId: string;
  orderNumber?: string;
  startedAt: string | null;
  finishedAt: string | null;
  prepTimeMinutes: number | null;
  itemStatus: string;
}

interface ItemTimingAnalytics {
  avgPrepTime: number;
  maxPrepTime: number;
  minPrepTime: number;
  totalItemsStarted: number;
  totalItemsFinished: number;
  itemsInProgress: ItemTimingStats[];
  recentCompleted: ItemTimingStats[];
  byProduct: {
    productName: string;
    avgPrepTime: number;
    count: number;
  }[];
}

export function useItemTimingAnalytics(startDate?: Date, endDate?: Date) {
  const { data: company } = useCompany();

  const { data: itemEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ['item-timing-events', company?.id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('order_item_status_events')
        .select(`
          id,
          order_id,
          order_item_id,
          from_status,
          to_status,
          changed_at,
          meta
        `)
        .eq('company_id', company.id)
        .order('changed_at', { ascending: false })
        .limit(500);

      if (startDate) {
        query = query.gte('changed_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('changed_at', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const { data: itemsWithTiming, isLoading: loadingItems } = useQuery({
    queryKey: ['items-with-timing', company?.id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!company?.id) return [];

      // Get items with started_at filled
      let query = supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          product_name,
          item_status,
          started_at,
          finished_at,
          orders!inner(
            company_id,
            order_number,
            created_at
          )
        `)
        .eq('orders.company_id', company.id)
        .not('started_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(200);

      if (startDate) {
        query = query.gte('started_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('started_at', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(item => ({
        itemId: item.id,
        productName: item.product_name,
        orderId: item.order_id,
        orderNumber: (item.orders as any)?.order_number?.toString(),
        startedAt: item.started_at,
        finishedAt: item.finished_at,
        itemStatus: item.item_status || 'pendente',
        prepTimeMinutes: item.started_at && item.finished_at
          ? (new Date(item.finished_at).getTime() - new Date(item.started_at).getTime()) / 60000
          : item.started_at && !item.finished_at
            ? (new Date().getTime() - new Date(item.started_at).getTime()) / 60000
            : null,
      }));
    },
    enabled: !!company?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const analytics = useMemo((): ItemTimingAnalytics | null => {
    if (!itemsWithTiming) return null;

    const completedItems = itemsWithTiming.filter(i => i.finishedAt && i.prepTimeMinutes);
    const inProgressItems = itemsWithTiming.filter(i => i.startedAt && !i.finishedAt);

    const prepTimes = completedItems
      .map(i => i.prepTimeMinutes!)
      .filter(t => t > 0 && t < 180); // Filter outliers (> 3 hours)

    const avgPrepTime = prepTimes.length > 0
      ? prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length
      : 0;

    const maxPrepTime = prepTimes.length > 0 ? Math.max(...prepTimes) : 0;
    const minPrepTime = prepTimes.length > 0 ? Math.min(...prepTimes) : 0;

    // Group by product
    const productMap: Record<string, { total: number; count: number }> = {};
    completedItems.forEach(item => {
      if (!productMap[item.productName]) {
        productMap[item.productName] = { total: 0, count: 0 };
      }
      productMap[item.productName].total += item.prepTimeMinutes || 0;
      productMap[item.productName].count += 1;
    });

    const byProduct = Object.entries(productMap)
      .map(([name, data]) => ({
        productName: name,
        avgPrepTime: data.count > 0 ? data.total / data.count : 0,
        count: data.count,
      }))
      .sort((a, b) => b.avgPrepTime - a.avgPrepTime)
      .slice(0, 10);

    return {
      avgPrepTime: Math.round(avgPrepTime * 10) / 10,
      maxPrepTime: Math.round(maxPrepTime * 10) / 10,
      minPrepTime: Math.round(minPrepTime * 10) / 10,
      totalItemsStarted: itemsWithTiming.length,
      totalItemsFinished: completedItems.length,
      itemsInProgress: inProgressItems.slice(0, 20),
      recentCompleted: completedItems.slice(0, 20),
      byProduct,
    };
  }, [itemsWithTiming]);

  return {
    itemEvents,
    itemsWithTiming,
    analytics,
    isLoading: loadingEvents || loadingItems,
  };
}
