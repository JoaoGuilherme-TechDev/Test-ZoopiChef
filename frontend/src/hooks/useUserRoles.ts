import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'super_admin' | 'revendedor' | 'company_admin' | 'admin' | 'employee';

export function useUserRoles() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return { roles: [], isSuperAdmin: false, isRevendedor: false };

      // Get all roles for user
      const { data: rolesData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      const roles = (rolesData || []).map((r) => r.role as AppRole);

      return {
        roles,
        isSuperAdmin: roles.includes('super_admin'),
        isRevendedor: roles.includes('revendedor'),
        isCompanyAdmin: roles.includes('company_admin') || roles.includes('admin'),
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    roles: data?.roles || [],
    isSuperAdmin: data?.isSuperAdmin || false,
    isRevendedor: data?.isRevendedor || false,
    isCompanyAdmin: data?.isCompanyAdmin || false,
    isLoading,
  };
}
