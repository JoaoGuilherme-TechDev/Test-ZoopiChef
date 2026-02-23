import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { SommelierSettings } from '../types';
import { toast } from 'sonner';

export function useSommelierSettings() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['sommelier_settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      const { data, error } = await supabase
        .from('sommelier_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      return data as SommelierSettings | null;
    },
    enabled: !!company?.id,
  });
}

export function useSommelierSettingsPublic(companyId: string | undefined) {
  return useQuery({
    queryKey: ['sommelier_settings_public', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('sommelier_settings')
        .select('*')
        .eq('company_id', companyId)
        .eq('enabled', true)
        .maybeSingle();

      if (error) throw error;
      return data as SommelierSettings | null;
    },
    enabled: !!companyId,
  });
}

export function useUpdateSommelierSettings() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (updates: Partial<SommelierSettings>) => {
      if (!company?.id) throw new Error('Company not found');

      // Check if settings exist
      const { data: existing } = await supabase
        .from('sommelier_settings')
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('sommelier_settings')
          .update(updates)
          .eq('company_id', company.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('sommelier_settings')
          .insert({
            company_id: company.id,
            ...updates,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sommelier_settings'] });
      toast.success('Configurações salvas!');
    },
    onError: (error) => {
      console.error('Error updating sommelier settings:', error);
      toast.error('Erro ao salvar configurações');
    },
  });
}
