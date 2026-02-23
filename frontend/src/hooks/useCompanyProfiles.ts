import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { useUserRoles } from './useUserRoles';
import { toast } from 'sonner';

export interface PermissionItem {
  key: string;
  label: string;
}

export interface PermissionGroup {
  group: string;
  items: PermissionItem[];
}

// Permission types available for each item
export const PERMISSION_TYPES = ['view', 'edit', 'delete'] as const;
export type PermissionType = typeof PERMISSION_TYPES[number];

export const PERMISSION_TYPE_LABELS: Record<PermissionType, string> = {
  view: 'Ver',
  edit: 'Alterar',
  delete: 'Excluir',
};

// All menu items grouped by section - matches AppSidebar structure
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: 'Principal',
    items: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'orders', label: 'Pedidos' },
      { key: 'phone_order', label: 'Pedido Ligação' },
      { key: 'tables', label: 'Mesas' },
      { key: 'comandas', label: 'Comandas' },
      { key: 'kds', label: 'KDS Cozinha' },
      { key: 'whatsapp', label: 'WhatsApp' },
      { key: 'chat_monitor', label: 'Chat Online' },
      { key: 'customers', label: 'Clientes' },
      { key: 'reviews', label: 'Avaliações' },
      { key: 'deliverers', label: 'Entregadores' },
      { key: 'deliverer_rankings', label: 'Ranking Entregas' },
      { key: 'settlement', label: 'Acerto' },
      { key: 'reports', label: 'Relatórios' },
      { key: 'reports_timers', label: 'Dashboard Tempos' },
      { key: 'loyalty', label: 'Fidelidade' },
      { key: 'internal_messages', label: 'Mensagens' },
      { key: 'self_checkout', label: 'Self Check-out' },
      { key: 'delivery_expedition', label: 'Expedição Entregadores' },
      { key: 'deliverer_badge', label: 'Crachá Entregador' },
      { key: 'operations_performance', label: 'Performance Operacional' },
    ],
  },
  {
    group: 'Financeiro',
    items: [
      { key: 'finance', label: 'Financeiro' },
      { key: 'cash_register', label: 'Controle de Caixa' },
      { key: 'cash_history', label: 'Histórico Caixas' },
      { key: 'payment_methods', label: 'Formas Pagamento' },
      { key: 'bank_accounts', label: 'Contas Bancárias' },
      { key: 'accounts_payable', label: 'Contas a Pagar' },
      { key: 'chart_of_accounts', label: 'Plano de Contas' },
      { key: 'customer_credits', label: 'Fiado' },
      { key: 'reports_fiado', label: 'Relatório Fiado' },
      { key: 'inventory', label: 'Estoque' },
      { key: 'finance_erp', label: 'ERP Financeiro' },
    ],
  },
  {
    group: 'ERP / Estoque',
    items: [
      { key: 'erp_items', label: 'Itens ERP' },
      { key: 'erp_purchases', label: 'Compras' },
      { key: 'erp_recipes', label: 'Fichas Técnicas' },
      { key: 'erp_stock', label: 'Estoque ERP' },
      { key: 'erp_movements', label: 'Movimentações' },
      { key: 'erp_inventory_count', label: 'Inventário' },
      { key: 'erp_cmv', label: 'CMV' },
      { key: 'erp_pricing', label: 'Precificação' },
      { key: 'erp_profit', label: 'Lucro' },
    ],
  },
  {
    group: 'Cardápio',
    items: [
      { key: 'categories', label: 'Categorias' },
      { key: 'subcategories', label: 'Subcategorias' },
      { key: 'products', label: 'Produtos' },
      { key: 'flavors', label: 'Sabores' },
      { key: 'optional_groups', label: 'Grupos Opcionais' },
      { key: 'flavor_highlight_groups', label: 'Destaques Sabor' },
      { key: 'batch_actions', label: 'Ações em Lote' },
    ],
  },
  {
    group: 'TV Display',
    items: [
      { key: 'tv_screens', label: 'Telas de TV' },
      { key: 'banners', label: 'Banners TV' },
    ],
  },
  {
    group: 'Marketing',
    items: [
      { key: 'campaigns', label: 'Campanhas' },
      { key: 'repurchase', label: 'Recompra' },
      { key: 'time_highlights', label: 'Destaque Horário' },
      { key: 'marketing', label: 'Marketing' },
      { key: 'prizes', label: 'Roleta Prêmios' },
      { key: 'coupons', label: 'Cupons' },
    ],
  },
  {
    group: 'Inteligência Artificial',
    items: [
      { key: 'ai_recommendations', label: 'IA Recomendações' },
      { key: 'ai_suggestions', label: 'Central de Sugestões' },
      { key: 'ai_menu_creative', label: 'Cardápio Criativo' },
      { key: 'ai_tv_scheduler', label: 'Agenda TV' },
      { key: 'demand_forecast', label: 'Previsão Demanda' },
      { key: 'qa', label: 'QA Testes' },
    ],
  },
  {
    group: 'Configurações',
    items: [
      { key: 'company', label: 'Empresa' },
      { key: 'settings_customers', label: 'Config. Clientes' },
      { key: 'settings_cash', label: 'Config. Caixa' },
      { key: 'settings_orders', label: 'Config. Pedidos' },
      { key: 'settings_table', label: 'Config. Mesas' },
      { key: 'settings_pedido_online', label: 'Pedido Online' },
      { key: 'settings_delivery', label: 'Taxas de Entrega' },
      { key: 'settings_pizza', label: 'Config. Pizza' },
      { key: 'settings_branding', label: 'Branding' },
      { key: 'settings_integrations', label: 'Integrações' },
      { key: 'settings_printing', label: 'Impressão' },
      { key: 'settings_wheel', label: 'Roleta' },
      { key: 'settings_ai', label: 'Config. IA' },
      { key: 'settings_layout', label: 'Layout Cardápio' },
      { key: 'settings_panic', label: 'Pânico' },
      { key: 'settings_sounds', label: 'Sons' },
      { key: 'users', label: 'Usuários' },
      { key: 'profiles', label: 'Perfis de Acesso' },
      { key: 'my_links', label: 'Meus Links' },
    ],
  },
];

