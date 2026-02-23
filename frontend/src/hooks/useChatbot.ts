import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface ChatbotSettings {
  company_id: string;
  enabled: boolean;
  greeting_message: string;
  fallback_message: string;
  operating_hours_start: string;
  operating_hours_end: string;
  auto_escalate_keywords: string[];
  max_turns_before_escalate: number;
  can_take_orders: boolean;
  can_check_order_status: boolean;
  personality_prompt: string | null;
}

export interface ChatbotSession {
  id: string;
  company_id: string;
  customer_id: string | null;
  customer_phone: string;
  customer_name: string | null;
  status: 'active' | 'waiting_human' | 'closed';
  started_at: string;
  last_message_at: string;
  escalated_to_human: boolean;
  escalation_reason: string | null;
  messages_count: number;
}

export interface ChatbotMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent_detected: string | null;
  created_at: string;
}

export function useChatbotSettings() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['chatbot-settings', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      const { data, error } = await supabase
        .from('chatbot_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();

      if (error) throw error;
      return data as ChatbotSettings | null;
    },
    enabled: !!profile?.company_id,
  });
}

export function useUpdateChatbotSettings() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (settings: Partial<ChatbotSettings>) => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase
        .from('chatbot_settings')
        .upsert({
          company_id: profile.company_id,
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-settings'] });
      toast.success('Configurações do chatbot salvas!');
    },
    onError: (error) => {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    },
  });
}

export function useChatbotSessions(status?: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['chatbot-sessions', profile?.company_id, status],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      let query = supabase
        .from('chatbot_sessions')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('last_message_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as ChatbotSession[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useChatbotMessages(sessionId?: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['chatbot-messages', sessionId],
    queryFn: async () => {
      if (!sessionId || !profile?.company_id) return [];

      const { data, error } = await supabase
        .from('chatbot_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatbotMessage[];
    },
    enabled: !!sessionId && !!profile?.company_id,
  });
}

export function useTakeOverSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('chatbot_sessions')
        .update({
          status: 'waiting_human',
          escalated_to_human: true,
          escalation_reason: 'Atendente assumiu a conversa',
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-sessions'] });
      toast.success('Conversa assumida!');
    },
  });
}

export function useChatbotStats() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['chatbot-stats', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      const today = new Date().toISOString().split('T')[0];
      
      const [
        { count: totalSessions },
        { count: activeSessions },
        { count: todaySessions },
        { data: escalated },
      ] = await Promise.all([
        supabase
          .from('chatbot_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id),
        supabase
          .from('chatbot_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id)
          .eq('status', 'active'),
        supabase
          .from('chatbot_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id)
          .gte('started_at', `${today}T00:00:00`),
        supabase
          .from('chatbot_sessions')
          .select('escalated_to_human, order_created_id')
          .eq('company_id', profile.company_id),
      ]);

      const totalEscalated = escalated?.filter(s => s.escalated_to_human).length || 0;
      const totalOrders = escalated?.filter(s => s.order_created_id).length || 0;

      return {
        totalSessions: totalSessions || 0,
        activeSessions: activeSessions || 0,
        todaySessions: todaySessions || 0,
        escalationRate: totalSessions ? (totalEscalated / totalSessions) * 100 : 0,
        conversionRate: totalSessions ? (totalOrders / totalSessions) * 100 : 0,
      };
    },
    enabled: !!profile?.company_id,
  });
}
