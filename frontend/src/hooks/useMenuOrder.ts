import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export interface MenuItemOrder {
  id: string;
  company_id: string;
  item_key: string;
  group_key: string;
  display_order: number;
}

export function useMenuOrder() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: menuOrder = [], isLoading } = useQuery({
    queryKey: ['menu-order', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('menu_item_order')
        .select('*')
        .eq('company_id', company.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as MenuItemOrder[];
    },
    enabled: !!company?.id,
  });

  const updateOrder = useMutation({
    mutationFn: async (items: { item_key: string; group_key: string; display_order: number }[]) => {
      if (!company?.id) throw new Error('No company');

      // Upsert all items
      const upserts = items.map(item => ({
        company_id: company.id,
        item_key: item.item_key,
        group_key: item.group_key,
        display_order: item.display_order,
      }));

      const { error } = await supabase
        .from('menu_item_order')
        .upsert(upserts, { 
          onConflict: 'company_id,item_key',
          ignoreDuplicates: false 
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-order'] });
    },
  });

  // Helper function to get sorted items based on saved order
  const getSortedItems = <T extends { path: string }>(
    items: T[],
    groupKey: string
  ): T[] => {
    if (!menuOrder || menuOrder.length === 0) return items;

    const orderMap = new Map<string, number>();
    menuOrder
      .filter(mo => mo.group_key === groupKey)
      .forEach(mo => orderMap.set(mo.item_key, mo.display_order));

    // Only sort if we have order data for this group
    if (orderMap.size === 0) return items;

    return [...items].sort((a, b) => {
      const orderA = orderMap.get(a.path) ?? 999;
      const orderB = orderMap.get(b.path) ?? 999;
      return orderA - orderB;
    });
  };

  return {
    menuOrder,
    isLoading,
    updateOrder,
    getSortedItems,
  };
}
