import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from '@/hooks/use-toast';

export interface AIRecommendation {
  id: string;
  company_id: string;
  title: string;
  reason: string;
  action_type: string;
  action_payload_json: Record<string, unknown> | null;
  status: 'new' | 'applied' | 'dismissed';
  created_at: string;
}

export interface AIInsightRun {
  id: string;
  company_id: string;
  triggered_by_user_id: string;
  created_at: string;
}

export function useAIRecommendations(status?: 'new' | 'applied' | 'dismissed') {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['ai-recommendations', profile?.company_id, status],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      let query = supabase
        .from('ai_recommendations')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AIRecommendation[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useAIInsightRuns() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['ai-insight-runs', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('ai_insight_runs')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as AIInsightRun[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useUpdateRecommendationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'applied' | 'dismissed' }) => {
      const { error } = await supabase
        .from('ai_recommendations')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
      toast({
        title: 'Status atualizado',
        description: 'A recomendação foi atualizada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a recomendação.',
        variant: 'destructive',
      });
      console.error('Error updating recommendation:', error);
    },
  });
}

export function useAnalyzeBusiness() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.company_id || !profile?.id) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('ai-manager', {
        body: {
          company_id: profile.company_id,
          user_id: profile.id,
          analysis_type: 'full',
        },
      });

      if (error) throw error;
      return data as { success: boolean; recommendations_count: number; message: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-insight-runs'] });
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
      toast({
        title: 'Análise concluída',
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro na análise',
        description: 'Não foi possível analisar os dados. Tente novamente.',
        variant: 'destructive',
      });
      console.error('Error analyzing business:', error);
    },
  });
}
