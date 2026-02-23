import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  ShoppingBag,
  Star,
  Package,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface NextAction {
  id: string;
  type: 'order' | 'review' | 'suggestion' | 'stock' | 'churn';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  path?: string;
  action?: () => void;
}

export function NextActionsWidget() {
  const { data: company } = useCompany();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: actions, refetch, isLoading } = useQuery({
    queryKey: ['next-actions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const nextActions: NextAction[] = [];

      // 1. Check for new orders
      const { data: newOrders } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at')
        .eq('company_id', company.id)
        .eq('status', 'novo')
        .order('created_at', { ascending: true })
        .limit(3);

      if (newOrders && newOrders.length > 0) {
        nextActions.push({
          id: 'new-orders',
          type: 'order',
          title: `${newOrders.length} pedido${newOrders.length > 1 ? 's' : ''} aguardando`,
          description: `Confirme para iniciar preparo`,
          priority: 'high',
          path: '/orders',
        });
      }

      // 2. Check for pending AI suggestions
      const { data: suggestions } = await supabase
        .from('ai_operational_suggestions')
        .select('id, title, priority')
        .eq('company_id', company.id)
        .eq('status', 'pending')
        .gte('priority', 7)
        .order('priority', { ascending: false })
        .limit(3);

      if (suggestions && suggestions.length > 0) {
        nextActions.push({
          id: 'ai-suggestions',
          type: 'suggestion',
          title: `${suggestions.length} sugestão${suggestions.length > 1 ? 'ões' : ''} da IA`,
          description: suggestions[0]?.title || 'Melhore sua operação',
          priority: 'medium',
          path: '/ai-recommendations',
        });
      }

      // 3. Check for unanswered reviews
      const { data: reviews } = await supabase
        .from('order_reviews')
        .select('id, rating, created_at')
        .eq('company_id', company.id)
        .is('reply', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (reviews && reviews.length > 0) {
        const lowRatings = reviews.filter((r) => r.rating <= 3).length;
        nextActions.push({
          id: 'pending-reviews',
          type: 'review',
          title: `${reviews.length} avaliação${reviews.length > 1 ? 'ões' : ''} sem resposta`,
          description: lowRatings > 0 ? `${lowRatings} com nota baixa` : 'Responda seus clientes',
          priority: lowRatings > 0 ? 'high' : 'low',
          path: '/reviews',
        });
      }

      // 4. Check for low stock items
      const { data: lowStock } = await supabase
        .from('erp_items')
        .select('id, name, current_stock, min_stock')
        .eq('company_id', company.id)
        .eq('track_stock', true)
        .not('min_stock', 'is', null);

      const lowStockItems = lowStock?.filter(
        (item) => item.current_stock !== null && item.min_stock !== null && item.current_stock <= item.min_stock
      ) || [];

      if (lowStockItems.length > 0) {
        nextActions.push({
          id: 'low-stock',
          type: 'stock',
          title: `${lowStockItems.length} item${lowStockItems.length > 1 ? 'ns' : ''} com estoque baixo`,
          description: lowStockItems[0]?.name || 'Verifique seu estoque',
          priority: 'medium',
          path: '/inventory',
        });
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return nextActions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    },
    enabled: !!company?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getIcon = (type: NextAction['type']) => {
    switch (type) {
      case 'order':
        return ShoppingBag;
      case 'review':
        return Star;
      case 'suggestion':
        return Lightbulb;
      case 'stock':
        return Package;
      case 'churn':
        return AlertTriangle;
      default:
        return Zap;
    }
  };

  const getPriorityColor = (priority: NextAction['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/30';
      case 'low':
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const handleActionClick = (action: NextAction) => {
    if (action.path) {
      navigate(action.path);
    } else if (action.action) {
      action.action();
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Próximas Ações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Próximas Ações
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {actions && actions.length > 0 ? (
          <div className="space-y-2">
            {actions.slice(0, 4).map((action) => {
              const Icon = getIcon(action.type);
              return (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-card hover:bg-accent/50 border border-border/50 hover:border-primary/30 transition-all group text-left"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      action.priority === 'high'
                        ? 'bg-destructive/10'
                        : action.priority === 'medium'
                        ? 'bg-warning/10'
                        : 'bg-primary/10'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        action.priority === 'high'
                          ? 'text-destructive'
                          : action.priority === 'medium'
                          ? 'text-warning'
                          : 'text-primary'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {action.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {action.description}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${getPriorityColor(action.priority)}`}
                  >
                    {action.priority === 'high'
                      ? 'Urgente'
                      : action.priority === 'medium'
                      ? 'Médio'
                      : 'Baixo'}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-success" />
            </div>
            <p className="text-sm font-medium text-foreground">Tudo em ordem!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Nenhuma ação pendente no momento
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
