import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from './useCompany';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from './useUserRoles';
import { toast } from 'sonner';

export interface WaiterPermissions {
  id: string;
  company_id: string;
  user_id: string;
  can_open_table: boolean;
  can_open_comanda: boolean;
  can_add_items: boolean;
  can_cancel_item: boolean;
  can_transfer_items: boolean;
  can_request_prebill: boolean;
  can_receive_payment: boolean;
  can_close_table_or_comanda: boolean;
  can_reopen: boolean;
  can_apply_discount: boolean;
  can_apply_surcharge: boolean;
  created_at: string;
  updated_at: string;
}

// Default permissions for new waiters
export const DEFAULT_WAITER_PERMISSIONS: Omit<WaiterPermissions, 'id' | 'company_id' | 'user_id' | 'created_at' | 'updated_at'> = {
  can_open_table: true,
  can_open_comanda: true,
  can_add_items: true,
  can_cancel_item: false,
  can_transfer_items: false,
  can_request_prebill: true,
  can_receive_payment: false,
  can_close_table_or_comanda: false,
  can_reopen: false,
  can_apply_discount: false,
  can_apply_surcharge: false,
};

/**
 * Hook to fetch current user's waiter permissions
 */
export function useWaiterPermissions() {
  const { user } = useAuth();
  const { data: company } = useCompany();
  const { data: userRole } = useUserRole();
  const { isSuperAdmin } = useUserRoles();

  const { data: permissions, isLoading, error } = useQuery({
    queryKey: ['waiter-permissions', user?.id, company?.id],
    queryFn: async () => {
      if (!user?.id || !company?.id) return null;

      const { data, error } = await supabase
        .from('waiter_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;

      // Se existir um registro "zerado" (tudo false), tratamos como não configurado
      // e voltamos para o padrão (para não travar o garçom sem querer).
      if (data) {
        const p = data as WaiterPermissions;
        const allFalse =
          !p.can_open_table &&
          !p.can_open_comanda &&
          !p.can_add_items &&
          !p.can_cancel_item &&
          !p.can_transfer_items &&
          !p.can_request_prebill &&
          !p.can_receive_payment &&
          !p.can_close_table_or_comanda &&
          !p.can_reopen &&
          !p.can_apply_discount &&
          !p.can_apply_surcharge;

        if (allFalse) return null;
      }

      return data as WaiterPermissions | null;
    },
    enabled: !!user?.id && !!company?.id && userRole?.role !== 'admin',
  });

  // Admin (dono/gestor) or SUPER_ADMIN sempre enxerga todas as ações no App Garçom.
  if (userRole?.role === 'admin' || isSuperAdmin) {
    return {
      permissions: {
        can_open_table: true,
        can_open_comanda: true,
        can_add_items: true,
        can_cancel_item: true,
        can_transfer_items: true,
        can_request_prebill: true,
        can_receive_payment: true,
        can_close_table_or_comanda: true,
        can_reopen: true,
        can_apply_discount: true,
        can_apply_surcharge: true,
      },
      rawPermissions: null,
      isLoading: false,
      error: null,
      hasPermission: () => true,
    };
  }

  // Merge with defaults (if no permissions set, use defaults)
  const effectivePermissions: Omit<WaiterPermissions, 'id' | 'company_id' | 'user_id' | 'created_at' | 'updated_at'> = {
    can_open_table: permissions?.can_open_table ?? DEFAULT_WAITER_PERMISSIONS.can_open_table,
    can_open_comanda: permissions?.can_open_comanda ?? DEFAULT_WAITER_PERMISSIONS.can_open_comanda,
    can_add_items: permissions?.can_add_items ?? DEFAULT_WAITER_PERMISSIONS.can_add_items,
    can_cancel_item: permissions?.can_cancel_item ?? DEFAULT_WAITER_PERMISSIONS.can_cancel_item,
    can_transfer_items: permissions?.can_transfer_items ?? DEFAULT_WAITER_PERMISSIONS.can_transfer_items,
    can_request_prebill: permissions?.can_request_prebill ?? DEFAULT_WAITER_PERMISSIONS.can_request_prebill,
    can_receive_payment: permissions?.can_receive_payment ?? DEFAULT_WAITER_PERMISSIONS.can_receive_payment,
    can_close_table_or_comanda: permissions?.can_close_table_or_comanda ?? DEFAULT_WAITER_PERMISSIONS.can_close_table_or_comanda,
    can_reopen: permissions?.can_reopen ?? DEFAULT_WAITER_PERMISSIONS.can_reopen,
    can_apply_discount: permissions?.can_apply_discount ?? DEFAULT_WAITER_PERMISSIONS.can_apply_discount,
    can_apply_surcharge: permissions?.can_apply_surcharge ?? DEFAULT_WAITER_PERMISSIONS.can_apply_surcharge,
  };

  return {
    permissions: effectivePermissions,
    rawPermissions: permissions,
    isLoading,
    error,
    hasPermission: (key: keyof typeof DEFAULT_WAITER_PERMISSIONS) => effectivePermissions[key],
  };
}

/**
 * Hook to manage waiter permissions for all users (admin only)
 */
export function useWaiterPermissionsAdmin() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: allPermissions = [], isLoading, error } = useQuery({
    queryKey: ['waiter-permissions-all', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('waiter_permissions')
        .select('*')
        .eq('company_id', company.id);

      if (error) throw error;
      return data as WaiterPermissions[];
    },
    enabled: !!company?.id,
  });

  const upsertPermissions = useMutation({
    mutationFn: async (data: { userId: string; permissions: Partial<Omit<WaiterPermissions, 'id' | 'company_id' | 'user_id' | 'created_at' | 'updated_at'>> }) => {
      if (!company?.id) throw new Error('No company');

      const { data: result, error } = await supabase
        .from('waiter_permissions')
        .upsert({
          company_id: company.id,
          user_id: data.userId,
          ...data.permissions,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiter-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['waiter-permissions-all'] });
      toast.success('Permissões atualizadas!');
    },
    onError: () => {
      toast.error('Erro ao atualizar permissões');
    },
  });

  const deletePermissions = useMutation({
    mutationFn: async (userId: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('waiter_permissions')
        .delete()
        .eq('company_id', company.id)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiter-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['waiter-permissions-all'] });
      toast.success('Permissões removidas!');
    },
    onError: () => {
      toast.error('Erro ao remover permissões');
    },
  });

  return {
    allPermissions,
    isLoading,
    error,
    upsertPermissions,
    deletePermissions,
    getPermissionsForUser: (userId: string) => allPermissions.find(p => p.user_id === userId),
  };
}
