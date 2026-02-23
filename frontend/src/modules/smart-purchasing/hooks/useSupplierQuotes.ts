import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { SupplierQuote, QuoteFormData } from '../types';

export function useSupplierQuotes(erpItemId?: string) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const quotesQuery = useQuery({
    queryKey: ['supplier-quotes', company?.id, erpItemId],
    queryFn: async () => {
      if (!company?.id) return [];
      let query = (supabase as any)
        .from('supplier_quotes')
        .select(`
          *,
          erp_item:erp_items(id, name),
          supplier:erp_suppliers(id, name)
        `)
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('unit_price', { ascending: true });

      if (erpItemId) {
        query = query.eq('erp_item_id', erpItemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SupplierQuote[];
    },
    enabled: !!company?.id,
  });

  const createQuote = useMutation({
    mutationFn: async (data: QuoteFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Insert quote
      const { error } = await (supabase as any)
        .from('supplier_quotes')
        .insert({ ...data, company_id: company.id });
      if (error) throw error;

      // Record price history
      await (supabase as any)
        .from('supplier_price_history')
        .insert({
          company_id: company.id,
          erp_item_id: data.erp_item_id,
          supplier_id: data.supplier_id,
          unit_price: data.unit_price,
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-quotes'] });
      toast.success('Cotação cadastrada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao cadastrar cotação: ' + error.message);
    },
  });

  const updateQuote = useMutation({
    mutationFn: async ({ id, ...data }: QuoteFormData & { id: string }) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { error } = await (supabase as any)
        .from('supplier_quotes')
        .update(data)
        .eq('id', id);
      if (error) throw error;

      // Record price history if price changed
      if (data.unit_price) {
        await (supabase as any)
          .from('supplier_price_history')
          .insert({
            company_id: company.id,
            erp_item_id: data.erp_item_id,
            supplier_id: data.supplier_id,
            unit_price: data.unit_price,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-quotes'] });
      toast.success('Cotação atualizada');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar cotação: ' + error.message);
    },
  });

  const deactivateQuote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('supplier_quotes')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-quotes'] });
      toast.success('Cotação removida');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover cotação: ' + error.message);
    },
  });

  // Compare quotes for a specific item
  const compareQuotes = (itemId: string) => {
    return quotesQuery.data?.filter(q => q.erp_item_id === itemId) || [];
  };

  return {
    quotes: quotesQuery.data || [],
    isLoading: quotesQuery.isLoading,
    createQuote,
    updateQuote,
    deactivateQuote,
    compareQuotes,
  };
}
