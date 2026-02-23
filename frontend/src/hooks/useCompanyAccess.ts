import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyContext } from '@/contexts/CompanyContext';

interface CompanyAccessResponse {
  allowed: boolean;
  reason: 'active' | 'grace' | 'overdue' | 'trial_expired' | 'inactive';
  grace_until: string | null;
}

interface CompanyAccessStatus {
  hasAccess: boolean;
  reason?: 'active' | 'grace' | 'overdue' | 'trial_expired' | 'inactive';
  graceUntil?: string | null;
}

// OTIMIZAÇÃO: Usar CompanyContext diretamente em vez de useProfile separado
export function useCompanyAccess() {
  const { user } = useAuth();
  const { company, isLoading: companyLoading } = useCompanyContext();

  return useQuery({
    queryKey: ['company_access', company?.id],
    queryFn: async (): Promise<CompanyAccessStatus> => {
      if (!company?.id) {
        return { hasAccess: true, reason: 'active' }; // No company yet, allow access to create one
      }

      const { data, error } = await supabase
        .rpc('check_company_access', { company_uuid: company.id });

      if (error) {
        console.error('Error checking company access:', error);
        // Fail open for safety during development
        return { hasAccess: true, reason: 'active' };
      }

      const response = data as unknown as CompanyAccessResponse;
      
      return {
        hasAccess: response.allowed,
        reason: response.reason,
        graceUntil: response.grace_until
      };
    },
    enabled: !!user?.id && !companyLoading && !!company?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false, // Reduz refetch desnecessário
    gcTime: 1000 * 60 * 10, // Mantém cache por 10 min
  });
}

// For public pages that use tokens
export function useCompanyAccessByToken(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company_access_by_token', companyId],
    queryFn: async (): Promise<CompanyAccessStatus> => {
      if (!companyId) return { hasAccess: true, reason: 'active' }; // Allow if no company yet

      try {
        const { data, error } = await supabase
          .rpc('check_company_access', { company_uuid: companyId });

        if (error) {
          console.error('Error checking company access by token:', error);
          // Fail open for public pages - allow access on error
          return { hasAccess: true, reason: 'active' };
        }

        const response = data as unknown as CompanyAccessResponse;
        
        return {
          hasAccess: response.allowed,
          reason: response.reason,
          graceUntil: response.grace_until
        };
      } catch (err) {
        console.error('Exception checking company access:', err);
        // Fail open for public pages
        return { hasAccess: true, reason: 'active' };
      }
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Only retry once
  });
}
