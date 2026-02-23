import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';

export interface LicenseStatus {
  status: 'active' | 'trial' | 'free' | 'past_due' | 'blocked' | 'no_license' | 'not_found' | 'unknown';
  should_block: boolean;
  message: string;
  expires_at: string | null;
  days_remaining: number;
  days_overdue: number;
  license_type: 'trial' | 'free' | 'paid' | null;
  has_subscription: boolean;
  subscription_status: string | null;
  plan_name: string | null;
  blocked_at?: string;
}

export function useLicenseStatus(companyId?: string) {
  const { data: profile } = useProfile();
  const targetCompanyId = companyId || profile?.company_id;

  return useQuery({
    queryKey: ['license-status', targetCompanyId],
    queryFn: async () => {
      if (!targetCompanyId) return null;

      const { data, error } = await supabase.rpc('get_license_status', {
        company_uuid: targetCompanyId
      });

      if (error) {
        console.error('Error fetching license status:', error);
        throw error;
      }

      // Cast the JSON response to our type
      return data as unknown as LicenseStatus;
    },
    enabled: !!targetCompanyId,
    refetchInterval: 1000 * 60 * 15, // Check every 15 minutes
  });
}

// Hook para ativar empresa
export function useActivateCompany() {
  return async (
    companyId: string,
    activationDate: Date = new Date(),
    trialDays: number = 30,
    licenseType: 'trial' | 'free' | 'paid' = 'trial'
  ) => {
    const { data, error } = await supabase.rpc('activate_company', {
      company_uuid: companyId,
      activation_date: activationDate.toISOString(),
      trial_days: trialDays,
      p_license_type: licenseType
    });

    if (error) throw error;
    return data;
  };
}
