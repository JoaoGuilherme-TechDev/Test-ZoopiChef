import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useProfile } from './useProfile';

export interface AppNotification {
  id: string;
  type: 'order' | 'alert' | 'system' | 'ai' | 'review';
  title: string;
  message: string;
  read: boolean;
  actionPath?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export function useNotifications() {
  const { data: company } = useCompany();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['notifications', company?.id, profile?.id],
    queryFn: async (): Promise<AppNotification[]> => {
      if (!company?.id || !profile?.id) return [];

      const notifications: AppNotification[] = [];
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get recent new orders (last hour)
      const { data: newOrders } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at')
        .eq('company_id', company.id)
        .eq('status', 'novo')
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (newOrders) {
        newOrders.forEach((order) => {
          notifications.push({
            id: `order-${order.id}`,
            type: 'order',
            title: 'Novo pedido',
            message: `Pedido #${order.order_number || order.id.slice(0, 8)} aguardando`,
            read: false,
            actionPath: '/orders',
            createdAt: new Date(order.created_at),
          });
        });
      }

      // Get pending AI suggestions
      const { data: aiSuggestions } = await supabase
        .from('ai_operational_suggestions')
        .select('id, title, priority, created_at')
        .eq('company_id', company.id)
        .eq('status', 'pending')
        .gte('priority', 7)
        .order('created_at', { ascending: false })
        .limit(3);

      if (aiSuggestions) {
        aiSuggestions.forEach((s) => {
          notifications.push({
            id: `ai-${s.id}`,
            type: 'ai',
            title: 'Sugestão IA',
            message: s.title,
            read: false,
            actionPath: '/ai-recommendations',
            createdAt: new Date(s.created_at),
          });
        });
      }

      // Get pending reviews (order_reviews table)
      const { data: reviews } = await supabase
        .from('order_reviews')
        .select('id, rating, created_at')
        .eq('company_id', company.id)
        .is('reply', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (reviews) {
        reviews.forEach((r) => {
          notifications.push({
            id: `review-${r.id}`,
            type: 'review',
            title: r.rating <= 3 ? 'Avaliação negativa' : 'Nova avaliação',
            message: `Cliente deixou ${r.rating} estrela(s)`,
            read: false,
            actionPath: '/reviews',
            createdAt: new Date(r.created_at || new Date()),
          });
        });
      }

      // Get low stock alerts from erp_items
      const { data: erpItems } = await supabase
        .from('erp_items')
        .select('id, name, current_stock, min_stock')
        .eq('company_id', company.id)
        .eq('track_stock', true)
        .not('min_stock', 'is', null);

      const lowStock = erpItems?.filter(i => (i.current_stock || 0) <= (i.min_stock || 0)) || [];
      
      if (lowStock.length > 0) {
        notifications.push({
          id: 'low-stock-alert',
          type: 'alert',
          title: 'Estoque baixo',
          message: `${lowStock.length} item(ns) precisam de reposição`,
          read: false,
          actionPath: '/inventory',
          createdAt: now,
        });
      }

      // Sort by date
      return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    enabled: !!company?.id && !!profile?.id,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60, // OTIMIZAÇÃO: 60 segundos (era 30s)
    refetchOnWindowFocus: false,
  });
}

export function useUnreadCount() {
  const { data: notifications } = useNotifications();
  return notifications?.filter(n => !n.read).length || 0;
}
