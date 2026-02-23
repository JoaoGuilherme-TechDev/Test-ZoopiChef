import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import type { DiscountAnalysis, ERPFilters } from '../types';

// Nota: A tabela orders não possui coluna 'discount'.
// Este hook retornará valores zerados até que a estrutura seja atualizada
// ou os descontos sejam calculados de outra forma (ex: via coupons).

export function useERPDiscounts(filters: ERPFilters) {
  const { data: company } = useCompany();

  const discountsByPeriod = useQuery({
    queryKey: ['erp-discounts-by-period', company?.id, filters],
    queryFn: async (): Promise<DiscountAnalysis[]> => {
      if (!company?.id) return [];

      // Buscar pedidos - sem coluna discount
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, created_at')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .is('cancelled_at', null);

      if (error) throw error;

      // Agrupar por data (sem descontos reais por enquanto)
      const byDate = new Map<string, DiscountAnalysis>();

      orders?.forEach(order => {
        const date = order.created_at.split('T')[0];
        const existing = byDate.get(date) || {
          date,
          total_discounts: 0,
          coupon_discounts: 0,
          manual_discounts: 0,
          orders_with_discount: 0,
          avg_discount_percent: 0,
        };
        byDate.set(date, existing);
      });

      return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!company?.id,
  });

  const totals = useQuery({
    queryKey: ['erp-discounts-totals', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .is('cancelled_at', null);

      if (error) throw error;

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      return {
        total_orders: orders?.length || 0,
        orders_with_discount: 0,
        total_discounts: 0,
        coupon_discounts: 0,
        manual_discounts: 0,
        avg_discount_percent: 0,
        discount_rate: 0,
        _note: 'Coluna discount não existe na tabela orders',
      };
    },
    enabled: !!company?.id,
  });

  return {
    discountsByPeriod: discountsByPeriod.data || [],
    totals: totals.data,
    isLoading: discountsByPeriod.isLoading || totals.isLoading,
  };
}
