import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';

export interface PublicCompanySettings {
  allow_out_of_stock_sales: boolean;
  allow_zero_price_sales: boolean;
  show_unavailable_products: boolean;
  whatsapp_notify_delivery: boolean;
  whatsapp_notify_table: boolean;
  whatsapp_notify_comanda: boolean;
  whatsapp_notify_counter: boolean;
  whatsapp_notify_loyalty: boolean;
  whatsapp_notify_offers: boolean;
  whatsapp_notify_account_activity: boolean;
}

const defaultSettings: PublicCompanySettings = {
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

export function usePublicCompanySettings(companyId: string | undefined) {
  return useQuery({
    queryKey: ['public-company-settings', companyId],
    queryFn: async () => {
      if (!companyId) return defaultSettings;

      const { data, error } = await supabase
        .from('company_general_settings')
        .select('allow_out_of_stock_sales, allow_zero_price_sales, show_unavailable_products, whatsapp_notify_delivery, whatsapp_notify_table, whatsapp_notify_comanda, whatsapp_notify_counter, whatsapp_notify_loyalty, whatsapp_notify_offers, whatsapp_notify_account_activity')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching company settings:', error);
        return defaultSettings;
      }

      return data ? { ...defaultSettings, ...data } : defaultSettings;
    },
    enabled: !!companyId,
  });
}
