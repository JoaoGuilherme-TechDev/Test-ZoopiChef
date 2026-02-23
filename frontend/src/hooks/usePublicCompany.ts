import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';

export interface PublicCompany {
  id: string;
  name: string;
  slug: string;
  whatsapp: string | null;
  address: string | null;
}

/**
 * Fetch public company data by slug
 * Uses the public_companies view which only exposes safe fields
 */
export function usePublicCompanyBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['public_company', 'slug', slug],
    queryFn: async () => {
      if (!slug) return null;

      // Use the secure view that only exposes public fields
      const { data, error } = await supabase
        .from('public_companies')
        .select('id, name, slug, whatsapp, address')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data as PublicCompany | null;
    },
    enabled: !!slug,
  });
}

/**
 * Fetch public company data by ID
 * Uses the public_companies view which only exposes safe fields
 */
export function usePublicCompanyById(companyId: string | undefined) {
  return useQuery({
    queryKey: ['public_company', 'id', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      // Use the secure view that only exposes public fields
      const { data, error } = await supabase
        .from('public_companies')
        .select('id, name, slug, whatsapp, address')
        .eq('id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data as PublicCompany | null;
    },
    enabled: !!companyId,
  });
}
