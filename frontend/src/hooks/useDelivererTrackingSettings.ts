import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface DelivererTrackingSettings {
  company_id: string;
  enabled: boolean;
  enable_auto_dispatch: boolean;
  enable_region_grouping: boolean;
  max_deliveries_per_trip: number;
  max_grouping_radius_km: number;
  require_location_for_delivery: boolean;
  delivery_location_radius_meters: number;
  location_update_interval_seconds: number;
  auto_assign_to_available: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<DelivererTrackingSettings, 'company_id' | 'created_at' | 'updated_at'> = {
  enabled: false,
  enable_auto_dispatch: true,
  enable_region_grouping: true,
  max_deliveries_per_trip: 3,
  max_grouping_radius_km: 2.0,
  require_location_for_delivery: true,
  delivery_location_radius_meters: 100,
  location_update_interval_seconds: 15,
  auto_assign_to_available: true,
};

export function useDelivererTrackingSettings() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['deliverer-tracking-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      const { data, error } = await supabase
        .from('deliverer_tracking_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      
      return data as DelivererTrackingSettings | null;
    },
    enabled: !!company?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<DelivererTrackingSettings>) => {
      if (!company?.id) throw new Error('No company');

      const { data: existing } = await supabase
        .from('deliverer_tracking_settings')
        .select('company_id')
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('deliverer_tracking_settings')
          .update({
            ...newSettings,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', company.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('deliverer_tracking_settings')
          .insert({
            company_id: company.id,
            ...DEFAULT_SETTINGS,
            ...newSettings,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverer-tracking-settings', company?.id] });
      toast.success('Configurações salvas!');
    },
    onError: (error) => {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  // IMPORTANT: memoize to avoid recreating a new object on every render.
  // Otherwise, consumers using `useEffect([settings])` will reset local form state every render.
  const effectiveSettings: DelivererTrackingSettings = useMemo(() => {
    return (
      settings || {
        company_id: company?.id || '',
        ...DEFAULT_SETTINGS,
        created_at: '',
        updated_at: '',
      }
    );
  }, [settings, company?.id]);

  return {
    settings: effectiveSettings,
    isLoading,
    error,
    updateSettings,
  };
}

// Hook to check if tracking module is enabled for a company
export function useIsTrackingEnabled() {
  const { settings, isLoading } = useDelivererTrackingSettings();
  
  return {
    isEnabled: settings?.enabled ?? false,
    isLoading,
  };
}
