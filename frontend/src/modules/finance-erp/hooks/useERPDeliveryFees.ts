import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import type { DeliveryFeeAnalysis, ERPFilters } from '../types';

export function useERPDeliveryFees(filters: ERPFilters) {
  const { data: company } = useCompany();

  const feesByPeriod = useQuery({
    queryKey: ['erp-delivery-fees-by-period', company?.id, filters],
    queryFn: async (): Promise<DeliveryFeeAnalysis[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, delivery_fee, receipt_type, created_at')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .is('cancelled_at', null);

      if (error) throw error;

      // Agrupar por data
      const byDate = new Map<string, { fees: number; deliveries: number; revenue: number }>();

      orders?.forEach(order => {
        const date = order.created_at.split('T')[0];
        const isDelivery = order.receipt_type === 'delivery' || (order.delivery_fee || 0) > 0;

        const existing = byDate.get(date) || { fees: 0, deliveries: 0, revenue: 0 };
        existing.revenue += order.total || 0;
        if (isDelivery) {
          existing.fees += order.delivery_fee || 0;
          existing.deliveries += 1;
        }
        byDate.set(date, existing);
      });

      return Array.from(byDate.entries()).map(([date, data]) => ({
        date,
        total_delivery_fees: data.fees,
        total_deliveries: data.deliveries,
        avg_fee: data.deliveries > 0 ? data.fees / data.deliveries : 0,
        fee_vs_revenue_percent: data.revenue > 0 ? (data.fees / data.revenue) * 100 : 0,
      })).sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!company?.id,
  });

  const totals = useQuery({
    queryKey: ['erp-delivery-fees-totals', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, delivery_fee, receipt_type')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .is('cancelled_at', null);

      if (error) throw error;

      const deliveryOrders = orders?.filter(o => 
        o.receipt_type === 'delivery' || (o.delivery_fee || 0) > 0
      ) || [];

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const totalFees = orders?.reduce((sum, o) => sum + (o.delivery_fee || 0), 0) || 0;

      return {
        total_orders: orders?.length || 0,
        delivery_orders: deliveryOrders.length,
        total_delivery_fees: totalFees,
        avg_fee: deliveryOrders.length > 0 ? totalFees / deliveryOrders.length : 0,
        fee_vs_revenue_percent: totalRevenue > 0 ? (totalFees / totalRevenue) * 100 : 0,
        delivery_rate: orders?.length 
          ? (deliveryOrders.length / orders.length) * 100 
          : 0,
      };
    },
    enabled: !!company?.id,
  });

  return {
    feesByPeriod: feesByPeriod.data || [],
    totals: totals.data,
    isLoading: feesByPeriod.isLoading || totals.isLoading,
  };
}
