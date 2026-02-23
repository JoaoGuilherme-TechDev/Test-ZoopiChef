import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface ScaleConfig {
  id: string;
  company_id: string;
  name: string;
  model: string;
  baud_rate: number;
  data_bits: number;
  stop_bits: number;
  parity: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScaleConfigFormData {
  name: string;
  model: string;
  baud_rate: number;
  data_bits: number;
  stop_bits: number;
  parity: string;
  active: boolean;
}

export const SCALE_MODELS = [
  { value: 'toledo_prix_iii', label: 'Toledo Prix III' },
  { value: 'toledo_prix_iv', label: 'Toledo Prix IV' },
  { value: 'toledo_prix_5', label: 'Toledo Prix 5' },
  { value: 'filizola_platina', label: 'Filizola Platina' },
  { value: 'filizola_bp15', label: 'Filizola BP-15' },
  { value: 'urano_us_pop', label: 'Urano US Pop' },
  { value: 'urano_us_31', label: 'Urano US 31' },
  { value: 'elgin_dp15', label: 'Elgin DP-15' },
  { value: 'custom', label: 'Outro / Genérico' },
] as const;

export const BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200] as const;
export const DATA_BITS = [5, 6, 7, 8] as const;
export const STOP_BITS = [1, 1.5, 2] as const;
export const PARITY_OPTIONS = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'even', label: 'Par (Even)' },
  { value: 'odd', label: 'Ímpar (Odd)' },
  { value: 'mark', label: 'Mark' },
  { value: 'space', label: 'Space' },
] as const;

export function useScaleConfig() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ['scale-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await (supabase as any)
        .from('scale_config')
        .select('*')
        .eq('company_id', company.id)
        .eq('active', true)
        .maybeSingle();
      if (error) throw error;
      return data as ScaleConfig | null;
    },
    enabled: !!company?.id,
  });

  const allConfigsQuery = useQuery({
    queryKey: ['scale-configs', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('scale_config')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ScaleConfig[];
    },
    enabled: !!company?.id,
  });

  const createConfig = useMutation({
    mutationFn: async (formData: ScaleConfigFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      const { data, error } = await (supabase as any)
        .from('scale_config')
        .insert({
          company_id: company.id,
          ...formData,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scale-config'] });
      queryClient.invalidateQueries({ queryKey: ['scale-configs'] });
      toast.success('Configuração de balança salva!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  const updateConfig = useMutation({
    mutationFn: async ({ id, ...formData }: ScaleConfigFormData & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('scale_config')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scale-config'] });
      queryClient.invalidateQueries({ queryKey: ['scale-configs'] });
      toast.success('Configuração atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('scale_config')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scale-config'] });
      queryClient.invalidateQueries({ queryKey: ['scale-configs'] });
      toast.success('Configuração removida!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });

  return {
    config: configQuery.data,
    configs: allConfigsQuery.data || [],
    isLoading: configQuery.isLoading || allConfigsQuery.isLoading,
    createConfig,
    updateConfig,
    deleteConfig,
  };
}
