import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface VoiceAISettings {
  company_id: string;
  enabled: boolean;
  greeting_message: string;
  voice_type: string;
  transfer_to_human_keywords: string[];
  max_wait_seconds: number;
  business_hours_only: boolean;
  can_take_reservations: boolean;
  can_take_orders: boolean;
  can_answer_menu_questions: boolean;
}

export interface VoiceAICall {
  id: string;
  company_id: string;
  caller_phone: string | null;
  call_start: string;
  call_end: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  intent_detected: string | null;
  outcome: string | null;
  reservation_created_id: string | null;
  order_created_id: string | null;
  transferred_to_human: boolean;
  customer_satisfaction: number | null;
  created_at: string;
}

export function useVoiceAISettings() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['voice-ai-settings', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      const { data, error } = await supabase
        .from('voice_ai_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();
      if (error) throw error;
      return data as VoiceAISettings | null;
    },
    enabled: !!profile?.company_id
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<VoiceAISettings>) => {
      if (!profile?.company_id) throw new Error('No company');
      const { error } = await supabase
        .from('voice_ai_settings')
        .upsert({ company_id: profile.company_id, ...updates, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-ai-settings'] });
      toast.success('Configurações salvas');
    },
    onError: () => toast.error('Erro ao salvar')
  });

  return { settings, isLoading, updateSettings };
}

export function useVoiceAICalls(days: number = 30) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['voice-ai-calls', profile?.company_id, days],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('voice_ai_calls')
        .select('*')
        .eq('company_id', profile.company_id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as VoiceAICall[];
    },
    enabled: !!profile?.company_id
  });
}

export function useVoiceAIStats() {
  const { data: calls } = useVoiceAICalls(30);
  
  const stats = {
    totalCalls: calls?.length || 0,
    avgDuration: calls?.length 
      ? Math.round(calls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) / calls.length)
      : 0,
    reservationsCreated: calls?.filter(c => c.reservation_created_id).length || 0,
    ordersCreated: calls?.filter(c => c.order_created_id).length || 0,
    transferredToHuman: calls?.filter(c => c.transferred_to_human).length || 0,
    avgSatisfaction: calls?.filter(c => c.customer_satisfaction).length
      ? (calls.filter(c => c.customer_satisfaction).reduce((acc, c) => acc + (c.customer_satisfaction || 0), 0) / calls.filter(c => c.customer_satisfaction).length).toFixed(1)
      : 'N/A'
  };
  
  return stats;
}
