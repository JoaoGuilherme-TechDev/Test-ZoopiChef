import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from '@/hooks/use-toast';

// =============== TYPES ===============

export interface AILead {
  id: string;
  company_id: string;
  customer_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  first_seen_at: string;
  last_seen_at: string;
  page_views: number;
  products_viewed: string[];
  cart_items_json: Record<string, unknown> | null;
  cart_total: number;
  converted: boolean;
  converted_at: string | null;
  first_order_id: string | null;
  created_at: string;
}

export interface AICustomerSegment {
  id: string;
  company_id: string;
  customer_id: string;
  segment_type: string;
  total_orders: number;
  total_spent: number;
  avg_ticket: number;
  days_since_last_order: number | null;
  order_frequency_days: number | null;
  favorite_products: string[];
  favorite_categories: string[];
  recency_score: number;
  frequency_score: number;
  monetary_score: number;
  engagement_score: number;
  is_vip: boolean;
  is_inactive: boolean;
  has_abandoned_cart: boolean;
  is_high_ticket: boolean;
  is_low_ticket: boolean;
  is_frequent: boolean;
  needs_reactivation: boolean;
  calculated_at: string;
  customer?: {
    name: string;
    whatsapp: string;
  };
}

export interface AIOperationalSuggestion {
  id: string;
  company_id: string;
  category: string;
  action_type: string;
  priority: number;
  confidence: string;
  title: string;
  description: string;
  reason: string;
  risk_if_ignored: string | null;
  expected_impact: {
    revenue_increase?: number;
    customers_affected?: number;
    margin_improvement?: number;
  } | null;
  action_payload: Record<string, unknown>;
  target_customers: number;
  estimated_revenue: number;
  status: string;
  applied_at: string | null;
  dismissed_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface AIComboSuggestion {
  id: string;
  company_id: string;
  suggestion_id: string | null;
  product_ids: string[];
  product_names: string[];
  original_total: number;
  suggested_price: number;
  discount_percent: number;
  estimated_cmv: number | null;
  estimated_margin: number | null;
  margin_percent: number | null;
  times_bought_together: number;
  correlation_score: number;
  suggested_name: string | null;
  suggested_description: string | null;
  status: string;
  created_at: string;
}

export interface AIProductRewrite {
  id: string;
  company_id: string;
  product_id: string;
  original_name: string;
  original_description: string | null;
  suggested_name: string;
  suggested_description: string | null;
  improvement_reason: string | null;
  status: string;
  created_at: string;
  product?: {
    name: string;
    image_url: string | null;
  };
}

// =============== HOOKS - LEADS ===============

export function useAILeads(options?: { converted?: boolean }) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['ai-leads', profile?.company_id, options],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      let query = supabase
        .from('ai_leads')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('last_seen_at', { ascending: false });

