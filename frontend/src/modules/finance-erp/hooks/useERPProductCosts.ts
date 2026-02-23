import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ERPProductCost } from '../types';

export function useERPProductCosts() {
  const { data: company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const productCosts = useQuery({
    queryKey: ['erp-product-costs', company?.id],
    queryFn: async (): Promise<ERPProductCost[]> => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('erp_product_costs')
        .select(`
          *,
          products:product_id(name)
        `)
        .eq('company_id', company.id)
        .is('effective_to', null) // Apenas custos ativos
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(c => ({
        ...c,
        product_name: (c.products as any)?.name,
      }));
    },
    enabled: !!company?.id,
  });

  const setProductCost = useMutation({
    mutationFn: async (data: {
      product_id: string;
      unit_cost_cents: number;
      optional_cost_cents?: number;
      notes?: string;
    }) => {
      if (!company?.id || !user?.id) throw new Error('Sem empresa/usuário');

      // Desativar custo anterior
      await supabase
        .from('erp_product_costs')
        .update({ effective_to: new Date().toISOString().split('T')[0] })
        .eq('product_id', data.product_id)
        .eq('company_id', company.id)
        .is('effective_to', null);

      // Criar novo custo
      const { data: created, error } = await supabase
        .from('erp_product_costs')
        .insert({
          company_id: company.id,
          product_id: data.product_id,
          unit_cost_cents: data.unit_cost_cents,
          optional_cost_cents: data.optional_cost_cents || 0,
          notes: data.notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-product-costs'] });
      toast.success('Custo atualizado!');
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const getProductCost = (productId: string): ERPProductCost | undefined => {
    return productCosts.data?.find(c => c.product_id === productId);
  };

  return {
    productCosts: productCosts.data || [],
    isLoading: productCosts.isLoading,
    setProductCost,
    getProductCost,
  };
}
