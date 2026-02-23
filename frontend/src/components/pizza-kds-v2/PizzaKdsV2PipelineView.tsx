import React from 'react';
import { usePizzaKdsV2Session } from '@/contexts/PizzaKdsV2SessionContext';
import { usePizzaKdsV2Orders } from '@/hooks/usePizzaKdsV2Orders';
import { PizzaKdsV2OrderCard } from './PizzaKdsV2OrderCard';
import { 
  PizzaKdsV2Stage, 
  PIZZA_KDS_V2_STAGE_LABELS, 
  PIZZA_KDS_V2_STAGE_CONFIG,
  getProcessableStages 
} from '@/lib/pizzaKdsV2Stages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Pizza } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pizza KDS V2 - Pipeline View (Cozinha Geral)
 * 
 * Shows all orders across all stages in a horizontal pipeline layout.
 * Used for monitoring the entire production line.
 */

interface PizzaKdsV2PipelineViewProps {
  isReadOnly?: boolean;
}

export function PizzaKdsV2PipelineView({ isReadOnly = false }: PizzaKdsV2PipelineViewProps) {
  const { companyId, operator } = usePizzaKdsV2Session();
  const { orders, isLoading, startOrder, completeStage, releaseOwnership } = usePizzaKdsV2Orders({ 
    companyId 
  });

  const stages = getProcessableStages();

  // Group orders by stage
  const ordersByStage = React.useMemo(() => {
    const grouped: Record<PizzaKdsV2Stage, typeof orders> = {
      massa_borda: [],
      recheio: [],
      forno: [],
      finalizacao: [],
      done: [],
    };

    orders.forEach(order => {
      const stage = order.current_stage as PizzaKdsV2Stage;
      if (grouped[stage]) {
        grouped[stage].push(order);
      }
    });

    return grouped;
  }, [orders]);

  const handleStart = (itemId: string) => {
    if (operator) {
      startOrder.mutate({ itemId, operatorId: operator.id });
    }
  };

  const handleComplete = (itemId: string) => {
    if (operator) {
      completeStage.mutate({ itemId, operatorId: operator.id });
    }
  };

  const handleRelease = (itemId: string) => {
    releaseOwnership.mutate({ itemId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Pipeline header */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {stages.map((stage, idx) => {
          const config = PIZZA_KDS_V2_STAGE_CONFIG[stage];
          return (
            <React.Fragment key={stage}>
              <div 
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap',
                  config.bgColor,
                  config.borderColor,
                  'border'
                )}
              >
                <span className="text-lg">{config.icon}</span>
                <span className={cn('font-medium', config.color)}>
                  {PIZZA_KDS_V2_STAGE_LABELS[stage]}
                </span>
                <span className={cn('text-xs', config.color)}>
                  ({ordersByStage[stage].length})
                </span>
              </div>
              {idx < stages.length - 1 && (
                <span className="text-muted-foreground">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Pipeline columns */}
      <div className="grid grid-cols-4 gap-4 h-[calc(100%-60px)]">
        {stages.map(stage => {
          const config = PIZZA_KDS_V2_STAGE_CONFIG[stage];
          const stageOrders = ordersByStage[stage];

          return (
            <Card 
              key={stage} 
              className={cn('flex flex-col', config.borderColor, 'border-2')}
            >
              <CardHeader className={cn('py-3', config.bgColor)}>
                <CardTitle className={cn('text-base flex items-center gap-2', config.color)}>
                  <span>{config.icon}</span>
                  {PIZZA_KDS_V2_STAGE_LABELS[stage]}
                  <span className="ml-auto text-sm font-normal">
                    {stageOrders.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-2 overflow-hidden">
                <ScrollArea className="h-full">
                  {stageOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <Pizza className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-sm">Nenhum pedido</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-2">
                      {stageOrders.map(order => (
                        <PizzaKdsV2OrderCard
                          key={order.id}
                          item={order}
                          operatorId={operator?.id || null}
                          operatorStage={operator?.assigned_stage || null}
                          onStart={handleStart}
                          onComplete={handleComplete}
                          onRelease={handleRelease}
                          isReadOnly={isReadOnly}
                          compact
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
