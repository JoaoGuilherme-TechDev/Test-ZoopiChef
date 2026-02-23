import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface AIConciergeSettings {
  company_id: string;
  enabled: boolean;
  personality: string;
  language: string;
  can_make_reservations: boolean;
  can_recommend_dishes: boolean;
  can_answer_allergens: boolean;
  can_show_wait_time: boolean;
  can_take_orders: boolean;
  escalation_keywords: string[];
  welcome_message: string;
}

export interface ConciergeConversation {
  id: string;
  company_id: string;
  customer_id: string | null;
  session_id: string;
  channel: string;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  resolved: boolean;
  escalated: boolean;
  reservation_created: boolean;
  order_created: boolean;
  satisfaction_rating: number | null;
}

export interface ConciergeMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  intent_detected: string | null;
  created_at: string;
}

export function useAIConciergeSettings() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['ai-concierge-settings', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      const { data, error } = await supabase
        .from('ai_concierge_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();
      if (error) throw error;
      return data as AIConciergeSettings | null;
    },
    enabled: !!profile?.company_id
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<AIConciergeSettings>) => {
      if (!profile?.company_id) throw new Error('No company');
      const { error } = await supabase
        .from('ai_concierge_settings')
        .upsert({ company_id: profile.company_id, ...updates, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-concierge-settings'] });
      toast.success('Configurações salvas');
    },
    onError: () => toast.error('Erro ao salvar')
  });

  return { settings, isLoading, updateSettings };
}

export function useConciergeConversations(days: number = 7) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['concierge-conversations', profile?.company_id, days],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('ai_concierge_conversations')
        .select('*')
        .eq('company_id', profile.company_id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ConciergeConversation[];
    },
    enabled: !!profile?.company_id
  });
}

export function useConciergeStats() {
  const { data: conversations } = useConciergeConversations(30);
  
  const stats = {
    totalConversations: conversations?.length || 0,
    resolved: conversations?.filter(c => c.resolved).length || 0,
    escalated: conversations?.filter(c => c.escalated).length || 0,
    reservationsCreated: conversations?.filter(c => c.reservation_created).length || 0,
    ordersCreated: conversations?.filter(c => c.order_created).length || 0,
    avgMessages: conversations?.length 
      ? Math.round(conversations.reduce((acc, c) => acc + c.message_count, 0) / conversations.length)
      : 0,
    avgSatisfaction: conversations?.filter(c => c.satisfaction_rating).length
      ? (conversations.filter(c => c.satisfaction_rating).reduce((acc, c) => acc + (c.satisfaction_rating || 0), 0) / conversations.filter(c => c.satisfaction_rating).length).toFixed(1)
      : 'N/A'
  };
  
  return stats;
}

export function useSendConciergeMessage() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, message }: { sessionId: string; message: string }) => {
      if (!profile?.company_id) throw new Error('No company');
      
      const { data, error } = await supabase.functions.invoke('ai-concierge', {
        body: { 
          company_id: profile.company_id,
          session_id: sessionId,
          message 
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concierge-conversations'] });
    }
  });
}
