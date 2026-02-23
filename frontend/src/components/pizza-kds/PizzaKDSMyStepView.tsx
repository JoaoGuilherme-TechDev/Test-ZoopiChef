import React from 'react';
import { usePizzaKDSSession } from '@/contexts/PizzaKDSSessionContext';
import { usePizzaOrderProgress, usePizzaStepActions } from '@/hooks/usePizzaOrderProgress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Pizza, Clock, Play, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PIZZA_KDS_STEP_LABELS, PIZZA_KDS_STEP_ORDER, PizzaKDSStep } from '@/hooks/usePizzaKDSSettings';
import { toast } from 'sonner';

export function PizzaKDSMyStepView() {
  const { companyId, operator } = usePizzaKDSSession();
  const { progress, isLoading: progressLoading } = usePizzaOrderProgress(companyId || undefined);
  const { startStep, completeStep } = usePizzaStepActions(companyId || undefined);

  const myStep = operator?.assigned_step as PizzaKDSStep;

  // Get enabled steps from settings
  const { data: settings } = useQuery({
    queryKey: ['pizza-kds-settings-pwa', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('pizza_kds_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const enabledSteps: PizzaKDSStep[] = [];
  if (settings?.step_dough_border_enabled) enabledSteps.push('dough_border');
  if (settings?.step_toppings_enabled) enabledSteps.push('toppings');
  if (settings?.step_oven_enabled) enabledSteps.push('oven');
  if (settings?.step_finish_enabled) enabledSteps.push('finish');

  // Filter progress for my step only
  const myProgress = progress.filter((p) => p.current_step === myStep);

  // Fetch order details
  const orderIds = [...new Set(myProgress.map((p) => p.order_id))];

  const { data: orders = [] } = useQuery({
    queryKey: ['pizza-kds-my-orders', orderIds],
    queryFn: async () => {
      if (orderIds.length === 0) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          created_at,
          order_items(id, product_name, quantity, selected_options_json, notes)
        `)
        .in('id', orderIds);

      if (error) throw error;
      return data || [];
    },
    enabled: orderIds.length > 0,
  });

  const ordersMap = new Map(orders.map((o) => [o.id, o]));

  const handleStart = async (progressId: string) => {
    if (!operator) return;

    try {
      await startStep.mutateAsync({ progressId, operatorId: operator.id });
      toast.success('Etapa iniciada!');
    } catch {
      toast.error('Erro ao iniciar etapa');
    }
  };

  const handleComplete = async (progressId: string) => {
    if (!operator) return;

    try {
      await completeStep.mutateAsync({
        progressId,
        operatorId: operator.id,
        enabledSteps,
      });
      toast.success('Etapa concluída!');
    } catch {
      toast.error('Erro ao concluir etapa');
    }
  };

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
          {PIZZA_KDS_STEP_LABELS[myStep]}
        </h2>
        <p className="text-sm text-muted-foreground">
          {myProgress.length} pizza(s) aguardando sua ação
        </p>
      </div>

      {myProgress.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <Pizza className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Nenhuma pizza na sua etapa</p>
          <p className="text-xs text-muted-foreground">
            Aguarde novos pedidos chegarem
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {myProgress.map((p) => {
              const order = ordersMap.get(p.order_id);
              const orderItem = order?.order_items?.find((i: any) => i.id === p.order_item_id);

              const startedAtField = `step_${myStep}_started_at` as keyof typeof p;
              const isStarted = !!p[startedAtField];

              // Parse selected options to show flavors, etc.
              let optionsDisplay: string[] = [];
              if (orderItem?.selected_options_json) {
                try {
                  const opts = typeof orderItem.selected_options_json === 'string'
                    ? JSON.parse(orderItem.selected_options_json)
                    : orderItem.selected_options_json;

                  if (opts.flavors && Array.isArray(opts.flavors)) {
                    optionsDisplay = opts.flavors.map((f: any) => f.name || f);
                  }
                } catch {}
              }

              return (
                <Card key={p.id} className={`bg-card ${isStarted ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xl">#{order?.order_number || '?'}</span>
                      <Badge variant={isStarted ? 'default' : 'secondary'}>
                        {isStarted ? 'Em andamento' : 'Aguardando'}
                      </Badge>
                    </div>
                    {order?.customer_name && (
                      <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                    )}
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    <p className="font-medium">{orderItem?.product_name || 'Pizza'}</p>

                    {/* Dough and Border display for DOUGH_BORDER step */}
                    {myStep === 'dough_border' && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 space-y-1">
                        <p className="text-sm font-medium text-orange-800">Preparo da Base:</p>
                        <div className="text-sm">
                          <p>
                            <span className="text-muted-foreground">Massa:</span>{' '}
                            <span className="font-medium">{p.dough_type || 'Tradicional'}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Borda:</span>{' '}
                            <span className="font-medium">{p.border_type || 'Sem borda'}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Flavors for TOPPINGS step */}
                    {myStep === 'toppings' && optionsDisplay.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                        <p className="text-sm font-medium text-green-800">Sabores:</p>
                        <ul className="text-sm list-disc list-inside">
                          {optionsDisplay.map((opt, i) => (
                            <li key={i}>{opt}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Notes */}
                    {orderItem?.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                        <p className="text-xs font-medium text-yellow-800">Observações:</p>
                        <p className="text-sm">{orderItem.notes}</p>
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
                  <CardFooter className="p-3 pt-0">
                    {!isStarted ? (
                      <Button
                        className="w-full"
                        onClick={() => handleStart(p.id)}
                        disabled={startStep.isPending}
                      >
                        {startStep.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        Iniciar
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => handleComplete(p.id)}
                        disabled={completeStep.isPending}
                      >
                        {completeStep.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        Concluir
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
