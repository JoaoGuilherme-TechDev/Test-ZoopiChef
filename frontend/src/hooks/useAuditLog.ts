import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, useUserRole } from './useProfile';

export type AuditAction = 
  // Pedidos
  | 'order_created'
  | 'order_updated'
  | 'order_status_changed'
  | 'order_cancelled'
  | 'order_deleted'
  | 'order_printed'
  // Produtos
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'product_stock_updated'
  // Categorias
  | 'category_created'
  | 'category_updated'
  | 'category_deleted'
  // Clientes
  | 'customer_created'
  | 'customer_updated'
  | 'customer_deleted'
  // Caixa
  | 'cash_session_opened'
  | 'cash_session_closed'
  | 'cash_adjustment'
  | 'cash_withdrawal'
  // Entregadores
  | 'deliverer_created'
  | 'deliverer_updated'
  | 'deliverer_deleted'
  // Configurações
  | 'settings_updated'
  | 'integrations_updated'
  | 'company_updated'
  // Usuários
  | 'user_role_changed'
  | 'user_invited'
  | 'user_removed'
  // Login
  | 'user_login'
  | 'user_logout'
  // Promoções
  | 'coupon_created'
  | 'coupon_updated'
  | 'coupon_deleted'
  | 'promo_created'
  | 'promo_updated'
  | 'promo_deleted'
  // Estoque
  | 'stock_entry'
  | 'stock_adjustment'
  | 'stock_transfer'
  // Financeiro
  | 'expense_created'
  | 'expense_paid'
  | 'expense_cancelled'
  | 'receivable_created'
  | 'receivable_received'
  // Outros
  | 'banner_created'
  | 'banner_updated'
  | 'banner_deleted'
  | 'prize_created'
  | 'prize_updated'
  | 'prize_deleted'
  | 'report_generated'
  | 'export_data'
  | 'import_data';

export type AuditEntityType = 
  | 'order'
  | 'product'
  | 'category'
  | 'subcategory'
  | 'customer'
  | 'cash_session'
  | 'cash_adjustment'
  | 'deliverer'
  | 'settings'
  | 'integrations'
  | 'company'
  | 'user'
  | 'coupon'
  | 'promo'
  | 'stock'
  | 'expense'
  | 'receivable'
  | 'banner'
  | 'prize'
  | 'report'
  | 'optional_group'
  | 'optional_item'
  | 'combo';

export interface AuditLogEntry {
  id: string;
  company_id: string;
  user_id: string;
  user_name: string | null;
  user_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  created_at: string;
}

interface LogAuditParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  details?: string;
}

// Hook para registrar ações de auditoria
export function useAuditLogger() {
  const { data: company } = useCompany();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: userRole } = useUserRole();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LogAuditParams) => {
      if (!company?.id || !user?.id) {
        console.warn('Audit log skipped: missing company or user');
        return null;
      }

      const { data, error } = await supabase
        .from('company_audit_logs')
        .insert([{
          company_id: company.id,
          user_id: user.id,
          user_name: profile?.full_name || user.email?.split('@')[0] || 'Usuário',
          user_role: userRole?.role || 'employee',
          action: params.action,
          entity_type: params.entityType,
          entity_id: params.entityId || null,
          entity_name: params.entityName || null,
          old_values: params.oldValues as any || null,
          new_values: params.newValues as any || null,
          details: params.details || null,
          user_agent: navigator.userAgent,
        }])
        .select()
        .single();

      if (error) {
        console.error('Failed to log audit action:', error);
        // Não lançar erro para não interromper a ação principal
        return null;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-audit-logs'] });
    },
  });
}

