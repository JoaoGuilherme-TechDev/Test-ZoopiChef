import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface DynamicPricingRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  rule_type: 'time_based' | 'demand_based' | 'inventory_based' | 'weather_based';
  is_active: boolean;
  priority: number;
  start_time: string | null;
  end_time: string | null;
  days_of_week: number[];
  start_date: string | null;
  end_date: string | null;
  demand_threshold_low: number | null;
  demand_threshold_high: number | null;
  adjustment_type: 'percentage' | 'fixed';
  adjustment_value: number;
  max_adjustment_percent: number;
  applies_to_all_products: boolean;
  category_ids: string[] | null;
  product_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DynamicPricingSettings {
  company_id: string;
  is_enabled: boolean;
  auto_apply: boolean;
  notification_enabled: boolean;
  max_daily_adjustments: number;
  min_margin_percent: number;
}

export interface PricingHistory {
  id: string;
  product_id: string;
  original_price: number;
  adjusted_price: number;
  adjustment_percent: number | null;
  reason: string | null;
  applied_at: string;
}

export function useDynamicPricingSettings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['dynamic-pricing-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from('dynamic_pricing_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data as DynamicPricingSettings | null;
    },
    enabled: !!company?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<DynamicPricingSettings>) => {
      if (!company?.id) throw new Error('Company not found');
      const { error } = await supabase
        .from('dynamic_pricing_settings')
        .upsert({ company_id: company.id, ...updates });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-pricing-settings'] });
      toast.success('Configurações atualizadas!');
    },
    onError: () => toast.error('Erro ao atualizar configurações'),
  });

  return { settings, isLoading, updateSettings };
}

export function useDynamicPricingRules() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['dynamic-pricing-rules', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('dynamic_pricing_rules')
        .select('*')
        .eq('company_id', company.id)
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as DynamicPricingRule[];
    },
    enabled: !!company?.id,
  });

  const createRule = useMutation({
    mutationFn: async (rule: Partial<DynamicPricingRule>) => {
      if (!company?.id) throw new Error('Company not found');
      const { error } = await supabase
        .from('dynamic_pricing_rules')
        .insert([{ 
          company_id: company.id, 
          name: rule.name || 'Nova Regra',
          adjustment_type: rule.adjustment_type || 'percentage',
          adjustment_value: rule.adjustment_value || 0,
          ...rule 
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-pricing-rules'] });
      toast.success('Regra criada com sucesso!');
    },
    onError: () => toast.error('Erro ao criar regra'),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DynamicPricingRule> & { id: string }) => {
      const { error } = await supabase
        .from('dynamic_pricing_rules')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-pricing-rules'] });
      toast.success('Regra atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar regra'),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dynamic_pricing_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-pricing-rules'] });
      toast.success('Regra excluída!');
    },
    onError: () => toast.error('Erro ao excluir regra'),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('dynamic_pricing_rules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-pricing-rules'] });
    },
  });

  return { rules, isLoading, createRule, updateRule, deleteRule, toggleRule };
}

export function usePricingHistory(days = 7) {
  const { data: company } = useCompany();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['pricing-history', company?.id, days],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('dynamic_pricing_history')
        .select('*')
        .eq('company_id', company.id)
        .gte('applied_at', startDate.toISOString())
        .order('applied_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as PricingHistory[];
    },
    enabled: !!company?.id,
  });
}

export function useApplyDynamicPricing() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Company not found');
      const { data, error } = await supabase.functions.invoke('ai-dynamic-pricing', {
        body: { companyId: company.id, action: 'apply' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pricing-history'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`${data?.adjustments_count || 0} preços ajustados!`);
    },
    onError: () => toast.error('Erro ao aplicar preços dinâmicos'),
  });
}

export function useCalculatePricing() {
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (productId?: string) => {
      if (!company?.id) throw new Error('Company not found');
      const { data, error } = await supabase.functions.invoke('ai-dynamic-pricing', {
        body: { companyId: company.id, action: 'calculate', productId },
      });
      if (error) throw error;
      return data;
    },
  });
}
