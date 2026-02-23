import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import type { BackupConfig } from '../types';

export function useBackupConfig() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['backup-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      const { data, error } = await supabase
        .from('backup_configs')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as BackupConfig | null;
    },
    enabled: !!company?.id,
  });
}

export function useUpsertBackupConfig() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (config: Partial<BackupConfig>) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('backup_configs')
        .upsert({
          company_id: company.id,
          ...config,
        } as any, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-config'] });
      toast.success('Configuração de backup salva!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar configuração: ${error.message}`);
    },
  });
}
