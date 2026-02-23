import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export function useGoogleCalendarIntegration() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const integrationQuery = useQuery({
    queryKey: ['google-calendar-integration', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const syncEventsQuery = useQuery({
    queryKey: ['calendar-sync-events', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('calendar_sync_events')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const createIntegration = useMutation({
    mutationFn: async (params: { calendar_id: string }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .insert({
          company_id: company.id,
          calendar_id: params.calendar_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-integration'] });
    },
  });

  const updateIntegration = useMutation({
    mutationFn: async (params: { id: string; sync_reservations?: boolean; sync_scheduled_orders?: boolean }) => {
      const { id, ...updates } = params;

      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-integration'] });
    },
  });

  const deleteIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('google_calendar_integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-integration'] });
    },
  });

  return {
    integration: integrationQuery.data,
    syncEvents: syncEventsQuery.data || [],
    isLoading: integrationQuery.isLoading,
    createIntegration,
    updateIntegration,
    deleteIntegration,
  };
}
