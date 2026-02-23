import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

interface AIInsight {
  id: string;
  type: 'tip' | 'alert' | 'opportunity' | 'trend';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel?: string;
  actionPath?: string;
  source: string;
}

export function useAIInsights() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['ai-insights', company?.id],
    queryFn: async (): Promise<AIInsight[]> => {
      if (!company?.id) return [];

      const insights: AIInsight[] = [];

      // Get recent AI suggestions
      const { data: suggestions } = await supabase
        .from('ai_operational_suggestions')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .limit(3);

      if (suggestions) {
        suggestions.forEach((s) => {
          insights.push({
            id: s.id,
            type: s.category === 'revenue' ? 'opportunity' : s.category === 'alert' ? 'alert' : 'tip',
            title: s.title,
            description: s.description,
            priority: s.priority >= 8 ? 'high' : s.priority >= 5 ? 'medium' : 'low',
            actionLabel: 'Ver detalhes',
            actionPath: '/ai-recommendations',
            source: 'ai_operational',
          });
        });
      }

      // Get churn predictions
      const { data: churnData } = await supabase
        .from('ai_churn_predictions')
        .select('id, risk_level, churn_score')
        .eq('company_id', company.id)
        .eq('risk_level', 'critical')
        .is('intervention_at', null)
        .limit(5);

      if (churnData && churnData.length > 0) {
        insights.push({
          id: 'churn-alert',
          type: 'alert',
          title: `${churnData.length} cliente(s) em risco de churn`,
          description: 'Clientes identificados com alta probabilidade de abandono. Ação recomendada.',
          priority: 'high',
          actionLabel: 'Ver clientes',
          actionPath: '/ai-churn',
          source: 'churn_predictor',
        });
      }

      // Get low stock items from erp_items
      const { data: lowStock } = await supabase
        .from('erp_items')
        .select('id, name, current_stock, min_stock')
        .eq('company_id', company.id)
        .eq('track_stock', true)
        .not('min_stock', 'is', null);

      const lowStockItems = lowStock?.filter(item => 
        (item.current_stock || 0) <= (item.min_stock || 0)
      ) || [];

      if (lowStockItems.length > 0) {
        insights.push({
          id: 'low-stock',
          type: 'alert',
          title: `${lowStockItems.length} item(ns) com estoque baixo`,
          description: `Itens como "${lowStockItems[0]?.name}" estão abaixo do mínimo.`,
          priority: 'medium',
          actionLabel: 'Ver estoque',
          actionPath: '/inventory',
          source: 'inventory',
        });
      }

      // Get today's performance trend
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${todayStr}T00:00:00`);

      const todayRevenue = todayOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      // Get yesterday for comparison
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      
      const { data: yesterdayOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${yesterdayStr}T00:00:00`)
        .lt('created_at', `${todayStr}T00:00:00`);

      const yesterdayRevenue = yesterdayOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      if (yesterdayRevenue > 0) {
        const percentChange = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
        
        if (percentChange > 10) {
          insights.push({
            id: 'revenue-up',
            type: 'trend',
            title: `Vendas ${percentChange.toFixed(0)}% acima de ontem`,
            description: 'Ótimo desempenho! Continue assim.',
            priority: 'low',
            source: 'analytics',
          });
        } else if (percentChange < -20) {
          insights.push({
            id: 'revenue-down',
            type: 'alert',
            title: `Vendas ${Math.abs(percentChange).toFixed(0)}% abaixo de ontem`,
            description: 'Considere ações promocionais para impulsionar vendas.',
            priority: 'medium',
            actionLabel: 'Criar promoção',
            actionPath: '/campaigns',
            source: 'analytics',
          });
        }
      }

      // Get pending reviews
      const { data: pendingReviews } = await supabase
        .from('order_reviews')
        .select('id')
        .eq('company_id', company.id)
        .is('reply', null)
        .limit(10);

      if (pendingReviews && pendingReviews.length >= 3) {
        insights.push({
          id: 'pending-reviews',
          type: 'tip',
          title: `${pendingReviews.length} avaliação(ões) sem resposta`,
          description: 'Responder avaliações melhora engajamento do cliente.',
          priority: 'low',
          actionLabel: 'Ver avaliações',
          actionPath: '/reviews',
          source: 'reviews',
        });
      }

      return insights.slice(0, 5); // Limit to 5 insights
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 3, // 3 min
    refetchInterval: 1000 * 60 * 10, // OTIMIZAÇÃO: 10 minutos (era 5min)
    refetchOnWindowFocus: false,
  });
}
