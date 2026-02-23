import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';

export interface TabletDevice {
  id: string;
  company_id: string;
  device_name: string;
  assigned_table_number: string | null;
  mode: 'TABLE_ONLY' | 'TABLE_WITH_COMANDA_QR';
  allow_ordering: boolean;
  allow_payment: boolean;
  allow_view_only: boolean;
  idle_timeout_seconds: number;
  theme_config: Record<string, unknown> | null;
  pin_hash: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useTabletDevices() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['tablet_devices', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('tablet_devices')
        .select('*')
        .eq('company_id', company.id)
        .order('device_name');

      if (error) throw error;
      return data as TabletDevice[];
    },
    enabled: !!company?.id,
  });
}

export function useCreateTabletDevice() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (data: Omit<Partial<TabletDevice>, 'theme_config'> & { device_name: string }) => {
      if (!company?.id) throw new Error('Company not found');

      const { data: result, error } = await supabase
        .from('tablet_devices')
        .insert([{ company_id: company.id, ...data }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tablet_devices'] });
    },
  });
}

export function useUpdateTabletDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, theme_config, ...updates }: Omit<Partial<TabletDevice>, 'theme_config'> & { id: string; theme_config?: Record<string, unknown> | null }) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (theme_config !== undefined) {
        updateData.theme_config = theme_config;
      }
      
      const { data, error } = await supabase
        .from('tablet_devices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tablet_devices'] });
    },
  });
}

export function useDeleteTabletDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tablet_devices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tablet_devices'] });
    },
  });
}
