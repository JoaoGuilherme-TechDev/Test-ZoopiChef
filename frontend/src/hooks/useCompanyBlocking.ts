import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useUserRoles } from './useUserRoles';

export interface CompanyBlockStatus {
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  plan_expires_at: string | null;
  last_payment_at: string | null;
}

export function useCompanyBlocking() {
  const { data: company } = useCompany();
  const { isSuperAdmin } = useUserRoles();

  const query = useQuery({
    queryKey: ['company-blocking', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('companies')
        .select('is_blocked, blocked_at, blocked_reason, plan_expires_at, last_payment_at')
        .eq('id', company.id)
        .maybeSingle();

      if (error) throw error;
      return data as CompanyBlockStatus | null;
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // OTIMIZAÇÃO: 10 minutos cache
    refetchOnWindowFocus: false, // OTIMIZAÇÃO: Não refetch ao focar
  });

  const isBlocked = query.data?.is_blocked ?? false;
  const isPlanExpired = query.data?.plan_expires_at 
    ? new Date(query.data.plan_expires_at) < new Date() 
    : false;

  // SUPER_ADMIN is never blocked - unrestricted access
  return {
    data: query.data,
    isLoading: query.isLoading,
    isBlocked: isSuperAdmin ? false : (isBlocked || isPlanExpired),
    blockedReason: isSuperAdmin ? null : (query.data?.blocked_reason || (isPlanExpired ? 'Plano expirado' : null)),
    planExpiresAt: query.data?.plan_expires_at,
  };
}

// Hook for public pages - checks if company is blocked by slug
export function usePublicCompanyBlocking(companyId?: string) {
  return useQuery({
    queryKey: ['public-company-blocking', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('companies')
        .select('is_blocked, blocked_reason, plan_expires_at')
        .eq('id', companyId)
        .maybeSingle();

      if (error) throw error;
      
      const isPlanExpired = data?.plan_expires_at 
        ? new Date(data.plan_expires_at) < new Date() 
        : false;

      return {
        isBlocked: data?.is_blocked || isPlanExpired,
        reason: data?.blocked_reason || (isPlanExpired ? 'Estabelecimento temporariamente indisponível' : null),
      };
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
