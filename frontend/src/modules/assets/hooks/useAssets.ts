import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { Asset, AssetFormData } from '../types';

export function useAssets() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const assetsQuery = useQuery({
    queryKey: ['assets', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('assets')
        .select('*')
        .eq('company_id', company.id)
        .neq('status', 'disposed')
        .order('name');
      if (error) throw error;
      return data as Asset[];
    },
    enabled: !!company?.id,
  });

  const createAsset = useMutation({
    mutationFn: async (data: AssetFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      const { error } = await (supabase as any)
        .from('assets')
        .insert({ ...data, company_id: company.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Ativo cadastrado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao cadastrar ativo: ' + error.message);
    },
  });

  const updateAsset = useMutation({
    mutationFn: async ({ id, ...data }: AssetFormData & { id: string }) => {
      const { error } = await (supabase as any)
        .from('assets')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Ativo atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar ativo: ' + error.message);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'operational' | 'maintenance' | 'broken' | 'disposed' }) => {
      const { error } = await (supabase as any)
        .from('assets')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Status atualizado');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  return {
    assets: assetsQuery.data || [],
    isLoading: assetsQuery.isLoading,
    createAsset,
    updateAsset,
    updateStatus,
  };
}
