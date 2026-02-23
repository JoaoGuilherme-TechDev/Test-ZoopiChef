import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export interface KDSSettings {
  company_id: string;
  warn_after_minutes: number;
  danger_after_minutes: number;
  max_new_minutes: number | null;
  max_preparing_minutes: number | null;
  max_ready_minutes: number | null;
  max_dispatched_minutes: number | null;
  kitchen_capacity_units_per_10min: number | null;
  dynamic_eta_enabled: boolean | null;
  dynamic_eta_min_extra_minutes: number | null;
  dynamic_eta_max_extra_minutes: number | null;
  warn_load_ratio: number | null;
  danger_load_ratio: number | null;
  current_eta_extra_minutes: number | null;
  current_load_level: string | null;
  kds_multi_stage_enabled: boolean | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<KDSSettings, 'company_id' | 'created_at' | 'updated_at'> = {
  warn_after_minutes: 10,
  danger_after_minutes: 20,
  max_new_minutes: null,
  max_preparing_minutes: null,
  max_ready_minutes: null,
  max_dispatched_minutes: null,
  kitchen_capacity_units_per_10min: 20,
  dynamic_eta_enabled: false,
  dynamic_eta_min_extra_minutes: 0,
  dynamic_eta_max_extra_minutes: 60,
  warn_load_ratio: 0.9,
  danger_load_ratio: 1.1,
  current_eta_extra_minutes: 0,
  current_load_level: 'normal',
  kds_multi_stage_enabled: false,
};

export function useKDSSettings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['kds-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('company_kds_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      return data as KDSSettings | null;
    },
    enabled: !!company?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<Omit<KDSSettings, 'company_id' | 'created_at' | 'updated_at'>>) => {
      if (!company?.id) throw new Error('No company');

      const { data, error } = await supabase
        .from('company_kds_settings')
        .upsert({
          company_id: company.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-settings'] });
    },
  });

  return {
    settings: settings || { ...DEFAULT_SETTINGS, company_id: company?.id || '' } as KDSSettings,
    isLoading,
    updateSettings,
    DEFAULT_SETTINGS,
  };
}