      if (options?.converted !== undefined) {
        query = query.eq('converted', options.converted);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as AILead[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: {
      company_id: string;
      name: string;
      phone: string;
      email?: string;
      source: string;
    }) => {
      // Upsert - se já existe lead com mesmo telefone, atualiza
      const { data, error } = await supabase
        .from('ai_leads')
        .upsert(
          {
            company_id: lead.company_id,
            name: lead.name,
            phone: lead.phone.replace(/\D/g, ''),
            email: lead.email,
            source: lead.source,
            last_seen_at: new Date().toISOString(),
            page_views: 1,
          },
          { onConflict: 'company_id,phone' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-leads'] });
    },
  });
}

export function useTrackLeadEvent() {
  return useMutation({
    mutationFn: async (event: {
      company_id: string;
      lead_id?: string;
      customer_id?: string;
      event_type: string;
      event_data?: Record<string, unknown>;
      product_id?: string;
      product_name?: string;
      cart_value?: number;
    }) => {
      const { error } = await supabase.from('ai_lead_events').insert([{
        company_id: event.company_id,
        lead_id: event.lead_id || null,
        customer_id: event.customer_id || null,
        event_type: event.event_type,
        event_data: event.event_data ? JSON.parse(JSON.stringify(event.event_data)) : null,
        product_id: event.product_id || null,
        product_name: event.product_name || null,
        cart_value: event.cart_value || null,
      }]);

      if (error) throw error;
    },
  });
}

// =============== HOOKS - SEGMENTS ===============

export function useAICustomerSegments(segmentType?: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['ai-customer-segments', profile?.company_id, segmentType],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      let query = supabase
        .from('ai_customer_segments')
        .select(`
          *,
          customer:customers(name, whatsapp)
        `)
        .eq('company_id', profile.company_id)
        .order('engagement_score', { ascending: false });

      if (segmentType) {
        query = query.eq('segment_type', segmentType);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data as AICustomerSegment[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useSegmentStats() {
  const { data: segments = [] } = useAICustomerSegments();

  const stats = {
    total: segments.length,
    vip: segments.filter(s => s.is_vip).length,
    inactive: segments.filter(s => s.is_inactive).length,
    needsReactivation: segments.filter(s => s.needs_reactivation).length,
    abandonedCart: segments.filter(s => s.has_abandoned_cart).length,
    highTicket: segments.filter(s => s.is_high_ticket).length,
    frequent: segments.filter(s => s.is_frequent).length,
    avgEngagement: segments.length > 0 
      ? Math.round(segments.reduce((acc, s) => acc + s.engagement_score, 0) / segments.length) 
      : 0,
  };

  return stats;
}

// =============== HOOKS - SUGGESTIONS ===============

export function useAIOperationalSuggestions(status?: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['ai-operational-suggestions', profile?.company_id, status],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      let query = supabase
        .from('ai_operational_suggestions')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      } else {
        query = query.in('status', ['pending', 'approved']);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as AIOperationalSuggestion[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useApplyOperationalSuggestion() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (suggestion: AIOperationalSuggestion) => {
      // Invocar edge function para executar a ação
      const { data, error } = await supabase.functions.invoke('ai-execute-suggestion', {
        body: {
          suggestion_id: suggestion.id,
          company_id: suggestion.company_id,
          action_type: suggestion.action_type,
          action_payload: suggestion.action_payload,
          user_id: profile?.id,
        },
      });

      if (error) throw error;

      // Atualizar status para applied
      const { error: updateError } = await supabase
        .from('ai_operational_suggestions')
        .update({
          status: 'applied',
          applied_at: new Date().toISOString(),
          applied_by: profile?.id,
          result_status: data?.success ? 'success' : 'failed',
          result_details: data,
        })
        .eq('id', suggestion.id);

      if (updateError) throw updateError;

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-operational-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Sugestão aplicada!',
        description: data?.message || 'A ação foi executada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao aplicar',
        description: 'Não foi possível executar a ação. Tente novamente.',
        variant: 'destructive',
      });
      console.error('Error applying suggestion:', error);
    },
  });
}

export function useDismissSuggestion() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from('ai_operational_suggestions')
        .update({
          status: 'dismissed',
          dismissed_at: new Date().toISOString(),
          dismissed_by: profile?.id,
          dismissed_reason: reason,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-operational-suggestions'] });
      toast({
        title: 'Sugestão ignorada',
        description: 'A sugestão foi arquivada.',
      });
    },
  });
}

// =============== HOOKS - COMBOS ===============

export function useAIComboSuggestions(status?: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['ai-combo-suggestions', profile?.company_id, status],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      let query = supabase
        .from('ai_combo_suggestions')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('times_bought_together', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data as AIComboSuggestion[];
    },
    enabled: !!profile?.company_id,
  });
}

// =============== HOOKS - PRODUCT REWRITES ===============

