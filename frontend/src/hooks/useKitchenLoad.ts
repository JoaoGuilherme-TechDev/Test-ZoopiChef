import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export interface KitchenLoadSnapshot {
  id: string;
  company_id: string;
  created_at: string;
  backlog_orders_count: number;
  load_units: number;
  throughput_per_min: number;
  eta_extra_minutes: number;
  level: 'normal' | 'warn' | 'danger';
  reason: string | null;
}

export interface KitchenLoadState {
  current_eta_extra_minutes: number;
  current_load_level: 'normal' | 'warn' | 'danger';
  kitchen_capacity_units_per_10min: number;
  dynamic_eta_enabled: boolean;
  dynamic_eta_min_extra_minutes: number;
  dynamic_eta_max_extra_minutes: number;
  warn_load_ratio: number;
  danger_load_ratio: number;
}

const DEFAULT_STATE: KitchenLoadState = {
  current_eta_extra_minutes: 0,
  current_load_level: 'normal',
  kitchen_capacity_units_per_10min: 20,
  dynamic_eta_enabled: false,
  dynamic_eta_min_extra_minutes: 0,
  dynamic_eta_max_extra_minutes: 60,
  warn_load_ratio: 0.9,
  danger_load_ratio: 1.1,
};

export function useKitchenLoad() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Fetch current kitchen load state from KDS settings
  const { data: loadState, isLoading: stateLoading, refetch: refetchState } = useQuery({
    queryKey: ['kitchen-load-state', company?.id],
    queryFn: async () => {
      if (!company?.id) return DEFAULT_STATE;

      const { data, error } = await supabase
        .from('company_kds_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;

      // Cast to any to access new columns not yet in types
      const settings = data as Record<string, unknown> | null;

      return {
        current_eta_extra_minutes: (settings?.current_eta_extra_minutes as number) ?? 0,
        current_load_level: (settings?.current_load_level as 'normal' | 'warn' | 'danger') ?? 'normal',
        kitchen_capacity_units_per_10min: (settings?.kitchen_capacity_units_per_10min as number) ?? 20,
        dynamic_eta_enabled: (settings?.dynamic_eta_enabled as boolean) ?? false,
        dynamic_eta_min_extra_minutes: (settings?.dynamic_eta_min_extra_minutes as number) ?? 0,
        dynamic_eta_max_extra_minutes: (settings?.dynamic_eta_max_extra_minutes as number) ?? 60,
        warn_load_ratio: (settings?.warn_load_ratio as number) ?? 0.9,
        danger_load_ratio: (settings?.danger_load_ratio as number) ?? 1.1,
      } as KitchenLoadState;
    },
    enabled: !!company?.id,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 90, // OTIMIZAÇÃO: 90 segundos (era 60s)
    refetchOnWindowFocus: false,
  });

  // Fetch recent snapshots
  const { data: snapshots, isLoading: snapshotsLoading } = useQuery({
    queryKey: ['kitchen-load-snapshots', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('kitchen_load_snapshots')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as KitchenLoadSnapshot[];
    },
    enabled: !!company?.id,
  });

  // Mutation to calculate load (calls edge function)
  const calculateLoad = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No company');

      const { data, error } = await supabase.functions.invoke('ai-kitchen-load', {
        body: { company_id: company.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-load-state'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-load-snapshots'] });
    },
  });

  // Update kitchen capacity settings
  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<KitchenLoadState>) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('company_kds_settings')
        .upsert({
          company_id: company.id,
          ...updates,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-load-state'] });
      queryClient.invalidateQueries({ queryKey: ['kds-settings'] });
    },
  });

  return {
    loadState: loadState ?? DEFAULT_STATE,
    snapshots: snapshots ?? [],
    isLoading: stateLoading || snapshotsLoading,
    calculateLoad,
    updateSettings,
    refetchState,
  };
}

// Hook to get dynamic ETA for checkout
export function useCheckoutETA(baseETAMinutes: number = 30) {
  const { loadState } = useKitchenLoad();

  const dynamicETA = baseETAMinutes + (loadState?.current_eta_extra_minutes ?? 0);
  const isAdjusted = (loadState?.current_eta_extra_minutes ?? 0) > 0;
  const level = loadState?.current_load_level ?? 'normal';

  return {
    baseETA: baseETAMinutes,
    dynamicETA,
    etaExtra: loadState?.current_eta_extra_minutes ?? 0,
    isAdjusted,
    level,
    isEnabled: loadState?.dynamic_eta_enabled ?? false,
  };
}