// Hook para buscar logs de auditoria com filtros
interface AuditLogFilters {
  action?: string;
  entityType?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export function useCompanyAuditLogs(
  limit: number = 100,
  filters?: AuditLogFilters
) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['company-audit-logs', company?.id, limit, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('company_audit_logs')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      if (filters?.search) {
        query = query.or(`entity_name.ilike.%${filters.search}%,details.ilike.%${filters.search}%,user_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: !!company?.id,
  });
}

// Hook para estatísticas de auditoria
export function useAuditStats() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['company-audit-stats', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Total de ações hoje
      const { count: todayCount } = await supabase
        .from('company_audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .gte('created_at', today.toISOString());

      // Usuários ativos hoje
      const { data: activeUsers } = await supabase
        .from('company_audit_logs')
        .select('user_id')
        .eq('company_id', company.id)
        .gte('created_at', today.toISOString());

      const uniqueUsers = new Set(activeUsers?.map(u => u.user_id) || []).size;

      // Ações por tipo
      const { data: actionsByType } = await supabase
        .from('company_audit_logs')
        .select('action')
        .eq('company_id', company.id)
        .gte('created_at', today.toISOString());

      const actionCounts: Record<string, number> = {};
      actionsByType?.forEach(a => {
        actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
      });

      return {
        todayCount: todayCount || 0,
        uniqueUsers,
        actionCounts,
      };
    },
    enabled: !!company?.id,
  });
}

// Função auxiliar para nomes amigáveis de ações
export const actionLabels: Record<string, { label: string; color: string }> = {
  // Pedidos
  order_created: { label: 'Pedido Criado', color: 'border-emerald-500/50 text-emerald-400' },
  order_updated: { label: 'Pedido Atualizado', color: 'border-blue-500/50 text-blue-400' },
  order_status_changed: { label: 'Status do Pedido', color: 'border-amber-500/50 text-amber-400' },
  order_cancelled: { label: 'Pedido Cancelado', color: 'border-red-500/50 text-red-400' },
  order_deleted: { label: 'Pedido Excluído', color: 'border-red-500/50 text-red-400' },
  order_printed: { label: 'Pedido Impresso', color: 'border-slate-500/50 text-slate-400' },
  // Produtos
  product_created: { label: 'Produto Criado', color: 'border-emerald-500/50 text-emerald-400' },
  product_updated: { label: 'Produto Atualizado', color: 'border-blue-500/50 text-blue-400' },
  product_deleted: { label: 'Produto Excluído', color: 'border-red-500/50 text-red-400' },
  product_stock_updated: { label: 'Estoque Atualizado', color: 'border-amber-500/50 text-amber-400' },
  // Categorias
  category_created: { label: 'Categoria Criada', color: 'border-emerald-500/50 text-emerald-400' },
  category_updated: { label: 'Categoria Atualizada', color: 'border-blue-500/50 text-blue-400' },
  category_deleted: { label: 'Categoria Excluída', color: 'border-red-500/50 text-red-400' },
  // Clientes
  customer_created: { label: 'Cliente Criado', color: 'border-emerald-500/50 text-emerald-400' },
  customer_updated: { label: 'Cliente Atualizado', color: 'border-blue-500/50 text-blue-400' },
  customer_deleted: { label: 'Cliente Excluído', color: 'border-red-500/50 text-red-400' },
  // Caixa
  cash_session_opened: { label: 'Caixa Aberto', color: 'border-emerald-500/50 text-emerald-400' },
  cash_session_closed: { label: 'Caixa Fechado', color: 'border-blue-500/50 text-blue-400' },
  cash_adjustment: { label: 'Ajuste de Caixa', color: 'border-amber-500/50 text-amber-400' },
  cash_withdrawal: { label: 'Sangria', color: 'border-purple-500/50 text-purple-400' },
  // Entregadores
  deliverer_created: { label: 'Entregador Criado', color: 'border-emerald-500/50 text-emerald-400' },
  deliverer_updated: { label: 'Entregador Atualizado', color: 'border-blue-500/50 text-blue-400' },
  deliverer_deleted: { label: 'Entregador Excluído', color: 'border-red-500/50 text-red-400' },
  // Configurações
  settings_updated: { label: 'Configurações Atualizadas', color: 'border-blue-500/50 text-blue-400' },
  integrations_updated: { label: 'Integrações Atualizadas', color: 'border-purple-500/50 text-purple-400' },
  company_updated: { label: 'Empresa Atualizada', color: 'border-blue-500/50 text-blue-400' },
  // Usuários
  user_role_changed: { label: 'Permissão Alterada', color: 'border-amber-500/50 text-amber-400' },
  user_invited: { label: 'Usuário Convidado', color: 'border-emerald-500/50 text-emerald-400' },
  user_removed: { label: 'Usuário Removido', color: 'border-red-500/50 text-red-400' },
  // Login
  user_login: { label: 'Login', color: 'border-emerald-500/50 text-emerald-400' },
  user_logout: { label: 'Logout', color: 'border-slate-500/50 text-slate-400' },
  // Promoções
  coupon_created: { label: 'Cupom Criado', color: 'border-emerald-500/50 text-emerald-400' },
  coupon_updated: { label: 'Cupom Atualizado', color: 'border-blue-500/50 text-blue-400' },
  coupon_deleted: { label: 'Cupom Excluído', color: 'border-red-500/50 text-red-400' },
  promo_created: { label: 'Promoção Criada', color: 'border-emerald-500/50 text-emerald-400' },
  promo_updated: { label: 'Promoção Atualizada', color: 'border-blue-500/50 text-blue-400' },
  promo_deleted: { label: 'Promoção Excluída', color: 'border-red-500/50 text-red-400' },
  // Estoque
  stock_entry: { label: 'Entrada Estoque', color: 'border-emerald-500/50 text-emerald-400' },
  stock_adjustment: { label: 'Ajuste Estoque', color: 'border-amber-500/50 text-amber-400' },
  stock_transfer: { label: 'Transferência Estoque', color: 'border-blue-500/50 text-blue-400' },
  // Financeiro
  expense_created: { label: 'Despesa Criada', color: 'border-red-500/50 text-red-400' },
  expense_paid: { label: 'Despesa Paga', color: 'border-emerald-500/50 text-emerald-400' },
  expense_cancelled: { label: 'Despesa Cancelada', color: 'border-slate-500/50 text-slate-400' },
  receivable_created: { label: 'Recebível Criado', color: 'border-emerald-500/50 text-emerald-400' },
  receivable_received: { label: 'Recebível Recebido', color: 'border-emerald-500/50 text-emerald-400' },
  // Outros
  banner_created: { label: 'Banner Criado', color: 'border-emerald-500/50 text-emerald-400' },
  banner_updated: { label: 'Banner Atualizado', color: 'border-blue-500/50 text-blue-400' },
  banner_deleted: { label: 'Banner Excluído', color: 'border-red-500/50 text-red-400' },
  prize_created: { label: 'Prêmio Criado', color: 'border-emerald-500/50 text-emerald-400' },
  prize_updated: { label: 'Prêmio Atualizado', color: 'border-blue-500/50 text-blue-400' },
  prize_deleted: { label: 'Prêmio Excluído', color: 'border-red-500/50 text-red-400' },
  report_generated: { label: 'Relatório Gerado', color: 'border-purple-500/50 text-purple-400' },
  export_data: { label: 'Dados Exportados', color: 'border-blue-500/50 text-blue-400' },
  import_data: { label: 'Dados Importados', color: 'border-emerald-500/50 text-emerald-400' },
};

export const entityTypeLabels: Record<string, string> = {
  order: 'Pedido',
  product: 'Produto',
  category: 'Categoria',
  subcategory: 'Subcategoria',
  customer: 'Cliente',
  cash_session: 'Caixa',
  cash_adjustment: 'Ajuste',
  deliverer: 'Entregador',
  settings: 'Configurações',
  integrations: 'Integrações',
  company: 'Empresa',
  user: 'Usuário',
  coupon: 'Cupom',
  promo: 'Promoção',
  stock: 'Estoque',
  expense: 'Despesa',
  receivable: 'Recebível',
  banner: 'Banner',
  prize: 'Prêmio',
  report: 'Relatório',
  optional_group: 'Grupo Opcional',
  optional_item: 'Item Opcional',
  combo: 'Combo',
};
