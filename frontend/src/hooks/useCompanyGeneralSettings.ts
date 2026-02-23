import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export interface CompanyGeneralSettings {
  company_id: string;
  
  // Customer settings
  default_customer_profile: string;
  default_legal_profile: string;
  allow_duplicate_cpf_cnpj: boolean;
  require_cpf_cnpj: boolean;
  show_extra_phones: boolean;
  allow_invalid_cep: boolean;
  allow_duplicate_email: boolean;
  phone_confirmation_required: boolean;
  birthdate_behavior: 'show' | 'require' | 'hide';
  cpf_behavior: 'show_optional' | 'hide' | 'show_required';
  
  // Cash register settings
  default_payable_bank_account_id: string | null;
  cash_shortage_chart_account_id: string | null;
  cash_surplus_chart_account_id: string | null;
  fee_reconciliation_chart_account_id: string | null;
  fiado_mode: 'post_paid' | 'pre_paid' | 'both';
  
  // Order settings
  allow_out_of_stock_sales: boolean;
  allow_zero_price_sales: boolean;
  show_unavailable_products: boolean;
  
  // WhatsApp notification settings
  whatsapp_notify_delivery: boolean;
  whatsapp_notify_table: boolean;
  whatsapp_notify_comanda: boolean;
  whatsapp_notify_counter: boolean;
  whatsapp_notify_loyalty: boolean;
  whatsapp_notify_offers: boolean;
  whatsapp_notify_account_activity: boolean;
  
  created_at: string;
  updated_at: string;
}

const defaultSettings: Omit<CompanyGeneralSettings, 'company_id' | 'created_at' | 'updated_at'> = {
  default_customer_profile: 'Cliente Padrão',
  default_legal_profile: 'Cliente Padrão',
  allow_duplicate_cpf_cnpj: false,
  require_cpf_cnpj: false,
  show_extra_phones: false,
  allow_invalid_cep: false,
  allow_duplicate_email: false,
  phone_confirmation_required: false,
  birthdate_behavior: 'show',
  cpf_behavior: 'show_optional',
  default_payable_bank_account_id: null,
  cash_shortage_chart_account_id: null,
  cash_surplus_chart_account_id: null,
  fee_reconciliation_chart_account_id: null,
  fiado_mode: 'post_paid',
  allow_out_of_stock_sales: false,
  allow_zero_price_sales: false,
  show_unavailable_products: false,
  whatsapp_notify_delivery: true,
  whatsapp_notify_table: true,
  whatsapp_notify_comanda: true,
  whatsapp_notify_counter: true,
  whatsapp_notify_loyalty: true,
  whatsapp_notify_offers: true,
  whatsapp_notify_account_activity: true,
};

export function useCompanyGeneralSettings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['company-general-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('company_general_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      
      // Return data with defaults if not found
      if (!data) {
        return { company_id: company.id, ...defaultSettings } as CompanyGeneralSettings;
      }
      
      return data as CompanyGeneralSettings;
    },
    enabled: !!company?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (updates: Partial<CompanyGeneralSettings>) => {
      if (!company?.id) throw new Error('No company');

      const { data, error } = await supabase
        .from('company_general_settings')
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
      queryClient.invalidateQueries({ queryKey: ['company-general-settings'] });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    upsert: upsertMutation.mutateAsync,
    isPending: upsertMutation.isPending,
  };
}
