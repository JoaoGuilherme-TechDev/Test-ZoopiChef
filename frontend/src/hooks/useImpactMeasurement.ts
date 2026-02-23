import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface ImpactMetrics {
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
  product_sales?: Record<string, number>;
}

export interface DeltaMetrics {
  orders_delta: number;
  revenue_delta: number;
  ticket_delta: number;
  orders_percent: number;
  revenue_percent: number;
  ticket_percent: number;
}

export interface RecommendationImpact {
  id: string;
  company_id: string;
  recommendation_id: string;
  source: 'gestora' | 'cardapio' | 'tv';
  source_id: string | null;
  baseline_window_days: number;
  evaluation_window_days: number;
  baseline_metrics_json: ImpactMetrics;
  after_metrics_json: ImpactMetrics;
  delta_metrics_json: DeltaMetrics;
  status: 'pending' | 'evaluated' | 'insufficient_data';
  applied_at: string;
  evaluated_at: string | null;
  created_at: string;
}

function parseMetrics(json: Json | null): ImpactMetrics {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { total_orders: 0, total_revenue: 0, avg_ticket: 0 };
  }
  const obj = json as Record<string, Json>;
  return {
    total_orders: typeof obj.total_orders === 'number' ? obj.total_orders : 0,
    total_revenue: typeof obj.total_revenue === 'number' ? obj.total_revenue : 0,
    avg_ticket: typeof obj.avg_ticket === 'number' ? obj.avg_ticket : 0,
    product_sales: obj.product_sales as Record<string, number> | undefined,
  };
}

function parseDeltaMetrics(json: Json | null): DeltaMetrics {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { orders_delta: 0, revenue_delta: 0, ticket_delta: 0, orders_percent: 0, revenue_percent: 0, ticket_percent: 0 };
  }
  const obj = json as Record<string, Json>;
  return {
    orders_delta: typeof obj.orders_delta === 'number' ? obj.orders_delta : 0,
    revenue_delta: typeof obj.revenue_delta === 'number' ? obj.revenue_delta : 0,
    ticket_delta: typeof obj.ticket_delta === 'number' ? obj.ticket_delta : 0,
    orders_percent: typeof obj.orders_percent === 'number' ? obj.orders_percent : 0,
    revenue_percent: typeof obj.revenue_percent === 'number' ? obj.revenue_percent : 0,
    ticket_percent: typeof obj.ticket_percent === 'number' ? obj.ticket_percent : 0,
  };
}

export function useRecommendationImpacts(recommendationIds?: string[]) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['recommendation-impacts', profile?.company_id, recommendationIds],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      let query = supabase
        .from('ai_recommendation_impacts')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (recommendationIds && recommendationIds.length > 0) {
        query = query.in('recommendation_id', recommendationIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row): RecommendationImpact => ({
        id: row.id,
        company_id: row.company_id,
        recommendation_id: row.recommendation_id,
        source: (row.source as 'gestora' | 'cardapio' | 'tv') || 'gestora',
        source_id: row.source_id,
        baseline_window_days: row.baseline_window_days,
        evaluation_window_days: row.evaluation_window_days,
        baseline_metrics_json: parseMetrics(row.baseline_metrics_json),
        after_metrics_json: parseMetrics(row.after_metrics_json),
        delta_metrics_json: parseDeltaMetrics(row.delta_metrics_json),
        status: row.status as 'pending' | 'evaluated' | 'insufficient_data',
        applied_at: row.applied_at,
        evaluated_at: row.evaluated_at,
        created_at: row.created_at,
      }));
    },
    enabled: !!profile?.company_id,
  });
}

