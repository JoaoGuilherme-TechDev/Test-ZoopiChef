import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useProfile } from './useProfile';
import { useUserRoles } from './useUserRoles';
import { toast } from 'sonner';

export interface OperatorPermission {
  id: string;
  company_id: string;
  user_id: string;
  // Caixa
  can_withdrawal: boolean;
  can_supply: boolean;
  can_close_cash: boolean;
  can_open_cash: boolean;
  // Vendas
  can_cancel_sale: boolean;
  can_reverse_sale: boolean;
  can_apply_discount: boolean;
  max_discount_percent: number;
  // Fiscal
  can_issue_nfce: boolean;
  can_cancel_nfce: boolean;
  // Relatórios
  can_view_x_report: boolean;
  can_view_z_report: boolean;
  can_view_cash_history: boolean;
  // Gaveta
  can_open_drawer: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PERMISSIONS: Omit<OperatorPermission, 'id' | 'company_id' | 'user_id' | 'created_at' | 'updated_at'> = {
  can_withdrawal: false,
  can_supply: false,
  can_close_cash: true,
  can_open_cash: true,
  can_cancel_sale: false,
  can_reverse_sale: false,
  can_apply_discount: false,
  max_discount_percent: 0,
  can_issue_nfce: false,
  can_cancel_nfce: false,
  can_view_x_report: true,
  can_view_z_report: false,
  can_view_cash_history: false,
  can_open_drawer: true,
};

export function useOperatorPermissions() {
  const { data: company } = useCompany();
  const { data: profile } = useProfile();
  const { isSuperAdmin } = useUserRoles();
  const queryClient = useQueryClient();

  // Buscar permissões do usuário atual
  const { data: myPermissions, isLoading: loadingMyPermissions } = useQuery({
    queryKey: ['operator-permissions', 'my', profile?.id],
    queryFn: async () => {
      if (!profile?.id || !company?.id) return DEFAULT_PERMISSIONS;

      const { data, error } = await supabase
        .from('pdv_operator_permissions')
        .select('*')
        .eq('company_id', company.id)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching permissions:', error);
        return DEFAULT_PERMISSIONS;
      }

      return data || DEFAULT_PERMISSIONS;
    },
    enabled: !!profile?.id && !!company?.id,
  });

  // Buscar todas as permissões (para admins)
  const { data: allPermissions = [], isLoading: loadingAll } = useQuery({
    queryKey: ['operator-permissions', 'all', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('pdv_operator_permissions')
        .select('*')
        .eq('company_id', company.id);

      if (error) {
        console.error('Error fetching all permissions:', error);
        return [];
      }

      return data as OperatorPermission[];
    },
    enabled: !!company?.id,
  });

  // Salvar permissões de um operador
  const savePermissions = useMutation({
    mutationFn: async ({ userId, permissions }: { 
      userId: string; 
      permissions: Partial<OperatorPermission> 
    }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      // Verificar se já existe
      const { data: existing } = await supabase
        .from('pdv_operator_permissions')
        .select('id')
        .eq('company_id', company.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Atualizar
        const { error } = await supabase
          .from('pdv_operator_permissions')
          .update(permissions)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Inserir
        const { error } = await supabase
          .from('pdv_operator_permissions')
          .insert({
            company_id: company.id,
            user_id: userId,
            ...permissions,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-permissions'] });
      toast.success('Permissões salvas com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao salvar permissões');
    },
  });

  // Helper para verificar permissão específica
  // SUPER_ADMIN has unrestricted access to ALL permissions
  const hasPermission = (permission: keyof typeof DEFAULT_PERMISSIONS): boolean => {
    if (isSuperAdmin) return true;
    if (!myPermissions) return DEFAULT_PERMISSIONS[permission] as boolean;
    return (myPermissions as OperatorPermission)[permission] as boolean;
  };

  return {
    myPermissions: myPermissions as OperatorPermission | null,
    allPermissions,
    loadingMyPermissions,
    loadingAll,
    savePermissions,
    hasPermission,
    DEFAULT_PERMISSIONS,
  };
}
