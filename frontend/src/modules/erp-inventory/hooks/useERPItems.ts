import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { ERPItem, ERPItemFormData, ERPItemType } from '../types';

export function useERPItems(itemType?: ERPItemType | ERPItemType[]) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const itemsQuery = useQuery({
    queryKey: ['erp-items', company?.id, itemType],
    queryFn: async () => {
      if (!company?.id) return [];
      let query = (supabase as any)
        .from('erp_items')
        .select('*, base_unit:erp_units(*)')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name');

      if (itemType) {
        if (Array.isArray(itemType)) {
          query = query.in('item_type', itemType);
        } else {
          query = query.eq('item_type', itemType);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ERPItem[];
    },
    enabled: !!company?.id,
  });

  const createItem = useMutation({
    mutationFn: async (data: ERPItemFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      const { data: result, error } = await (supabase as any)
        .from('erp_items')
        .insert({
          company_id: company.id,
          name: data.name,
          sku: data.sku || null,
          item_type: data.item_type,
          base_unit_id: data.base_unit_id || null,
          track_stock: data.track_stock,
          min_stock: data.min_stock || 0,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-items'] });
      toast.success('Item criado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar item: ' + error.message);
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...data }: ERPItemFormData & { id: string }) => {
      const { data: result, error } = await (supabase as any)
        .from('erp_items')
        .update({
          name: data.name,
          sku: data.sku || null,
          item_type: data.item_type,
          base_unit_id: data.base_unit_id || null,
          track_stock: data.track_stock,
          min_stock: data.min_stock || 0,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-items'] });
      toast.success('Item atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar item: ' + error.message);
    },
  });

  const deactivateItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('erp_items')
        .update({ active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-items'] });
      toast.success('Item desativado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao desativar item: ' + error.message);
    },
  });

  const lowStockItems = (itemsQuery.data || []).filter(
    item => item.track_stock && item.current_stock <= item.min_stock
  );

  return {
    items: itemsQuery.data || [],
    isLoading: itemsQuery.isLoading,
    lowStockItems,
    createItem,
    updateItem,
    deactivateItem,
  };
}