export function useEvaluateImpact() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async ({ 
      recommendationId,
      appliedAt,
      windowDays = 7,
    }: { 
      recommendationId: string;
      appliedAt: string;
      windowDays?: number;
    }) => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const appliedDate = new Date(appliedAt);
      const now = new Date();
      
      // Check if enough time has passed for evaluation
      const daysSinceApplied = Math.floor((now.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceApplied < windowDays) {
        throw new Error(`Aguarde ${windowDays - daysSinceApplied} dias para avaliar o impacto`);
      }

      // Calculate date ranges
      const baselineStart = new Date(appliedDate);
      baselineStart.setDate(baselineStart.getDate() - windowDays);
      const baselineEnd = new Date(appliedDate);

      const afterStart = new Date(appliedDate);
      const afterEnd = new Date(appliedDate);
      afterEnd.setDate(afterEnd.getDate() + windowDays);

      // Fetch baseline metrics (before)
      const { data: baselineOrders, error: baselineError } = await supabase
        .from('orders')
        .select('total')
        .eq('company_id', profile.company_id)
        .gte('created_at', baselineStart.toISOString())
        .lt('created_at', baselineEnd.toISOString());

      if (baselineError) throw baselineError;

      // Fetch after metrics
      const { data: afterOrders, error: afterError } = await supabase
        .from('orders')
        .select('total')
        .eq('company_id', profile.company_id)
        .gte('created_at', afterStart.toISOString())
        .lt('created_at', afterEnd.toISOString());

      if (afterError) throw afterError;

      // Calculate metrics
      const baselineMetrics: ImpactMetrics = {
        total_orders: baselineOrders?.length || 0,
        total_revenue: baselineOrders?.reduce((sum, o) => sum + Number(o.total), 0) || 0,
        avg_ticket: baselineOrders?.length 
          ? (baselineOrders.reduce((sum, o) => sum + Number(o.total), 0) / baselineOrders.length) 
          : 0,
      };

      const afterMetrics: ImpactMetrics = {
        total_orders: afterOrders?.length || 0,
        total_revenue: afterOrders?.reduce((sum, o) => sum + Number(o.total), 0) || 0,
        avg_ticket: afterOrders?.length 
          ? (afterOrders.reduce((sum, o) => sum + Number(o.total), 0) / afterOrders.length) 
          : 0,
      };

      // Check for insufficient data
      if (baselineMetrics.total_orders === 0 && afterMetrics.total_orders === 0) {
        // Check if record exists
        const { data: existing } = await supabase
          .from('ai_recommendation_impacts')
          .select('id')
          .eq('recommendation_id', recommendationId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('ai_recommendation_impacts')
            .update({
              baseline_metrics_json: baselineMetrics as unknown as Json,
              after_metrics_json: afterMetrics as unknown as Json,
              delta_metrics_json: {} as Json,
              status: 'insufficient_data',
              evaluated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('ai_recommendation_impacts')
            .insert({
              company_id: profile.company_id,
              recommendation_id: recommendationId,
              baseline_window_days: windowDays,
              evaluation_window_days: windowDays,
              baseline_metrics_json: baselineMetrics as unknown as Json,
              after_metrics_json: afterMetrics as unknown as Json,
              delta_metrics_json: {} as Json,
              status: 'insufficient_data',
              applied_at: appliedAt,
              evaluated_at: new Date().toISOString(),
            });
        }

        return { status: 'insufficient_data', message: 'Dados insuficientes para avaliação' };
      }

      // Calculate deltas
      const deltaMetrics: DeltaMetrics = {
        orders_delta: afterMetrics.total_orders - baselineMetrics.total_orders,
        revenue_delta: afterMetrics.total_revenue - baselineMetrics.total_revenue,
        ticket_delta: afterMetrics.avg_ticket - baselineMetrics.avg_ticket,
        orders_percent: baselineMetrics.total_orders > 0 
          ? ((afterMetrics.total_orders - baselineMetrics.total_orders) / baselineMetrics.total_orders) * 100 
          : afterMetrics.total_orders > 0 ? 100 : 0,
        revenue_percent: baselineMetrics.total_revenue > 0 
          ? ((afterMetrics.total_revenue - baselineMetrics.total_revenue) / baselineMetrics.total_revenue) * 100 
          : afterMetrics.total_revenue > 0 ? 100 : 0,
        ticket_percent: baselineMetrics.avg_ticket > 0 
          ? ((afterMetrics.avg_ticket - baselineMetrics.avg_ticket) / baselineMetrics.avg_ticket) * 100 
          : afterMetrics.avg_ticket > 0 ? 100 : 0,
      };

      // Check if record exists
      const { data: existing } = await supabase
        .from('ai_recommendation_impacts')
        .select('id')
        .eq('recommendation_id', recommendationId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('ai_recommendation_impacts')
          .update({
            baseline_metrics_json: baselineMetrics as unknown as Json,
            after_metrics_json: afterMetrics as unknown as Json,
            delta_metrics_json: deltaMetrics as unknown as Json,
            status: 'evaluated',
            evaluated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('ai_recommendation_impacts')
          .insert({
            company_id: profile.company_id,
            recommendation_id: recommendationId,
            baseline_window_days: windowDays,
            evaluation_window_days: windowDays,
            baseline_metrics_json: baselineMetrics as unknown as Json,
            after_metrics_json: afterMetrics as unknown as Json,
            delta_metrics_json: deltaMetrics as unknown as Json,
            status: 'evaluated',
            applied_at: appliedAt,
            evaluated_at: new Date().toISOString(),
          });
      }

      // Update recommendation impact_result
      await supabase
        .from('ai_recommendations')
        .update({ impact_result: deltaMetrics as unknown as Json })
        .eq('id', recommendationId);

      // Determine impact type for confidence scoring
      const impactType: 'positive' | 'neutral' | 'negative' = 
        deltaMetrics.revenue_percent > 3 ? 'positive' :
        deltaMetrics.revenue_percent < -3 ? 'negative' : 'neutral';

      return { 
        status: 'evaluated' as const, 
        metrics: { baseline: baselineMetrics, after: afterMetrics, delta: deltaMetrics },
        impactType,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recommendation-impacts'] });
      queryClient.invalidateQueries({ queryKey: ['unified-suggestions'] });
      
      if (data.status === 'evaluated') {
        toast({
          title: 'Impacto avaliado',
          description: 'A análise de antes/depois foi concluída.',
        });
      } else {
        toast({
          title: 'Dados insuficientes',
          description: 'Não há pedidos suficientes para avaliar o impacto.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Erro na avaliação',
        description: error.message || 'Não foi possível avaliar o impacto.',
        variant: 'destructive',
      });
    },
  });
}

export function useImpactSummary() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['impact-summary', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      const { data, error } = await supabase
        .from('ai_recommendation_impacts')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('status', 'evaluated');

      if (error) throw error;

      const impacts = (data || []).map((row) => ({
        delta_metrics_json: parseDeltaMetrics(row.delta_metrics_json),
      }));
      
      if (impacts.length === 0) {
        return {
          total_evaluated: 0,
          avg_revenue_delta: 0,
          avg_orders_delta: 0,
          positive_impacts: 0,
          negative_impacts: 0,
        };
      }

      const totalRevenueDelta = impacts.reduce((sum, i) => sum + (i.delta_metrics_json.revenue_percent || 0), 0);
      const totalOrdersDelta = impacts.reduce((sum, i) => sum + (i.delta_metrics_json.orders_percent || 0), 0);
      const positiveImpacts = impacts.filter(i => (i.delta_metrics_json.revenue_percent || 0) > 0).length;
      const negativeImpacts = impacts.filter(i => (i.delta_metrics_json.revenue_percent || 0) < 0).length;

      return {
        total_evaluated: impacts.length,
        avg_revenue_delta: totalRevenueDelta / impacts.length,
        avg_orders_delta: totalOrdersDelta / impacts.length,
        positive_impacts: positiveImpacts,
        negative_impacts: negativeImpacts,
      };
    },
    enabled: !!profile?.company_id,
  });
}
