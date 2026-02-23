import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import type { CMVData, ProductMargin, ERPFilters } from '../types';

export function useERPCMV(filters: ERPFilters) {
  const { data: company } = useCompany();

  const cmvData = useQuery({
    queryKey: ['erp-cmv', company?.id, filters],
    queryFn: async (): Promise<CMVData | null> => {
      if (!company?.id) return null;

      // Buscar pedidos entregues
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .is('cancelled_at', null);

      const orderIds = orders?.map(o => o.id) || [];
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      if (orderIds.length === 0) {
        return {
          period: `${filters.startDate} a ${filters.endDate}`,
          total_cost: 0,
          total_revenue: 0,
          cmv_percent: 0,
          products_without_cost: 0,
        };
      }

      // Buscar itens
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .in('order_id', orderIds);

      // Buscar custos
      const { data: costs } = await supabase
        .from('erp_product_costs')
        .select('product_id, unit_cost_cents, optional_cost_cents')
        .eq('company_id', company.id)
        .is('effective_to', null);

      const costsMap = new Map(costs?.map(c => [c.product_id, c]) || []);

      let totalCost = 0;
      const productIdsWithoutCost = new Set<string>();

      items?.forEach(item => {
        const cost = costsMap.get(item.product_id);
        if (cost) {
          totalCost += (cost.unit_cost_cents + cost.optional_cost_cents) * (item.quantity || 1);
        } else if (item.product_id) {
          productIdsWithoutCost.add(item.product_id);
        }
      });

      const totalCostReais = totalCost / 100;
      const cmvPercent = totalRevenue > 0 ? (totalCostReais / totalRevenue) * 100 : 0;

      return {
        period: `${filters.startDate} a ${filters.endDate}`,
        total_cost: totalCostReais,
        total_revenue: totalRevenue,
        cmv_percent: cmvPercent,
        products_without_cost: productIdsWithoutCost.size,
      };
    },
    enabled: !!company?.id,
  });

  const productMargins = useQuery({
    queryKey: ['erp-product-margins', company?.id, filters],
    queryFn: async (): Promise<ProductMargin[]> => {
      if (!company?.id) return [];

      // Buscar pedidos entregues
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .is('cancelled_at', null);

      const orderIds = orders?.map(o => o.id) || [];
      if (orderIds.length === 0) return [];

      // Buscar itens
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, product_name, quantity, unit_price')
        .in('order_id', orderIds);

      // Buscar custos
      const { data: costs } = await supabase
        .from('erp_product_costs')
        .select('product_id, unit_cost_cents, optional_cost_cents')
        .eq('company_id', company.id)
        .is('effective_to', null);

      const costsMap = new Map(costs?.map(c => [c.product_id, c]) || []);

      // Agrupar por produto
      const byProduct = new Map<string, {
        product_name: string;
        quantity: number;
        total_revenue: number;
        total_cost: number;
        has_cost: boolean;
      }>();

      items?.forEach(item => {
        const key = item.product_id || item.product_name;
        const cost = costsMap.get(item.product_id);
        const qty = item.quantity || 1;
        const revenue = (item.unit_price || 0) * qty;
        const itemCost = cost 
          ? ((cost.unit_cost_cents + cost.optional_cost_cents) / 100) * qty 
          : 0;

        const existing = byProduct.get(key) || {
          product_name: item.product_name || 'Produto sem nome',
          quantity: 0,
          total_revenue: 0,
          total_cost: 0,
          has_cost: !!cost,
        };

        existing.quantity += qty;
        existing.total_revenue += revenue;
        existing.total_cost += itemCost;
        byProduct.set(key, existing);
      });

      return Array.from(byProduct.entries()).map(([productId, data]) => {
        const unitCost = data.quantity > 0 ? data.total_cost / data.quantity : 0;
        const avgSalePrice = data.quantity > 0 ? data.total_revenue / data.quantity : 0;
        const marginValue = avgSalePrice - unitCost;
        const marginPercent = avgSalePrice > 0 ? (marginValue / avgSalePrice) * 100 : 0;

        return {
          product_id: productId,
          product_name: data.product_name,
          unit_cost: unitCost,
          avg_sale_price: avgSalePrice,
          margin_value: marginValue,
          margin_percent: marginPercent,
          quantity_sold: data.quantity,
          has_cost: data.has_cost,
        };
      }).sort((a, b) => b.quantity_sold - a.quantity_sold);
    },
    enabled: !!company?.id,
  });

  return {
    cmvData: cmvData.data,
    productMargins: productMargins.data || [],
    isLoading: cmvData.isLoading || productMargins.isLoading,
  };
}
