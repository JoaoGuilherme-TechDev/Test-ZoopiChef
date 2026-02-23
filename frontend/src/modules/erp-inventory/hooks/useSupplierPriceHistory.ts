import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';

export interface SupplierPriceHistory {
  id: string;
  company_id: string;
  supplier_id: string;
  item_id: string;
  price_cents: number;
  unit: string;
  recorded_at: string;
  purchase_entry_id: string | null;
  created_at: string;
}

export function useSupplierPriceHistory(supplierId?: string, itemId?: string) {
  const { company } = useCompanyContext();

  const { data: priceHistory, isLoading } = useQuery({
    queryKey: ['supplier-price-history', company?.id, supplierId, itemId],
    queryFn: async () => {
      let query = supabase
        .from('supplier_price_history')
        .select('*')
        .eq('company_id', company!.id)
        .order('recorded_at', { ascending: false });

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      if (itemId) {
        query = query.eq('item_id', itemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SupplierPriceHistory[];
    },
    enabled: !!company?.id,
  });

  // Calculate price trends
  const getPriceTrend = (itemId: string) => {
    const itemPrices = priceHistory?.filter(p => p.item_id === itemId) || [];
    if (itemPrices.length < 2) return null;

    const latest = itemPrices[0].price_cents;
    const previous = itemPrices[1].price_cents;
    const change = ((latest - previous) / previous) * 100;

    return {
      current: latest,
      previous,
      changePercent: change,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  };

  return {
    priceHistory,
    isLoading,
    getPriceTrend,
  };
}
