import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';

interface CompanyAccessResponse {
  allowed: boolean;
  reason: 'active' | 'grace' | 'overdue' | 'trial_expired' | 'inactive' | 'trial' | 'canceled' | 'canceled_active';
  grace_until: string | null;
}

interface CompanyAccessStatus {
  hasAccess: boolean;
  reason?: 'active' | 'grace' | 'overdue' | 'trial_expired' | 'inactive' | 'trial' | 'canceled' | 'canceled_active';
  graceUntil?: string | null;
  companyId?: string;
  companyName?: string;
}

/**
 * Hook to check company access by slug for public pages.
 * 
 * IMPORTANT: For public menus, we are MORE PERMISSIVE:
 * - If company exists and is_active=true, we allow access even if subscription is not perfect
 * - The goal is to avoid blocking customers from seeing menus
 * - Only block if company is explicitly marked as inactive or doesn't exist
 */
export function useCompanyAccessBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['company_access_by_slug', slug],
    queryFn: async (): Promise<CompanyAccessStatus> => {
      if (!slug) return { hasAccess: false, reason: 'inactive' };

      // First, get company from public view
      const { data: company, error: companyError } = await supabase
        .from('public_companies')
        .select('id, name')
        .eq('slug', slug)
        .maybeSingle();

      if (companyError || !company) {
        console.warn('[useCompanyAccessBySlug] Company not found for slug:', slug);
        return { hasAccess: false, reason: 'inactive' };
      }

      // Check if company is active directly from companies table
      const { data: companyDetails, error: detailsError } = await supabase
        .from('companies')
        .select('is_active')
        .eq('id', company.id)
        .maybeSingle();

      // If we can't get details or company is explicitly inactive, block
      if (detailsError || !companyDetails) {
        console.warn('[useCompanyAccessBySlug] Could not fetch company details:', detailsError);
        // Be permissive - if we found in public_companies, allow access
        return {
          hasAccess: true,
          reason: 'active',
          companyId: company.id,
          companyName: company.name,
        };
      }

      // If company is explicitly marked as inactive, block
      if (companyDetails.is_active === false) {
        return {
          hasAccess: false,
          reason: 'inactive',
          companyId: company.id,
          companyName: company.name,
        };
      }

      // For public menus, be permissive - allow access if company exists and is_active is true
      // This avoids blocking customers from seeing menus due to subscription issues
      // The subscription check is more relevant for internal admin pages
      return {
        hasAccess: true,
        reason: 'active',
        companyId: company.id,
        companyName: company.name,
      };
    },
    enabled: !!slug && slug.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutos em cache
    retry: 3, // 3 tentativas em caso de falha
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
