import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import type { TopProduct, ERPFilters } from '../types';

export function useERPTopProducts(filters: ERPFilters, limit = 20) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['erp-top-products', company?.id, filters, limit],
    queryFn: async (): Promise<TopProduct[]> => {
      if (!company?.id) return [];

      // Buscar pedidos do período (status entregue)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .is('cancelled_at', null);

      if (ordersError) throw ordersError;
      if (!orders?.length) return [];

      const orderIds = orders.map(o => o.id);

      // Buscar itens desses pedidos
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, product_name, quantity, unit_price')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Agrupar por produto
      const byProduct = new Map<string, TopProduct>();

      items?.forEach(item => {
        const key = item.product_id || item.product_name;
        const existing = byProduct.get(key) || {
          product_id: item.product_id || 'unknown',
          product_name: item.product_name || 'Produto sem nome',
          quantity_sold: 0,
          total_revenue: 0,
          avg_price: 0,
        };

        existing.quantity_sold += item.quantity || 1;
        existing.total_revenue += (item.unit_price || 0) * (item.quantity || 1);
        byProduct.set(key, existing);
      });

      // Calcular preço médio e ordenar
      return Array.from(byProduct.values())
        .map(p => ({
          ...p,
          avg_price: p.quantity_sold > 0 ? p.total_revenue / p.quantity_sold : 0,
        }))
        .sort((a, b) => b.quantity_sold - a.quantity_sold)
        .slice(0, limit);
    },
    enabled: !!company?.id,
  });
}
