import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface CustomerBehaviorAnalysis {
  id: string;
  company_id: string;
  customer_id: string;
  business_type: string;
  order_frequency_days: number | null;
  avg_order_time: string | null;
  preferred_days: string[] | null;
  favorite_products: any | null;
  favorite_categories: any | null;
  meat_preferences: string[] | null;
  side_preferences: string[] | null;
  salad_preferences: string[] | null;
  consecutive_days_analyzed: number | null;
  wants_daily_suggestions: boolean | null;
  next_suggestion_at: string | null;
  last_suggestion_sent_at: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SuggestionConversation {
  id: string;
  company_id: string;
  customer_id: string;
  behavior_analysis_id: string | null;
  conversation_state: string | null;
  suggestion_1: any;
  suggestion_2: any;
  chosen_suggestion: number | null;
  confirmed: boolean | null;
  created_order_id: string | null;
  collected_preferences: any | null;
  whatsapp_message_ids: string[] | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  messages: any | null;
  started_at: string | null;
}

// Hook para buscar análises de comportamento
export function useCustomerBehaviorAnalyses() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['customer-behavior-analyses', company?.id],
    queryFn: async (): Promise<(CustomerBehaviorAnalysis & { customers?: { name: string; whatsapp: string } })[]> => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('ai_customer_behavior_analysis')
        .select(`
          *,
          customers:customer_id (
            id,
            name,
            whatsapp
          )
        `)
        .eq('company_id', company.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as any;
    },
    enabled: !!company?.id,
  });
}

// Hook para buscar conversas de sugestão
export function useSuggestionConversations() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['suggestion-conversations', company?.id],
    queryFn: async (): Promise<(SuggestionConversation & { customers?: { name: string; whatsapp: string } })[]> => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('ai_suggestion_conversations')
        .select(`
          *,
          customers:customer_id (
            id,
            name,
            whatsapp
          )
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as any;
    },
    enabled: !!company?.id,
  });
}

// Hook para disparar análise de comportamento
export function useAnalyzeCustomerBehavior() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId?: string) => {
      if (!company?.id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-behavior-analysis', {
        body: {
          company_id: company.id,
          action: customerId ? 'analyze_customer' : 'analyze_all_customers',
          customer_id: customerId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-behavior-analyses'] });
      if (data?.analyzed_count) {
        toast.success(`${data.analyzed_count} cliente(s) analisado(s)!`);
      } else {
        toast.success('Análise concluída!');
      }
    },
    onError: (error) => {
      console.error('Erro na análise:', error);
      toast.error('Erro ao analisar comportamento');
    },
  });
}

// Hook para disparar sugestões diárias
export function useTriggerDailySuggestions() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-behavior-analysis', {
        body: {
          company_id: company.id,
          action: 'trigger_daily_suggestions',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['suggestion-conversations'] });
      if (data?.suggestions_sent) {
        toast.success(`${data.suggestions_sent} sugestão(ões) enviada(s)!`);
      } else {
        toast.info('Nenhuma sugestão para enviar no momento');
      }
    },
    onError: (error) => {
      console.error('Erro ao enviar sugestões:', error);
      toast.error('Erro ao enviar sugestões');
    },
  });
}

// Hook para gerar sugestões para um cliente específico
export function useGenerateSuggestion() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      if (!company?.id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-behavior-analysis', {
        body: {
          company_id: company.id,
          action: 'generate_suggestions',
          customer_id: customerId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestion-conversations'] });
      toast.success('Sugestão enviada via WhatsApp!');
    },
    onError: (error) => {
      console.error('Erro ao gerar sugestão:', error);
      toast.error('Erro ao gerar sugestão');
    },
  });
}

// Hook para estatísticas
export function useBehaviorAnalysisStats() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['behavior-analysis-stats', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      // Buscar análises
      const { data: analyses, error: analysesError } = await supabase
        .from('ai_customer_behavior_analysis')
        .select('id, status, wants_daily_suggestions, business_type')
        .eq('company_id', company.id);

      if (analysesError) throw analysesError;

      // Buscar conversas
      const { data: conversations, error: convsError } = await supabase
        .from('ai_suggestion_conversations')
        .select('id, conversation_state, confirmed, created_order_id')
        .eq('company_id', company.id);

      if (convsError) throw convsError;

      // Calcular stats
      const totalAnalyzed = analyses?.length || 0;
      const activeDaily = analyses?.filter(a => a.wants_daily_suggestions).length || 0;
      const byBusinessType = analyses?.reduce((acc, a) => {
        acc[a.business_type] = (acc[a.business_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const totalConversations = conversations?.length || 0;
      const confirmedOrders = conversations?.filter(c => c.confirmed && c.created_order_id).length || 0;
      const pendingConversations = conversations?.filter(c => 
        c.conversation_state !== 'completed' && c.conversation_state !== 'expired'
      ).length || 0;

      const conversionRate = totalConversations > 0 
        ? ((confirmedOrders / totalConversations) * 100).toFixed(1) 
        : '0';

      return {
        totalAnalyzed,
        activeDaily,
        byBusinessType,
        totalConversations,
        confirmedOrders,
        pendingConversations,
        conversionRate,
      };
    },
    enabled: !!company?.id,
  });
}