// Helper to get all permission keys
export function getAllPermissionKeys(): string[] {
  const keys: string[] = [];
  PERMISSION_GROUPS.forEach(group => {
    group.items.forEach(item => {
      PERMISSION_TYPES.forEach(type => {
        keys.push(`${item.key}_${type}`);
      });
    });
  });
  return keys;
}

// Helper to get all permission keys of a specific type
export function getAllPermissionKeysOfType(type: PermissionType): string[] {
  const keys: string[] = [];
  PERMISSION_GROUPS.forEach(group => {
    group.items.forEach(item => {
      keys.push(`${item.key}_${type}`);
    });
  });
  return keys;
}

export interface CompanyProfile {
  id: string;
  company_id: string;
  name: string;
  profile_type: 'admin' | 'gerente' | 'caixa' | 'atendente' | 'entregador';
  description: string | null;
  permissions: Record<string, boolean>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useCompanyProfiles() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['company_profiles', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');

      if (error) throw error;
      return data as CompanyProfile[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useCreateCompanyProfile() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      profile_type: CompanyProfile['profile_type'];
      description?: string;
      permissions: Record<string, boolean>;
    }) => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const { data: result, error } = await supabase
        .from('company_profiles')
        .insert({
          company_id: profile.company_id,
          name: data.name,
          profile_type: data.profile_type,
          description: data.description || null,
          permissions: data.permissions,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_profiles'] });
      toast.success('Perfil criado com sucesso!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Já existe um perfil com esse nome');
      } else {
        toast.error('Erro ao criar perfil');
      }
    },
  });
}

export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      profile_type?: CompanyProfile['profile_type'];
      description?: string;
      permissions?: Record<string, boolean>;
    }) => {
      const { data: result, error } = await supabase
        .from('company_profiles')
        .update({
          name: data.name,
          profile_type: data.profile_type,
          description: data.description,
          permissions: data.permissions,
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_profiles'] });
      toast.success('Perfil atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar perfil');
    },
  });
}

export function useDeleteCompanyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_profiles'] });
      toast.success('Perfil excluído!');
    },
    onError: () => {
      toast.error('Erro ao excluir perfil');
    },
  });
}

export function useAssignProfileToUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { userId: string; profileId: string | null }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ company_profile_id: data.profileId })
        .eq('user_id', data.userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRole'] });
      queryClient.invalidateQueries({ queryKey: ['companyUsers'] });
      toast.success('Perfil atribuído ao usuário!');
    },
    onError: () => {
      toast.error('Erro ao atribuir perfil');
    },
  });
}

// Hook para verificar se usuário tem permissão específica
export function useHasPermission(permissionKey: string): boolean {
  const { data: profile } = useProfile();
  const { data: userRole } = useQuery({
    queryKey: ['userRole', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*, company_profile:company_profiles(*)')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Admin e SuperAdmin tem todas as permissões
  const { isSuperAdmin } = useUserRoles();
  if (isSuperAdmin || userRole?.role === 'admin') return true;

  // Verificar permissão no perfil atribuído
  const permissions = (userRole?.company_profile as any)?.permissions as Record<string, boolean> | undefined;
  return permissions?.[permissionKey] ?? false;
}

// Count enabled permissions grouped by type
export function countPermissionsByType(permissions: Record<string, boolean>): Record<PermissionType, number> {
  const counts: Record<PermissionType, number> = { view: 0, edit: 0, delete: 0 };
  
  Object.entries(permissions).forEach(([key, enabled]) => {
    if (enabled) {
      PERMISSION_TYPES.forEach(type => {
        if (key.endsWith(`_${type}`)) {
          counts[type]++;
        }
      });
    }
  });
  
  return counts;
}
