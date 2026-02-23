import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export interface WheelSettings {
  id: string;
  company_id: string;
  is_active: boolean;
  min_orders_first_spin: number;
  min_value_to_spin_again: number; // in cents
  prize_validity_days: number;
  max_pending_rewards: number;
  max_discount_cents: number;
  allowed_prize_types: string[];
  created_at: string;
  updated_at: string;
}

export function useWheelSettings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['wheel-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('wheel_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      return data as WheelSettings | null;
    },
    enabled: !!company?.id,
  });

  const upsertSettings = useMutation({
    mutationFn: async (updates: Partial<WheelSettings>) => {
      if (!company?.id) throw new Error('No company');

      const { data, error } = await supabase
        .from('wheel_settings')
        .upsert({ company_id: company.id, ...updates }, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wheel-settings'] });
    },
  });

  return {
    settings,
    isLoading,
    upsert: upsertSettings.mutateAsync,
    isPending: upsertSettings.isPending,
  };
}

// Public hook to get wheel settings by company ID
export function usePublicWheelSettings(companyId: string | undefined) {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['public-wheel-settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('wheel_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data as WheelSettings | null;
    },
    enabled: !!companyId,
  });

  return { settings, isLoading };
}
