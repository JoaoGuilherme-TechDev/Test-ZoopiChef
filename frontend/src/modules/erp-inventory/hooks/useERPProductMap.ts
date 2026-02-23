import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { ERPProductMap } from '../types';

export function useERPProductMap() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const mappingsQuery = useQuery({
    queryKey: ['erp-product-map', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('erp_product_map')
        .select(`
          *,
          product:products(id, name, price),
          erp_item:erp_items(*)
        `)
        .eq('company_id', company.id);
      if (error) throw error;
      return data as ERPProductMap[];
    },
    enabled: !!company?.id,
  });

  const createMapping = useMutation({
    mutationFn: async (data: { product_id: string; erp_item_id: string }) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      const { data: result, error } = await (supabase as any)
        .from('erp_product_map')
        .insert({
          company_id: company.id,
          product_id: data.product_id,
          erp_item_id: data.erp_item_id,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-product-map'] });
      toast.success('Mapeamento criado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar mapeamento: ' + error.message);
    },
  });

  const deleteMapping = useMutation({
    mutationFn: async (mappingId: string) => {
      const { error } = await (supabase as any)
        .from('erp_product_map')
        .delete()
        .eq('id', mappingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-product-map'] });
      toast.success('Mapeamento removido');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover mapeamento: ' + error.message);
    },
  });

  // Get ERP item ID from product ID
  const getERPItemForProduct = (productId: string): string | undefined => {
    const mapping = mappingsQuery.data?.find(m => m.product_id === productId);
    return mapping?.erp_item_id;
  };

  return {
    mappings: mappingsQuery.data || [],
    isLoading: mappingsQuery.isLoading,
    createMapping,
    deleteMapping,
    getERPItemForProduct,
  };
}
