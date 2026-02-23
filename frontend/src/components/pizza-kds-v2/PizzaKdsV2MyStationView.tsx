import React from 'react';
import { usePizzaKdsV2Session } from '@/contexts/PizzaKdsV2SessionContext';
import { usePizzaKdsV2Orders } from '@/hooks/usePizzaKdsV2Orders';
import { PizzaKdsV2OrderCard } from './PizzaKdsV2OrderCard';
import { PizzaKdsV2Stage, PIZZA_KDS_V2_STAGE_LABELS, PIZZA_KDS_V2_STAGE_CONFIG } from '@/lib/pizzaKdsV2Stages';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Pizza } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pizza KDS V2 - My Station View (Meu Posto)
 * 
 * Focused personal view showing only orders for the operator's assigned stage.
 * Clean vertical layout for maximum focus.
 */

export function PizzaKdsV2MyStationView() {
  const { companyId, operator } = usePizzaKdsV2Session();
  
  // Only show orders for operator's stage (unless admin)
  const filterStage = operator?.assigned_stage !== 'admin' 
    ? operator?.assigned_stage as PizzaKdsV2Stage 
    : null;
  
  const { orders, isLoading, startOrder, completeStage, releaseOwnership } = usePizzaKdsV2Orders({ 
    companyId,
    filterStage,
  });

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

  const stageConfig = operator?.assigned_stage && operator.assigned_stage !== 'admin'
    ? PIZZA_KDS_V2_STAGE_CONFIG[operator.assigned_stage as PizzaKdsV2Stage]
    : null;

  const stageLabel = operator?.assigned_stage && operator.assigned_stage !== 'admin'
    ? PIZZA_KDS_V2_STAGE_LABELS[operator.assigned_stage as PizzaKdsV2Stage]
    : 'Administrador';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Station header */}
      <div 
        className={cn(
          'flex items-center gap-3 p-4 rounded-lg mb-4',
          stageConfig?.bgColor || 'bg-primary/10',
          stageConfig?.borderColor || 'border-primary',
          'border-2'
        )}
      >
        {stageConfig && (
          <span className="text-3xl">{stageConfig.icon}</span>
        )}
        <div>
          <h2 className={cn('text-xl font-bold', stageConfig?.color || 'text-primary')}>
            {stageLabel}
          </h2>
          <p className="text-sm text-muted-foreground">
            {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'} pendente{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Orders list */}
      <ScrollArea className="flex-1">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Pizza className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum pedido no momento</p>
            <p className="text-sm">Novos pedidos aparecerão automaticamente</p>
          </div>
        ) : (
          <div className="space-y-4 pr-4">
            {orders.map(order => (
              <PizzaKdsV2OrderCard
                key={order.id}
                item={order}
                operatorId={operator?.id || null}
                operatorStage={operator?.assigned_stage || null}
                onStart={handleStart}
                onComplete={handleComplete}
                onRelease={handleRelease}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
