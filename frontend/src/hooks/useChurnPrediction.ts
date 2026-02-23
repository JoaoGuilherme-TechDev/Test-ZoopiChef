import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface ChurnPrediction {
  id: string;
  company_id: string;
  customer_id: string;
  churn_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  days_since_last_order: number | null;
  avg_order_frequency_days: number | null;
  expected_next_order_date: string | null;
  days_overdue: number | null;
  total_lifetime_value: number | null;
  predicted_at: string;
  intervention_status: string;
  intervention_type: string | null;
  customer?: {
    name: string;
    whatsapp: string | null;
  };
}

export function useChurnPredictions(riskLevel?: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['churn-predictions', profile?.company_id, riskLevel],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      let query = supabase
        .from('ai_churn_predictions')
        .select(`
          *,
          customer:customers(name, whatsapp)
        `)
        .eq('company_id', profile.company_id)
        .order('churn_score', { ascending: false });

      if (riskLevel) {
        query = query.eq('risk_level', riskLevel);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as ChurnPrediction[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useAnalyzeChurn() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-churn-predictor', {
        body: {
          company_id: profile.company_id,
          action: 'analyze',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['churn-predictions'] });
      toast.success(data?.message || 'Análise de churn concluída!');
    },
    onError: (error) => {
      console.error('Erro ao analisar churn:', error);
      toast.error('Erro ao analisar clientes em risco');
    },
  });
}

export function useIntervenChurn() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ predictionId, interventionType }: { predictionId: string; interventionType: string }) => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-churn-predictor', {
        body: {
          company_id: profile.company_id,
          action: 'intervene',
          prediction_id: predictionId,
          intervention_type: interventionType,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['churn-predictions'] });
      toast.success(data?.message || 'Intervenção realizada!');
    },
    onError: (error) => {
      console.error('Erro ao intervir:', error);
      toast.error('Erro ao realizar intervenção');
    },
  });
}

export function useChurnStats() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['churn-stats', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      const { data } = await supabase
        .from('ai_churn_predictions')
        .select('risk_level, intervention_status, total_lifetime_value')
        .eq('company_id', profile.company_id);

      if (!data) return null;

      const critical = data.filter(d => d.risk_level === 'critical').length;
      const high = data.filter(d => d.risk_level === 'high').length;
      const medium = data.filter(d => d.risk_level === 'medium').length;
      const low = data.filter(d => d.risk_level === 'low').length;
      const recovered = data.filter(d => d.intervention_status === 'recovered').length;
      const atRiskValue = data
        .filter(d => d.risk_level === 'critical' || d.risk_level === 'high')
        .reduce((sum, d) => sum + (d.total_lifetime_value || 0), 0);

      return {
        total: data.length,
        critical,
        high,
        medium,
        low,
        recovered,
        atRiskValue,
        recoveryRate: data.length > 0 ? (recovered / data.length) * 100 : 0,
      };
    },
    enabled: !!profile?.company_id,
  });
}
