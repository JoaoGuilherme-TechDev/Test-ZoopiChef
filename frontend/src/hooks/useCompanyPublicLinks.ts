import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';

export interface CompanyPublicLinks {
  id: string;
  company_id: string;
  // Legacy tokens (without prefix)
  menu_token: string;
  tv_token: string;
  roleta_token: string;
  kds_token: string | null;
  scale_token: string | null;
  // V2 tokens (with prefix)
  menu_token_v2: string | null;
  tv_token_v2: string | null;
  roleta_token_v2: string | null;
  kds_token_v2: string | null;
  scale_token_v2: string | null;
  created_at: string;
}

export function useCompanyPublicLinks() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['company_public_links', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      const { data, error } = await (supabase as any)
        .from('company_public_links')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();

      if (error) throw error;
      return data as CompanyPublicLinks | null;
    },
    enabled: !!profile?.company_id,
  });
}

// Helper to get the best token (v2 if available, otherwise legacy)
export function getBestToken(links: CompanyPublicLinks | null, tokenType: 'menu' | 'tv' | 'roleta' | 'kds' | 'scale'): string {
  if (!links) return '';
  const v2Key = `${tokenType}_token_v2` as keyof CompanyPublicLinks;
  const legacyKey = `${tokenType}_token` as keyof CompanyPublicLinks;
  return (links[v2Key] as string) || (links[legacyKey] as string) || '';
}

// Helper to get legacy token
export function getLegacyToken(links: CompanyPublicLinks | null, tokenType: 'menu' | 'tv' | 'roleta' | 'kds' | 'scale'): string {
  if (!links) return '';
  const legacyKey = `${tokenType}_token` as keyof CompanyPublicLinks;
  return (links[legacyKey] as string) || '';
}

// Resolve company by any token type (checks v2 first, then legacy)
export function useCompanyByToken(token: string | undefined, tokenType: 'menu' | 'tv' | 'roleta') {
  return useQuery({
    queryKey: ['company_by_token', token, tokenType],
    queryFn: async () => {
      if (!token) return null;

      const v2Column = `${tokenType}_token_v2`;
      const legacyColumn = `${tokenType}_token`;
      
      // Try v2 token first using or filter for flexibility
      const { data: linkData, error: linkError } = await supabase
        .from('company_public_links')
        .select('company_id')
        .or(`${v2Column}.eq.${token},${legacyColumn}.eq.${token}`)
        .maybeSingle();

      if (linkError) {
        console.error('Error finding company by token:', linkError);
        return null;
      }
      if (!linkData) {
        console.log('No company found for token:', token);
        return null;
      }

      // Use companies table directly for public access (with anon RLS policy)
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, slug, address, whatsapp, public_menu_layout, logo_url, primary_color, background_color')
        .eq('id', linkData.company_id)
        .maybeSingle();

      if (companyError) {
        console.error('Error fetching company:', companyError);
        return null;
      }

      return companyData;
    },
    enabled: !!token && token.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos - evita refetch desnecessário
    gcTime: 1000 * 60 * 15, // 15 minutos em cache
    retry: 3, // 3 tentativas
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
