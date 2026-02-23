import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useUserRoles } from './useUserRoles';

// Todas as features/módulos do sistema
export const ALL_PLAN_MODULES = {
  // Módulos de operação
  kds: { label: 'KDS Cozinha', description: 'Sistema de exibição de pedidos na cozinha' },
  delivery: { label: 'Delivery', description: 'Sistema de delivery com rastreamento' },
  totem: { label: 'Totem Autoatendimento', description: 'Interface para totem de autoatendimento' },
  mesa_comanda: { label: 'Mesa/Comanda', description: 'Sistema de comandas e mesas' },
  qrcode: { label: 'QR Code Mesa', description: 'Cardápio por QR Code para mesas' },
  rodizio: { label: 'Rodízio', description: 'Sistema de rodízio' },
  reservas: { label: 'Reservas', description: 'Sistema de reservas' },
  
  // Módulos de TV/Display
  tv: { label: 'TV / Menu Digital', description: 'Exibição do cardápio em TVs' },
  tv_scheduler: { label: 'Agenda TV', description: 'Programação automática de TV' },
  
  // Módulos de IA
  ai_recommendations: { label: 'IA Recomendações', description: 'Recomendações automáticas por IA' },
  ai_menu_creative: { label: 'IA Cardápio Criativo', description: 'Sugestões de nomes e descrições por IA' },
  ai_assistant: { label: 'Assistente IA', description: 'Chat com IA para gestão' },
  ai_churn: { label: 'Predição de Churn', description: 'IA que prevê abandono de clientes' },
  ai_pricing: { label: 'Preços Dinâmicos', description: 'IA para precificação inteligente' },
  
  // Módulos de marketing
  campaigns: { label: 'Campanhas Marketing', description: 'Envio de campanhas por WhatsApp' },
  repurchase: { label: 'Recompra Inteligente', description: 'Sugestões de recompra por IA' },
  roleta: { label: 'Roleta de Prêmios', description: 'Gamificação com roleta para clientes' },
  loyalty: { label: 'Fidelidade', description: 'Programa de pontos e recompensas' },
  coupons: { label: 'Cupons', description: 'Sistema de cupons de desconto' },
  
  // Módulos administrativos
  multi_users: { label: 'Múltiplos Usuários', description: 'Mais de 1 usuário por empresa' },
  custom_branding: { label: 'Branding Personalizado', description: 'Cores e logo personalizados' },
  integrations: { label: 'Integrações', description: 'WhatsApp, Pix, etc.' },
  print_sectors: { label: 'Setores de Impressão', description: 'Impressão por setor (cozinha, bar, etc.)' },
  reports: { label: 'Relatórios', description: 'Relatórios de vendas e performance' },
  erp: { label: 'ERP/Estoque', description: 'Gestão de estoque e fornecedores' },
  financial: { label: 'Financeiro', description: 'Contas a pagar e receber' },
} as const;

// Controles fiscais
export const FISCAL_CONTROLS = {
  cupom_fiscal: { label: 'Cupom Fiscal', description: 'Emissão de cupom fiscal no PDV' },
  nfe: { label: 'NF-e', description: 'Nota Fiscal Eletrônica' },
  nfce: { label: 'NFC-e', description: 'Nota Fiscal de Consumidor Eletrônica' },
  sat: { label: 'SAT', description: 'Sistema Autenticador e Transmissor' },
} as const;

// Limites do plano
export const PLAN_LIMITS = {
  products: { label: 'Produtos', description: 'Quantidade máxima de produtos' },
  categories: { label: 'Categorias', description: 'Quantidade máxima de categorias' },
  users: { label: 'Usuários', description: 'Quantidade máxima de usuários' },
  orders_per_month: { label: 'Pedidos/mês', description: 'Limite de pedidos por mês (-1 = ilimitado)' },
  ai_calls_per_day: { label: 'Chamadas IA/dia', description: 'Limite de chamadas de IA por dia' },
  campaigns_per_month: { label: 'Campanhas/mês', description: 'Limite de campanhas por mês' },
  tv_screens: { label: 'Telas de TV', description: 'Quantidade máxima de telas de TV' },
  storage_mb: { label: 'Armazenamento (MB)', description: 'Limite de armazenamento em MB' },
} as const;

export type PlanModuleKey = keyof typeof ALL_PLAN_MODULES;
export type FiscalControlKey = keyof typeof FISCAL_CONTROLS;
export type PlanLimitKey = keyof typeof PLAN_LIMITS;

export interface PlanData {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  price_yearly_cents: number;
  price_promo_cents: number | null;
  promo_valid_until: string | null;
  billing_period: string;
  features_json: string[];
  limits_json: Record<string, number>;
  modules_json: Record<string, boolean>;
  fiscal_json: Record<string, boolean>;
  is_active: boolean;
}

