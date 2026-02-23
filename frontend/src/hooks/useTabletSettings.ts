import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';

export interface TabletSettings {
  company_id: string;
  enabled: boolean;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  logo_url: string | null;
  footer_text: string;
  layout_mode: 'grid' | 'list';
  idle_images: string[];
  idle_message: string;
  idle_timeout_seconds: number;
  require_pin: boolean;
  admin_pin_hash: string | null;
  admin_password: string | null;
  allow_pix_payment: boolean;
  pix_provider: 'asaas' | 'mercadopago' | null;
  created_at: string;
  updated_at: string;
}

export function useTabletSettings() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['tablet_settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('tablet_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      return data as TabletSettings | null;
    },
    enabled: !!company?.id,
  });
}

export function useUpsertTabletSettings() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (data: Partial<TabletSettings>) => {
      if (!company?.id) throw new Error('Company not found');

      const { data: result, error } = await supabase
        .from('tablet_settings')
        .upsert({ company_id: company.id, ...data }, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tablet_settings'] });
    },
  });
}
