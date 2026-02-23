import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface OnlineStoreSettings {
  company_id: string;
  is_online_open: boolean;
  manual_override: boolean;
  eta_adjust_minutes: number;
  updated_at: string;
  updated_by: string | null;
}

export interface OnlineStoreHour {
  id: string;
  company_id: string;
  weekday: number; // 0-6
  start_time: string;
  end_time: string;
  active: boolean;
  created_at: string;
}

export interface OnlineStoreEvent {
  id: string;
  company_id: string;
  event_type: string;
  previous_value: unknown;
  new_value: unknown;
  created_at: string;
  created_by: string | null;
}

export interface OnlineStoreStatus {
  allowed_to_order: boolean;
  reason: string;
  next_open_at: string | null;
  eta_adjust_minutes: number;
  is_manual_override: boolean;
}

const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function useOnlineStoreSettings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Fetch settings
  const settingsQuery = useQuery({
    queryKey: ['online-store-settings', company?.id],
    queryFn: async (): Promise<OnlineStoreSettings | null> => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('company_online_store_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;

      // If no settings exist, create default
      if (!data) {
        const { data: newSettings, error: insertError } = await supabase
          .from('company_online_store_settings')
          .insert({ company_id: company.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return newSettings as OnlineStoreSettings;
      }

      return data as OnlineStoreSettings;
    },
    enabled: !!company?.id,
  });

  // Fetch hours
  const hoursQuery = useQuery({
    queryKey: ['online-store-hours', company?.id],
    queryFn: async (): Promise<OnlineStoreHour[]> => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('company_online_store_hours')
        .select('*')
        .eq('company_id', company.id)
        .order('weekday')
        .order('start_time');

      if (error) throw error;
      return (data || []) as OnlineStoreHour[];
    },
    enabled: !!company?.id,
  });

  // Fetch events (last 50)
  const eventsQuery = useQuery({
    queryKey: ['online-store-events', company?.id],
    queryFn: async (): Promise<OnlineStoreEvent[]> => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('company_online_store_events')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as OnlineStoreEvent[];
    },
    enabled: !!company?.id,
  });

  // Check current status via RPC
  const statusQuery = useQuery({
    queryKey: ['online-store-status', company?.id],
    queryFn: async (): Promise<OnlineStoreStatus | null> => {
      if (!company?.id) return null;

      const { data, error } = await supabase.rpc('check_online_store_status', {
        p_company_id: company.id,
      });

      if (error) throw error;
      return data as unknown as OnlineStoreStatus;
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 2, // 2 min
    refetchInterval: 1000 * 60 * 5, // OTIMIZAÇÃO: 5 min (era 1min)
    refetchOnWindowFocus: false,
  });

  // Log event helper
  const logEvent = async (
    eventType: string,
    previousValue: unknown,
    newValue: unknown
  ) => {
    if (!company?.id) return;

    const { data: authData } = await supabase.auth.getUser();

    await supabase.from('company_online_store_events').insert([{
      company_id: company.id,
      event_type: eventType,
      previous_value: previousValue as Json,
      new_value: newValue as Json,
      created_by: authData.user?.id || null,
    }]);

    queryClient.invalidateQueries({ queryKey: ['online-store-events'] });
  };

  // Toggle open/close
  const toggleOpen = useMutation({
    mutationFn: async (newOpen: boolean) => {
      if (!company?.id) throw new Error('No company');

      const currentSettings = settingsQuery.data;

      await logEvent(
        newOpen ? 'manual_open' : 'manual_close',
        { is_online_open: currentSettings?.is_online_open },
        { is_online_open: newOpen }
      );

      const { error } = await supabase
        .from('company_online_store_settings')
        .update({ is_online_open: newOpen })
        .eq('company_id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-store-settings'] });
      queryClient.invalidateQueries({ queryKey: ['online-store-status'] });
    },
  });

  // Toggle override
  const toggleOverride = useMutation({
    mutationFn: async (newOverride: boolean) => {
      if (!company?.id) throw new Error('No company');

      const currentSettings = settingsQuery.data;

      await logEvent(
        newOverride ? 'override_on' : 'override_off',
        { manual_override: currentSettings?.manual_override },
        { manual_override: newOverride }
      );

      const { error } = await supabase
        .from('company_online_store_settings')
        .update({ manual_override: newOverride })
        .eq('company_id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-store-settings'] });
      queryClient.invalidateQueries({ queryKey: ['online-store-status'] });
    },
  });

  // Update ETA adjust
  const updateEtaAdjust = useMutation({
    mutationFn: async (newAdjust: number) => {
      if (!company?.id) throw new Error('No company');

      const currentSettings = settingsQuery.data;

      await logEvent(
        'eta_adjust',
        { eta_adjust_minutes: currentSettings?.eta_adjust_minutes },
        { eta_adjust_minutes: newAdjust }
      );

      const { error } = await supabase
        .from('company_online_store_settings')
        .update({ eta_adjust_minutes: newAdjust })
        .eq('company_id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-store-settings'] });
      queryClient.invalidateQueries({ queryKey: ['online-store-status'] });
      toast.success('Ajuste de ETA salvo');
    },
  });

  // Add hour
  const addHour = useMutation({
    mutationFn: async (hour: Omit<OnlineStoreHour, 'id' | 'company_id' | 'created_at'>) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase.from('company_online_store_hours').insert({
        company_id: company.id,
        weekday: hour.weekday,
        start_time: hour.start_time,
        end_time: hour.end_time,
        active: hour.active,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-store-hours'] });
      queryClient.invalidateQueries({ queryKey: ['online-store-status'] });
      toast.success('Horário adicionado');
    },
  });

  // Update hour
  const updateHour = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OnlineStoreHour> & { id: string }) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('company_online_store_hours')
        .update(updates)
        .eq('id', id)
        .eq('company_id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-store-hours'] });
      queryClient.invalidateQueries({ queryKey: ['online-store-status'] });
    },
  });

  // Delete hour
  const deleteHour = useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('company_online_store_hours')
        .delete()
        .eq('id', id)
        .eq('company_id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-store-hours'] });
      queryClient.invalidateQueries({ queryKey: ['online-store-status'] });
      toast.success('Horário removido');
    },
  });

  return {
    settings: settingsQuery.data,
    hours: hoursQuery.data || [],
    events: eventsQuery.data || [],
    status: statusQuery.data,
    isLoading: settingsQuery.isLoading || hoursQuery.isLoading,
    toggleOpen,
    toggleOverride,
    updateEtaAdjust,
    addHour,
    updateHour,
    deleteHour,
    weekdayNames: WEEKDAY_NAMES,
  };
}

// Public hook for menu pages (no auth required)
export function usePublicOnlineStoreStatus(companyId: string | undefined) {
  return useQuery({
    queryKey: ['public-online-store-status', companyId],
    queryFn: async (): Promise<OnlineStoreStatus | null> => {
      if (!companyId) return null;

      const { data, error } = await supabase.rpc('check_online_store_status', {
        p_company_id: companyId,
      });

      if (error) {
        console.error('Error checking online store status:', error);
        // Return open by default on error
        return {
          allowed_to_order: true,
          reason: 'default',
          next_open_at: null,
          eta_adjust_minutes: 0,
          is_manual_override: false,
        };
      }
      return data as unknown as OnlineStoreStatus;
    },
    enabled: !!companyId,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider stale after 30s
  });
}
