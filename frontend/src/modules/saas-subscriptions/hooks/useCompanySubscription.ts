import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  price_yearly_cents: number | null;
  price_promo_cents: number | null;
  promo_valid_until: string | null;
  billing_period: string;
  features_json: string[];
  limits_json: Record<string, number>;
  modules_json: Record<string, boolean>;
  fiscal_json: Record<string, boolean>;
  is_active: boolean;
  display_order: number;
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: string;
  provider: string;
  provider_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  past_due_since: string | null;
  plan?: Plan;
}

export interface AddonModule {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  icon: string | null;
  category: string | null;
  is_active: boolean;
}

export interface CompanyAddon {
  id: string;
  company_id: string;
  addon_module_id: string;
  status: string;
  activated_at: string | null;
  addon?: AddonModule;
}

export interface BillingHistoryItem {
  id: string;
  company_id: string;
  description: string | null;
  amount_cents: number;
  status: string;
  asaas_invoice_url: string | null;
  asaas_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export function useCompanySubscription() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Fetch current subscription with plan details
  const subscriptionQuery = useQuery({
    queryKey: ['company-subscription', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, plan:plans(*)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Subscription | null;
    },
    enabled: !!company?.id,
  });

  // Fetch all available plans
  const plansQuery = useQuery({
    queryKey: ['available-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Plan[];
    },
  });

  // Fetch available addon modules
  const addonsQuery = useQuery({
    queryKey: ['available-addons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addon_modules')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as AddonModule[];
    },
  });

  // Fetch company's active addons
  const companyAddonsQuery = useQuery({
    queryKey: ['company-addons', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('company_addon_subscriptions')
        .select('*, addon:addon_modules(*)')
        .eq('company_id', company.id)
        .in('status', ['active', 'pending']);

      if (error) throw error;
      return (data || []).map(item => ({
        id: item.id,
        company_id: item.company_id,
        addon_module_id: item.addon_module_id,
        status: item.status,
        activated_at: item.activated_at,
        addon: item.addon,
      })) as CompanyAddon[];
    },
    enabled: !!company?.id,
  });

  // Fetch billing history
  const billingHistoryQuery = useQuery({
    queryKey: ['billing-history', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('billing_history')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map(item => ({
        id: item.id,
        company_id: item.company_id,
        description: item.description,
        amount_cents: item.amount_cents,
        status: item.status,
        asaas_invoice_url: item.asaas_invoice_url,
        asaas_payment_id: item.asaas_payment_id,
        created_at: item.created_at,
        paid_at: item.paid_at,
      })) as BillingHistoryItem[];
    },
    enabled: !!company?.id,
  });

  // Request plan change
  const requestPlanChange = useMutation({
    mutationFn: async (newPlanId: string) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      const { data, error } = await supabase.functions.invoke('asaas-billing', {
        body: {
          action: 'change_plan',
          company_id: company.id,
          new_plan_id: newPlanId,
          current_subscription_id: subscriptionQuery.data?.id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['billing-history'] });
      
      if (data.payment_url) {
        toast.success('Cobrança gerada! Redirecionando para pagamento...');
        window.open(data.payment_url, '_blank');
      } else if (data.simulated) {
        toast.info('Modo simulação: ASAAS não configurado');
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao solicitar mudança de plano: ' + error.message);
    },
  });

  // Request addon
  const requestAddon = useMutation({
    mutationFn: async (addonId: string) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      const { data, error } = await supabase.functions.invoke('asaas-billing', {
        body: {
          action: 'add_addon',
          company_id: company.id,
          addon_id: addonId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company-addons'] });
      queryClient.invalidateQueries({ queryKey: ['billing-history'] });
      
      if (data.payment_url) {
        toast.success('Cobrança gerada! Redirecionando para pagamento...');
        window.open(data.payment_url, '_blank');
      } else if (data.simulated) {
        toast.info('Modo simulação: ASAAS não configurado');
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao solicitar módulo: ' + error.message);
    },
  });

  // Calculate totals
  const monthlyTotal = () => {
    let total = subscriptionQuery.data?.plan?.price_cents || 0;
    
    companyAddonsQuery.data?.forEach((addon) => {
      if (addon.status === 'active') {
        total += addon.addon?.price_cents || 0;
      }
    });
    
    return total;
  };

  const isAddonActive = (addonId: string) => {
    return companyAddonsQuery.data?.some(ca => ca.addon_module_id === addonId && ca.status === 'active') || false;
  };

  const isAddonPending = (addonId: string) => {
    return companyAddonsQuery.data?.some(ca => ca.addon_module_id === addonId && ca.status === 'pending') || false;
  };

  return {
    subscription: subscriptionQuery.data,
    plans: plansQuery.data || [],
    addons: addonsQuery.data || [],
    companyAddons: companyAddonsQuery.data || [],
    billingHistory: billingHistoryQuery.data || [],
    isLoading: subscriptionQuery.isLoading || plansQuery.isLoading,
    monthlyTotal: monthlyTotal(),
    isAddonActive,
    isAddonPending,
    requestPlanChange,
    requestAddon,
    refetch: () => {
      subscriptionQuery.refetch();
      companyAddonsQuery.refetch();
      billingHistoryQuery.refetch();
    },
  };
}
