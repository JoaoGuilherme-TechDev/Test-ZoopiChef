import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface PredictiveUpsellingSettings {
  company_id: string;
  enabled: boolean;
  max_suggestions_per_order: number;
  min_confidence_score: number;
  show_on_kiosk: boolean;
  show_on_pos: boolean;
  show_on_waiter_app: boolean;
  time_based_suggestions: boolean;
  weather_based_suggestions: boolean;
}

export interface UpsellingSuggestion {
  id: string;
  company_id: string;
  order_id: string | null;
  trigger_product_id: string | null;
  suggested_product_id: string;
  suggestion_type: string;
  confidence_score: number | null;
  reason: string | null;
  shown_at: string | null;
  clicked: boolean;
  converted: boolean;
  revenue_added: number | null;
}

export interface UpsellingRule {
  id: string;
  company_id: string;
  name: string;
  rule_type: string;
  trigger_conditions: unknown;
  suggested_products: string[] | null;
  suggested_categories: string[] | null;
  priority: number;
  is_active: boolean;
  success_rate: number | null;
  times_shown: number;
  times_converted: number;
}

export function usePredictiveUpsellingSettings() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['predictive-upselling-settings', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      const { data, error } = await supabase
        .from('predictive_upselling_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();
      if (error) throw error;
      return data as PredictiveUpsellingSettings | null;
    },
    enabled: !!profile?.company_id
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<PredictiveUpsellingSettings>) => {
      if (!profile?.company_id) throw new Error('No company');
      const { error } = await supabase
        .from('predictive_upselling_settings')
        .upsert({ company_id: profile.company_id, ...updates, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictive-upselling-settings'] });
      toast.success('Configurações salvas');
    },
    onError: () => toast.error('Erro ao salvar')
  });

  return { settings, isLoading, updateSettings };
}

export function useUpsellingRules() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['upselling-rules', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from('upselling_rules')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as UpsellingRule[];
    },
    enabled: !!profile?.company_id
  });

  const createRule = useMutation({
    mutationFn: async (rule: { name: string; rule_type: string; trigger_conditions?: Json; suggested_products?: string[]; suggested_categories?: string[]; priority?: number }) => {
      if (!profile?.company_id) throw new Error('No company');
      const { error } = await supabase
        .from('upselling_rules')
        .insert([{ 
          company_id: profile.company_id, 
          name: rule.name,
          rule_type: rule.rule_type,
          trigger_conditions: rule.trigger_conditions,
          suggested_products: rule.suggested_products,
          suggested_categories: rule.suggested_categories,
          priority: rule.priority
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upselling-rules'] });
      toast.success('Regra criada');
    },
    onError: () => toast.error('Erro ao criar regra')
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, name, rule_type, trigger_conditions, suggested_products, suggested_categories, priority, is_active }: { id: string; name?: string; rule_type?: string; trigger_conditions?: Json; suggested_products?: string[]; suggested_categories?: string[]; priority?: number; is_active?: boolean }) => {
      const { error } = await supabase
        .from('upselling_rules')
        .update({ name, rule_type, trigger_conditions, suggested_products, suggested_categories, priority, is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upselling-rules'] });
      toast.success('Regra atualizada');
    }
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('upselling_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upselling-rules'] });
      toast.success('Regra removida');
    }
  });

  return { rules, isLoading, createRule, updateRule, deleteRule };
}

export function useUpsellingStats() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['upselling-stats', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('upselling_suggestions')
        .select('*')
        .eq('company_id', profile.company_id)
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      if (error) throw error;
      
      const suggestions = data as UpsellingSuggestion[];
      const shown = suggestions.filter(s => s.shown_at);
      const clicked = suggestions.filter(s => s.clicked);
      const converted = suggestions.filter(s => s.converted);
      
      return {
        totalShown: shown.length,
        totalClicked: clicked.length,
        totalConverted: converted.length,
        clickRate: shown.length ? ((clicked.length / shown.length) * 100).toFixed(1) : '0',
        conversionRate: clicked.length ? ((converted.length / clicked.length) * 100).toFixed(1) : '0',
        revenueAdded: converted.reduce((acc, s) => acc + (s.revenue_added || 0), 0)
      };
    },
    enabled: !!profile?.company_id
  });
}

export function useGetUpsellingSuggestions() {
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ productIds, context }: { productIds: string[]; context?: Record<string, unknown> }) => {
      if (!profile?.company_id) throw new Error('No company');
      
      const { data, error } = await supabase.functions.invoke('ai-predictive-upselling', {
        body: { 
          company_id: profile.company_id,
          product_ids: productIds,
          context
        }
      });
      
      if (error) throw error;
      return data;
    }
  });
}
