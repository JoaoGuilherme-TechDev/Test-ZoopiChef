import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';

export interface StockReportFilters {
  startDate?: string;
  endDate?: string;
  itemType?: string;
}

export interface StockValueData {
  erp_item_id: string;
  item_name: string;
  sku: string | null;
  item_type: string;
  current_stock: number;
  avg_cost: number;
  total_cost_value: number;
  sale_price: number | null;
  total_sale_value: number | null;
  margin_percent: number | null;
}

export interface StockSummary {
  total_items: number;
  total_cost_value: number;
  total_sale_value: number;
  avg_margin_percent: number;
  low_stock_items: number;
}

export interface StockMovementSummary {
  movement_type: string;
  movement_type_label: string;
  total_qty: number;
  total_value: number;
  count: number;
}

export function useStockValueReport(filters: StockReportFilters = {}) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['reports-stock-value', company?.id, filters],
    queryFn: async (): Promise<{ items: StockValueData[]; summary: StockSummary }> => {
      if (!company?.id) return { items: [], summary: { total_items: 0, total_cost_value: 0, total_sale_value: 0, avg_margin_percent: 0, low_stock_items: 0 } };

      let query = (supabase as any)
        .from('erp_items')
        .select('id, name, sku, item_type, current_stock, avg_cost, min_stock, track_stock')
        .eq('company_id', company.id)
        .eq('active', true)
        .eq('track_stock', true);

      if (filters.itemType) {
        query = query.eq('item_type', filters.itemType);
      }

      const { data: erpItems, error } = await query.order('name');
      if (error) throw error;

      // Buscar mapeamentos para preços de venda
      const { data: mappings } = await (supabase as any)
        .from('erp_product_map')
        .select(`
          erp_item_id,
          product:products(price)
        `)
        .eq('company_id', company.id);

      const items: StockValueData[] = (erpItems || []).map((item: any) => {
        const mapping = mappings?.find((m: any) => m.erp_item_id === item.id);
        const salePrice = mapping?.product?.price || null;
        const totalCost = (item.current_stock || 0) * (item.avg_cost || 0);
        const totalSale = salePrice ? (item.current_stock || 0) * salePrice : null;
        const marginPercent = salePrice && item.avg_cost > 0
          ? ((salePrice - item.avg_cost) / salePrice) * 100
          : null;

        return {
          erp_item_id: item.id,
          item_name: item.name,
          sku: item.sku,
          item_type: item.item_type,
          current_stock: item.current_stock || 0,
          avg_cost: item.avg_cost || 0,
          total_cost_value: totalCost,
          sale_price: salePrice,
          total_sale_value: totalSale,
          margin_percent: marginPercent,
        };
      });

      const summary: StockSummary = {
        total_items: items.length,
        total_cost_value: items.reduce((sum, i) => sum + i.total_cost_value, 0),
        total_sale_value: items.reduce((sum, i) => sum + (i.total_sale_value || 0), 0),
        avg_margin_percent: items.filter((i) => i.margin_percent !== null).length > 0
          ? items.filter((i) => i.margin_percent !== null).reduce((sum, i) => sum + (i.margin_percent || 0), 0) / items.filter((i) => i.margin_percent !== null).length
          : 0,
        low_stock_items: (erpItems || []).filter((i: any) => i.current_stock <= i.min_stock).length,
      };

      return { items, summary };
    },
    enabled: !!company?.id,
  });
}

export function useStockMovementsSummaryReport(filters: StockReportFilters) {
  const { data: company } = useCompany();

  const MOVEMENT_TYPE_LABELS: Record<string, string> = {
    purchase_in: 'Entrada (Compra)',
    sale_out: 'Saída (Venda)',
    adjust_in: 'Ajuste (+)',
    adjust_out: 'Ajuste (-)',
    waste_out: 'Perda/Desperdício',
    transfer: 'Transferência',
  };

  return useQuery({
    queryKey: ['reports-stock-movements-summary', company?.id, filters],
    queryFn: async (): Promise<StockMovementSummary[]> => {
      if (!company?.id) return [];

      let query = (supabase as any)
        .from('erp_stock_movements')
        .select('movement_type, qty, unit_cost_snapshot')
        .eq('company_id', company.id);

      if (filters.startDate) {
        query = query.gte('created_at', `${filters.startDate}T00:00:00`);
      }
      if (filters.endDate) {
        query = query.lte('created_at', `${filters.endDate}T23:59:59`);
      }

      const { data: movements, error } = await query;
      if (error) throw error;

      const typeMap = new Map<string, { qty: number; value: number; count: number }>();

      for (const mov of movements || []) {
        const existing = typeMap.get(mov.movement_type) || { qty: 0, value: 0, count: 0 };
        existing.qty += mov.qty || 0;
        existing.value += (mov.qty || 0) * (mov.unit_cost_snapshot || 0);
        existing.count += 1;
        typeMap.set(mov.movement_type, existing);
      }

      return Array.from(typeMap.entries()).map(([type, data]) => ({
        movement_type: type,
        movement_type_label: MOVEMENT_TYPE_LABELS[type] || type,
        total_qty: data.qty,
        total_value: data.value,
        count: data.count,
      }));
    },
    enabled: !!company?.id,
  });
}
