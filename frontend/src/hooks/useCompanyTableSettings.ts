import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export interface CompanyTableSettings {
  company_id: string;
  no_consumption_minutes: number;
  request_table_number: boolean;
  allow_mobile_delete_printed_items: boolean;
  request_people_count: 'none' | 'on_open' | 'on_close';
  require_customer_identification: boolean;
  cash_register_mode: 'blind' | 'open';
  show_weather_on_closing: boolean;
  shift_report_email: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  // SMTP settings
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password: string | null;
  smtp_from_email: string | null;
  smtp_from_name: string | null;
  smtp_enabled: boolean;
  // Geo security settings
  geo_security_enabled: boolean;
  geo_security_radius_meters: number;
  geo_session_duration_minutes: number;
  created_at: string;
  updated_at: string;
}

const defaultSettings: Omit<CompanyTableSettings, 'company_id' | 'created_at' | 'updated_at'> = {
  no_consumption_minutes: 30,
  request_table_number: false,
  allow_mobile_delete_printed_items: false,
  request_people_count: 'none',
  require_customer_identification: false,
  cash_register_mode: 'open',
  show_weather_on_closing: false,
  shift_report_email: null,
  location_latitude: null,
  location_longitude: null,
  smtp_host: null,
  smtp_port: 587,
  smtp_user: null,
  smtp_password: null,
  smtp_from_email: null,
  smtp_from_name: null,
  smtp_enabled: false,
  geo_security_enabled: false,
  geo_security_radius_meters: 100,
  geo_session_duration_minutes: 30,
};

export function useCompanyTableSettings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['company-table-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('company_table_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        return { company_id: company.id, ...defaultSettings } as CompanyTableSettings;
      }
      
      return data as CompanyTableSettings;
    },
    enabled: !!company?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (updates: Partial<CompanyTableSettings>) => {
      if (!company?.id) throw new Error('No company');

      const { data, error } = await supabase
        .from('company_table_settings')
        .upsert(
          { company_id: company.id, ...updates, updated_at: new Date().toISOString() },
          { onConflict: 'company_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-table-settings'] });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    upsert: upsertMutation.mutateAsync,
    isPending: upsertMutation.isPending,
  };
}
