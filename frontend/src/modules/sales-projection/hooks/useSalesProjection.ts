import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface SalesProjection {
  id: string;
  company_id: string;
  name: string;
  base_period_type: 'week' | 'month' | 'year';
  base_start_date: string;
  base_end_date: string;
  target_start_date: string;
  target_end_date: string;
  margin_percent: number;
  base_revenue: number;
  target_revenue: number;
  current_revenue: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface ProjectionDaily {
  id: string;
  projection_id: string;
  date: string;
  expected_revenue: number;
  actual_revenue: number;
  orders_count: number;
  difference_percent: number;
  status: 'pending' | 'on_track' | 'below' | 'above';
}

export interface ProjectionRecommendation {
  id: string;
  projection_id: string;
  recommendation_type: 'action' | 'alert' | 'insight' | 'product';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  status: 'pending' | 'applied' | 'dismissed';
  created_at: string;
}

export function useSalesProjections() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['sales-projections', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('sales_projections')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SalesProjection[];
    },
    enabled: !!company?.id,
  });
}

export function useActiveProjection() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['active-projection', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from('sales_projections')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SalesProjection | null;
    },
    enabled: !!company?.id,
  });
}

export function useProjectionDaily(projectionId: string | undefined) {
  return useQuery({
    queryKey: ['projection-daily', projectionId],
    queryFn: async () => {
      if (!projectionId) return [];
      const { data, error } = await supabase
        .from('sales_projection_daily')
        .select('*')
        .eq('projection_id', projectionId)
        .order('date');
      if (error) throw error;
      return data as ProjectionDaily[];
    },
    enabled: !!projectionId,
  });
}

export function useProjectionRecommendations(projectionId: string | undefined) {
  return useQuery({
    queryKey: ['projection-recommendations', projectionId],
    queryFn: async () => {
      if (!projectionId) return [];
      const { data, error } = await supabase
        .from('sales_projection_recommendations')
        .select('*')
        .eq('projection_id', projectionId)
        .eq('status', 'pending')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as ProjectionRecommendation[];
    },
    enabled: !!projectionId,
  });
}

export function useCreateProjection() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { name: string; basePeriodType: string; marginPercent: number }) => {
      if (!company?.id) throw new Error('Company not found');
      
      const { data, error } = await supabase.functions.invoke('ai-sales-projection', {
        body: {
          companyId: company.id,
          action: 'create_projection',
          ...params,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-projections'] });
      queryClient.invalidateQueries({ queryKey: ['active-projection'] });
      toast.success('Projeção criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating projection:', error);
      toast.error('Erro ao criar projeção');
    },
  });
}

export function useAnalyzeProjection() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectionId: string) => {
      if (!company?.id) throw new Error('Company not found');
      
      const { data, error } = await supabase.functions.invoke('ai-sales-projection', {
        body: {
          companyId: company.id,
          projectionId,
          action: 'analyze',
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projection-recommendations'] });
      toast.success('Análise concluída!');
    },
    onError: (error: any) => {
      console.error('Error analyzing projection:', error);
      if (error.message?.includes('429')) {
        toast.error('Limite de requisições atingido. Tente novamente em alguns minutos.');
      } else if (error.message?.includes('402')) {
        toast.error('Créditos insuficientes. Adicione créditos para continuar.');
      } else {
        toast.error('Erro ao analisar projeção');
      }
    },
  });
}

export function useUpdateProjectionDaily() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectionId: string) => {
      if (!company?.id) throw new Error('Company not found');
      
      const { data, error } = await supabase.functions.invoke('ai-sales-projection', {
        body: {
          companyId: company.id,
          projectionId,
          action: 'update_daily',
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projection-daily'] });
      queryClient.invalidateQueries({ queryKey: ['active-projection'] });
      queryClient.invalidateQueries({ queryKey: ['sales-projections'] });
    },
  });
}

export function useDismissRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recommendationId: string) => {
      const { error } = await supabase
        .from('sales_projection_recommendations')
        .update({ status: 'dismissed' })
        .eq('id', recommendationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projection-recommendations'] });
    },
  });
}

export function useApplyRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recommendationId: string) => {
      const { error } = await supabase
        .from('sales_projection_recommendations')
        .update({ status: 'applied' })
        .eq('id', recommendationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projection-recommendations'] });
      toast.success('Recomendação aplicada!');
    },
  });
}
