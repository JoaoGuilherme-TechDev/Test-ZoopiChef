import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { CostCenter } from '../types';

export function useERPCostCenters() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const costCenters = useQuery({
    queryKey: ['erp-cost-centers', company?.id],
    queryFn: async (): Promise<CostCenter[]> => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('company_id', company.id)
        .order('code', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const createCostCenter = useMutation({
    mutationFn: async (data: Partial<CostCenter>) => {
      if (!company?.id) throw new Error('Sem empresa');

      const { data: created, error } = await supabase
        .from('cost_centers')
        .insert({
          company_id: company.id,
          code: data.code || '',
          name: data.name || '',
          description: data.description,
          parent_id: data.parent_id,
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-cost-centers'] });
      toast.success('Centro de custo criado!');
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const updateCostCenter = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CostCenter> & { id: string }) => {
      const { error } = await supabase
        .from('cost_centers')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-cost-centers'] });
      toast.success('Centro de custo atualizado!');
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const deleteCostCenter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-cost-centers'] });
      toast.success('Centro de custo removido!');
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const activeCostCenters = costCenters.data?.filter(c => c.is_active) || [];

  return {
    costCenters: costCenters.data || [],
    activeCostCenters,
    isLoading: costCenters.isLoading,
    createCostCenter,
    updateCostCenter,
    deleteCostCenter,
  };
}
