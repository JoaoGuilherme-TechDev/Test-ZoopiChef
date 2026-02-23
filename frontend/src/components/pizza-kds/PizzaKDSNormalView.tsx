import React from 'react';
import { usePizzaKDSSession } from '@/contexts/PizzaKDSSessionContext';
import { usePizzaOrderProgress } from '@/hooks/usePizzaOrderProgress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Pizza, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PIZZA_KDS_STEP_LABELS, PIZZA_KDS_STEP_ORDER, PizzaKDSStep } from '@/hooks/usePizzaKDSSettings';

export function PizzaKDSNormalView() {
  const { companyId } = usePizzaKDSSession();
  const { progress, isLoading: progressLoading } = usePizzaOrderProgress(companyId || undefined);

  // Fetch order details for the progress items
  const orderIds = [...new Set(progress.map((p) => p.order_id))];

  const { data: orders = [] } = useQuery({
    queryKey: ['pizza-kds-orders', orderIds],
    queryFn: async () => {
      if (orderIds.length === 0) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          created_at,
          order_items(id, product_name, quantity, selected_options_json)
        `)
        .in('id', orderIds);

      if (error) throw error;
      return data || [];
    },
    enabled: orderIds.length > 0,
  });

  const ordersMap = new Map(orders.map((o) => [o.id, o]));

  // Group progress by step
  const progressByStep = PIZZA_KDS_STEP_ORDER.reduce((acc, step) => {
    acc[step] = progress.filter((p) => p.current_step === step);
    return acc;
  }, {} as Record<PizzaKDSStep, typeof progress>);

  if (progressLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 h-full">
      <div className="mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Pizza className="w-5 h-5" />
          Visão Geral - Todas as Etapas
        </h2>
        <p className="text-sm text-muted-foreground">
          Visualização somente leitura de todas as pizzas em produção
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[calc(100vh-220px)]">
        {PIZZA_KDS_STEP_ORDER.map((step) => (
          <div key={step} className="flex flex-col">
            <div className="bg-card border rounded-t-lg px-3 py-2">
              <h3 className="font-medium text-sm">{PIZZA_KDS_STEP_LABELS[step]}</h3>
              <p className="text-xs text-muted-foreground">
                {progressByStep[step].length} pizza(s)
              </p>
            </div>
            <ScrollArea className="flex-1 border border-t-0 rounded-b-lg bg-muted/30 p-2">
              <div className="space-y-2">
                {progressByStep[step].length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhuma pizza
                  </p>
                ) : (
                  progressByStep[step].map((p) => {
                    const order = ordersMap.get(p.order_id);
                    const orderItem = order?.order_items?.find(
                      (i: any) => i.id === p.order_item_id
                    );

                    const startedAtField = `step_${step}_started_at` as keyof typeof p;
                    const isStarted = !!p[startedAtField];

                    return (
                      <Card key={p.id} className="bg-card">
                        <CardHeader className="p-2 pb-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">
                              #{order?.order_number || '?'}
                            </span>
                            <Badge variant={isStarted ? 'default' : 'outline'} className="text-xs">
                              {isStarted ? 'Em andamento' : 'Aguardando'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-2 pt-0 space-y-1">
                          <p className="text-xs font-medium truncate">
                            {orderItem?.product_name || 'Pizza'}
                          </p>
                          
                          {/* Show dough and border in first step */}
                          {step === 'dough_border' && (p.dough_type || p.border_type) && (
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {p.dough_type && <p>Massa: {p.dough_type}</p>}
                              {p.border_type && <p>Borda: {p.border_type}</p>}
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(p.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>
    </div>
  );
}
