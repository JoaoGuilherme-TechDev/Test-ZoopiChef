import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface DemandForecast {
  id: string;
  company_id: string;
  forecast_date: string;
  day_of_week: number;
  predicted_orders: number;
  predicted_revenue: number;
  confidence_score: number;
  top_products: Array<{ product_id: string; name: string; predicted_qty: number }>;
  peak_hours: Array<{ hour: number; predicted_orders: number }>;
  recommendations: Array<{ type: string; message: string; priority: string }>;
  created_at: string;
}

export function useDemandForecast() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ['demand-forecasts', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('demand_forecasts')
        .select('*')
        .eq('company_id', company.id)
        .gte('forecast_date', new Date().toISOString().split('T')[0])
        .order('forecast_date')
        .limit(14);
      if (error) throw error;
      return data as DemandForecast[];
    },
    enabled: !!company?.id,
  });

  const generateForecast = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-demand-forecast', {
        body: { companyId: company!.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demand-forecasts'] });
      toast.success('Previsão gerada com sucesso!');
    },
    onError: () => toast.error('Erro ao gerar previsão'),
  });

  const todayForecast = forecasts.find(
    f => f.forecast_date === new Date().toISOString().split('T')[0]
  );

  return {
    forecasts,
    todayForecast,
    isLoading,
    generateForecast: generateForecast.mutate,
    isGenerating: generateForecast.isPending,
  };
}