/**
 * Hook para obter os recursos do plano atual da empresa
 * Usado em toda a aplicação para validar acesso a funcionalidades
 */
export function usePlanFeatures() {
  const { data: company } = useCompany();
  const { isSuperAdmin } = useUserRoles();

  const query = useQuery({
    queryKey: ['company-plan-features', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      // Buscar a assinatura ativa da empresa com o plano
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:plans(*)
        `)
        .eq('company_id', company.id)
        .in('status', ['active', 'trial', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      return subscription?.plan as PlanData | null;
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 10, // 10 minutos - planos não mudam frequentemente
    gcTime: 1000 * 60 * 30, // 30 minutos cache
  });

  // Helpers para validar acesso
  // SUPER_ADMIN has unrestricted access to ALL modules
  const hasModule = (moduleKey: PlanModuleKey): boolean => {
    if (isSuperAdmin) return true;
    if (!query.data) return false;
    const modules = query.data.modules_json || {};
    // Se modules_json está vazio, verificar features_json legado
    if (Object.keys(modules).length === 0) {
      return query.data.features_json?.includes(moduleKey) ?? false;
    }
    return modules[moduleKey] === true;
  };

  // SUPER_ADMIN has unrestricted access to ALL fiscal controls
  const hasFiscal = (fiscalKey: FiscalControlKey): boolean => {
    if (isSuperAdmin) return true;
    if (!query.data) return false;
    const fiscal = query.data.fiscal_json || {};
    return fiscal[fiscalKey] === true;
  };

  // SUPER_ADMIN has unlimited access
  const getLimit = (limitKey: PlanLimitKey): number => {
    if (isSuperAdmin) return -1; // -1 = unlimited
    if (!query.data) return 0;
    const limits = query.data.limits_json || {};
    return limits[limitKey] ?? 0;
  };

  const isUnlimited = (limitKey: PlanLimitKey): boolean => {
    if (isSuperAdmin) return true;
    return getLimit(limitKey) === -1;
  };

  const checkLimit = (limitKey: PlanLimitKey, currentCount: number): { allowed: boolean; limit: number; remaining: number } => {
    if (isSuperAdmin) return { allowed: true, limit: -1, remaining: Infinity };
    const limit = getLimit(limitKey);
    if (limit === -1) return { allowed: true, limit: -1, remaining: Infinity };
    const remaining = Math.max(0, limit - currentCount);
    return { allowed: currentCount < limit, limit, remaining };
  };

  return {
    plan: query.data,
    isLoading: query.isLoading,
    isSuperAdmin,
    
    // Validadores de módulos
    hasModule,
    hasFiscal,
    
    // Validadores de limites
    getLimit,
    isUnlimited,
    checkLimit,
    
    // Helpers rápidos para módulos comuns
    hasKDS: () => hasModule('kds'),
    hasDelivery: () => hasModule('delivery'),
    hasTotem: () => hasModule('totem'),
    hasTV: () => hasModule('tv'),
    hasAI: () => hasModule('ai_recommendations') || hasModule('ai_assistant') || hasModule('ai_menu_creative'),
    hasCampaigns: () => hasModule('campaigns'),
    hasLoyalty: () => hasModule('loyalty'),
    hasCoupons: () => hasModule('coupons'),
    hasERP: () => hasModule('erp'),
    hasFinancial: () => hasModule('financial'),
    
    // Helpers rápidos para fiscais
    canEmitCupomFiscal: () => hasFiscal('cupom_fiscal'),
    canEmitNFe: () => hasFiscal('nfe'),
    canEmitNFCe: () => hasFiscal('nfce'),
  };
}

/**
 * Componente de bloqueio para funcionalidades não disponíveis no plano
 */
export function usePlanBlockMessage(moduleKey: PlanModuleKey | FiscalControlKey): {
  isBlocked: boolean;
  message: string;
} {
  const { plan, hasModule, hasFiscal, isSuperAdmin } = usePlanFeatures();

  // SUPER_ADMIN is never blocked
  if (isSuperAdmin) {
    return { isBlocked: false, message: '' };
  }

  const isModule = moduleKey in ALL_PLAN_MODULES;
  const isFiscal = moduleKey in FISCAL_CONTROLS;

  const isBlocked = isModule 
    ? !hasModule(moduleKey as PlanModuleKey)
    : isFiscal 
      ? !hasFiscal(moduleKey as FiscalControlKey) 
      : true;

  const featureLabel = isModule 
    ? ALL_PLAN_MODULES[moduleKey as PlanModuleKey]?.label
    : FISCAL_CONTROLS[moduleKey as FiscalControlKey]?.label;

  const message = isBlocked
    ? `${featureLabel || 'Esta funcionalidade'} não está disponível no seu plano atual (${plan?.name || 'Sem plano'}). Entre em contato para fazer upgrade.`
    : '';

  return { isBlocked, message };
}