export function useAIProductRewrites(status?: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['ai-product-rewrites', profile?.company_id, status],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      let query = supabase
        .from('ai_product_rewrites')
        .select(`
          *,
          product:products(name, image_url)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as AIProductRewrite[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useApplyProductRewrite() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (rewrite: AIProductRewrite) => {
      // Atualizar o produto
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: rewrite.suggested_name,
          description: rewrite.suggested_description,
        })
        .eq('id', rewrite.product_id);

      if (productError) throw productError;

      // Marcar como aplicado
      const { error: rewriteError } = await supabase
        .from('ai_product_rewrites')
        .update({
          status: 'applied',
          applied_at: new Date().toISOString(),
          applied_by: profile?.id,
        })
        .eq('id', rewrite.id);

      if (rewriteError) throw rewriteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-product-rewrites'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Descrição atualizada!',
        description: 'O produto foi atualizado com a nova descrição.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o produto.',
        variant: 'destructive',
      });
      console.error('Error applying rewrite:', error);
    },
  });
}

// =============== HOOKS - TRIGGER AI ANALYSIS ===============

export function useTriggerAIAnalysis() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (analysisType: 'segments' | 'campaigns' | 'combos' | 'descriptions' | 'full') => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-operational-analysis', {
        body: {
          company_id: profile.company_id,
          user_id: profile.id,
          analysis_type: analysisType,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-customer-segments'] });
      queryClient.invalidateQueries({ queryKey: ['ai-operational-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['ai-combo-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['ai-product-rewrites'] });
      toast({
        title: 'Análise concluída!',
        description: data?.message || 'Novas sugestões foram geradas.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro na análise',
        description: 'Não foi possível executar a análise. Tente novamente.',
        variant: 'destructive',
      });
      console.error('Error triggering analysis:', error);
    },
  });
}

// =============== STATS ===============

export function useAIOperationalStats() {
  const { data: suggestions = [] } = useAIOperationalSuggestions();
  const { data: leads = [] } = useAILeads();
  const segmentStats = useSegmentStats();

  return {
    pendingSuggestions: suggestions.filter(s => s.status === 'pending').length,
    appliedSuggestions: suggestions.filter(s => s.status === 'applied').length,
    totalLeads: leads.length,
    convertedLeads: leads.filter(l => l.converted).length,
    conversionRate: leads.length > 0 
      ? Math.round((leads.filter(l => l.converted).length / leads.length) * 100) 
      : 0,
    ...segmentStats,
    estimatedRevenue: suggestions
      .filter(s => s.status === 'pending')
      .reduce((acc, s) => acc + (s.estimated_revenue || 0), 0),
    totalCustomersAffected: suggestions
      .filter(s => s.status === 'pending')
      .reduce((acc, s) => acc + (s.target_customers || 0), 0),
  };
}

// =============== COMPOSITE HOOK ===============

export function useAIOperational() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { data: suggestions, isLoading: suggestionsLoading } = useAIOperationalSuggestions();
  const { data: combos, isLoading: combosLoading } = useAIComboSuggestions();
  const { data: rewrites, isLoading: rewritesLoading } = useAIProductRewrites();
  const { data: segments, isLoading: segmentsLoading } = useAICustomerSegments();
  
  const applySuggestionMutation = useApplyOperationalSuggestion();
  const dismissSuggestionMutation = useDismissSuggestion();
  const triggerAnalysisMutation = useTriggerAIAnalysis();
  const applyRewriteMutation = useApplyProductRewrite();

  const applySuggestion = {
    mutateAsync: async (id: string) => {
      const suggestion = suggestions?.find(s => s.id === id);
      if (!suggestion) throw new Error('Sugestão não encontrada');
      return applySuggestionMutation.mutateAsync(suggestion);
    },
    isPending: applySuggestionMutation.isPending,
  };

  const dismissSuggestion = {
    mutateAsync: async ({ id, reason }: { id: string; reason?: string }) => {
      return dismissSuggestionMutation.mutateAsync({ id, reason });
    },
    isPending: dismissSuggestionMutation.isPending,
  };

  const runAnalysis = {
    mutateAsync: async () => {
      return triggerAnalysisMutation.mutateAsync('full');
    },
    isPending: triggerAnalysisMutation.isPending,
  };

  const applyRewrite = {
    mutateAsync: async (id: string) => {
      const rewrite = rewrites?.find(r => r.id === id);
      if (!rewrite) throw new Error('Reescrita não encontrada');
      await applyRewriteMutation.mutateAsync(rewrite);
      queryClient.invalidateQueries({ queryKey: ['ai-product-rewrites'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    isPending: applyRewriteMutation.isPending,
  };

  const dismissRewrite = {
    mutateAsync: async (id: string) => {
      const { error } = await supabase
        .from('ai_product_rewrites')
        .update({ status: 'ignored' })
        .eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['ai-product-rewrites'] });
    },
    isPending: false,
  };

  return {
    suggestions,
    combos,
    rewrites,
    segments,
    isLoading: suggestionsLoading || combosLoading || rewritesLoading || segmentsLoading,
    applySuggestion,
    dismissSuggestion,
    runAnalysis,
    applyRewrite,
    dismissRewrite,
  };
}
