import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface MarketingSettings {
  company_id: string;
  meta_pixel_id: string | null;
  ga4_measurement_id: string | null;
  gtm_container_id: string | null;
  enable_meta_pixel: boolean;
  enable_ga4: boolean;
  enable_gtm: boolean;
  enable_on_public_pages_only: boolean;
  enable_debug: boolean;
  facebook_page_url: string | null;
  instagram_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PublicMarketingSettings {
  company_id: string;
  meta_pixel_id: string | null;
  ga4_measurement_id: string | null;
  gtm_container_id: string | null;
  enable_meta_pixel: boolean;
  enable_ga4: boolean;
  enable_gtm: boolean;
  enable_on_public_pages_only: boolean;
  enable_debug: boolean;
  facebook_page_url: string | null;
  instagram_url: string | null;
}

/**
 * Hook for admin to manage marketing settings
 */
export function useMarketingSettings() {
  const { data: profile } = useProfile();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ['marketing_settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('company_marketing_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data as MarketingSettings | null;
    },
    enabled: !!companyId,
  });
}

/**
 * Hook to save (upsert) marketing settings
 */
export function useSaveMarketingSettings() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const companyId = profile?.company_id;

  return useMutation({
    mutationFn: async (settings: Omit<MarketingSettings, 'company_id' | 'created_at' | 'updated_at'>) => {
      if (!companyId) throw new Error('Company ID not found');

      // Check if settings exist
      const { data: existing } = await supabase
        .from('company_marketing_settings')
        .select('company_id')
        .eq('company_id', companyId)
        .maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('company_marketing_settings')
          .update(settings)
          .eq('company_id', companyId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('company_marketing_settings')
          .insert({ ...settings, company_id: companyId })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_settings', companyId] });
      toast.success('Configurações de marketing salvas!');
    },
    onError: (error) => {
      console.error('Error saving marketing settings:', error);
      toast.error('Erro ao salvar configurações');
    },
  });
}

/**
 * Hook to fetch public marketing settings for public pages (by company_id)
 */
export function usePublicMarketingSettings(companyId: string | undefined | null) {
  return useQuery({
    queryKey: ['public_marketing_settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('public_marketing_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data as PublicMarketingSettings | null;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes on public pages
  });
}
