import React, { useMemo } from 'react';
import { PizzaKdsV2OrderItem } from '@/hooks/usePizzaKdsV2Orders';
import { 
  PizzaKdsV2Stage, 
  PIZZA_KDS_V2_STAGE_CONFIG, 
  PIZZA_KDS_V2_STAGE_LABELS,
  PIZZA_KDS_V2_URGENCY_CONFIG,
  PizzaKdsV2Urgency 
} from '@/lib/pizzaKdsV2Stages';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, CheckCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pizza KDS V2 - Order Card Component
 * 
 * Displays a pizza order with stage-specific details and action buttons.
 * Each stage only shows the data relevant to that step.
 */

interface PizzaKdsV2OrderCardProps {
  item: PizzaKdsV2OrderItem;
  operatorId: string | null;
  operatorStage: PizzaKdsV2Stage | 'admin' | null;
  onStart?: (itemId: string) => void;
  onComplete?: (itemId: string) => void;
  onRelease?: (itemId: string) => void;
  isReadOnly?: boolean;
  compact?: boolean;
}

export function PizzaKdsV2OrderCard({
  item,
  operatorId,
  operatorStage,
  onStart,
  onComplete,
  onRelease,
  isReadOnly = false,
  compact = false,
}: PizzaKdsV2OrderCardProps) {
  const stageConfig = PIZZA_KDS_V2_STAGE_CONFIG[item.current_stage as PizzaKdsV2Stage];
  const urgencyConfig = PIZZA_KDS_V2_URGENCY_CONFIG[item.urgency as PizzaKdsV2Urgency];

  // Calculate elapsed time since order was created
  const elapsedTime = useMemo(() => {
    const created = new Date(item.created_at).getTime();
    const now = Date.now();
    const diffMs = now - created;
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [item.created_at]);

  // Check if this operator can interact with this item
  const canInteract = !isReadOnly && (
    operatorStage === 'admin' || 
    operatorStage === item.current_stage
  );
  
  const isOwner = item.owned_by_operator_id === operatorId;
  const isOwned = !!item.owned_by_operator_id;

  // Order source display
  const orderSource = item.table_number 
    ? `Mesa ${item.table_number}` 
    : item.order_number 
    ? `#${item.order_number}` 
    : 'Pedido';

  const currentStage = item.current_stage as PizzaKdsV2Stage;

  return (
    <Card 
      className={cn(
        'transition-all duration-200',
        urgencyConfig.borderColor,
        urgencyConfig.bgColor,
        'border-2',
        isOwner && 'ring-2 ring-primary ring-offset-2',
        compact && 'p-2'
      )}
    >
      <CardContent className={cn('space-y-3', compact ? 'p-2' : 'p-4')}>
        {/* Header: Order number, timer, urgency */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{stageConfig.icon}</span>
            <span className="font-bold text-lg">{orderSource}</span>
          </div>
          <div className="flex items-center gap-2">
            {item.urgency !== 'normal' && (
              <Badge 
                variant="outline" 
                className={cn(urgencyConfig.color, urgencyConfig.bgColor)}
              >
                {urgencyConfig.label}
              </Badge>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{elapsedTime}</span>
            </div>
          </div>
        </div>

        {/* Customer name if available */}
        {item.customer_name && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <User className="w-3 h-3" />
            <span>{item.customer_name}</span>
          </div>
        )}

        {/* Stage-specific pizza details */}
        <StageSpecificDetails item={item} stage={currentStage} compact={compact} />

        {/* Current stage badge */}
        <Badge 
          variant="outline"
          className={cn(stageConfig.color, stageConfig.bgColor, 'font-medium')}
        >
          {PIZZA_KDS_V2_STAGE_LABELS[currentStage]}
        </Badge>

        {/* Action buttons */}
        {canInteract && (
          <div className="flex gap-2 pt-2">
            {!isOwned ? (
              <Button 
                onClick={() => onStart?.(item.id)}
                className="flex-1"
                size={compact ? 'sm' : 'default'}
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar Etapa
              </Button>
            ) : isOwner ? (
              <>
                <Button 
                  onClick={() => onComplete?.(item.id)}
                  className="flex-1"
                  size={compact ? 'sm' : 'default'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finalizar Etapa
                </Button>
                <Button 
                  onClick={() => onRelease?.(item.id)}
                  variant="outline"
                  size={compact ? 'sm' : 'default'}
                >
                  Liberar
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Em produção por outro operador
              </p>
            )}
          </div>
        )}

        {/* Read-only indicator for owned items */}
        {isReadOnly && isOwned && (
          <p className="text-xs text-muted-foreground italic">
            Em produção
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Renders ONLY the data relevant to the current stage.
 */
function StageSpecificDetails({ 
  item, 
  stage, 
  compact 
}: { 
  item: PizzaKdsV2OrderItem; 
  stage: PizzaKdsV2Stage; 
  compact?: boolean;
}) {
  switch (stage) {
    case 'massa_borda':
      return <MassaBordaDetails item={item} compact={compact} />;
    case 'recheio':
      return <RecheioDetails item={item} compact={compact} />;
    case 'forno':
      return <FornoDetails item={item} compact={compact} />;
    case 'finalizacao':
      return <FinalizacaoDetails item={item} compact={compact} />;
    default:
      return null;
  }
}

/** Step 1 – Massa + Borda: Show dough type, border type and border flavor */
function MassaBordaDetails({ item, compact }: { item: PizzaKdsV2OrderItem; compact?: boolean }) {
  return (
    <div className={cn('space-y-1', compact && 'text-sm')}>
      {/* Dough */}
      <div className="flex items-center gap-2">
        <span className="text-lg">🫓</span>
        <div>
          <p className="text-xs text-muted-foreground">Massa</p>
          <p className="font-bold">{item.pizza_dough || 'Tradicional'}</p>
        </div>
      </div>

      {/* Border */}
      <div className="flex items-center gap-2">
        <span className="text-lg">🔘</span>
        <div>
          <p className="text-xs text-muted-foreground">Borda</p>
          <p className="font-bold">
            {item.pizza_border || 'Sem borda'}
          </p>
        </div>
      </div>

      {/* Size for reference */}
      {item.pizza_size && (
        <Badge variant="secondary" className="text-xs">
          Tamanho: {item.pizza_size}
        </Badge>
      )}
    </div>
  );
}

/** Step 2 – Recheio: Show selected flavors and per-flavor observations */
function RecheioDetails({ item, compact }: { item: PizzaKdsV2OrderItem; compact?: boolean }) {
  return (
    <div className={cn('space-y-1', compact && 'text-sm')}>
      {/* Flavors */}
      {item.pizza_flavors && item.pizza_flavors.length > 0 ? (
        <div>
          <p className="text-xs text-muted-foreground mb-1">🍕 Sabores:</p>
          <div className="space-y-1">
            {item.pizza_flavors.map((flavor, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">
                  {item.pizza_flavors.length > 1 
                    ? `1/${item.pizza_flavors.length} ${flavor}` 
                    : flavor}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Nenhum sabor definido</p>
      )}

      {/* Size for reference */}
      {item.pizza_size && (
        <Badge variant="secondary" className="text-xs">
          Tamanho: {item.pizza_size}
        </Badge>
      )}
    </div>
  );
}

/** Step 3 – Forno: Show item reference only */
function FornoDetails({ item, compact }: { item: PizzaKdsV2OrderItem; compact?: boolean }) {
  return (
    <div className={cn('space-y-1', compact && 'text-sm')}>
      <div className="flex items-center gap-2">
        <span className="text-lg">🔥</span>
        <div>
          <p className="text-xs text-muted-foreground">Referência</p>
          <p className="font-bold">
            {item.pizza_size || 'Pizza'} 
            {item.pizza_flavors && item.pizza_flavors.length > 0 
              ? ` — ${item.pizza_flavors.join(', ')}`
              : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Step 4 – Finalização: Show optionals and general observations */
function FinalizacaoDetails({ item, compact }: { item: PizzaKdsV2OrderItem; compact?: boolean }) {
  // Note: optionals and observations need to come from linked order_items
  // For now we show what's available in the pizza_kds_v2_order_items record
  return (
    <div className={cn('space-y-1', compact && 'text-sm')}>
      {/* Quick reference */}
      <div className="flex flex-wrap gap-1 mb-1">
        {item.pizza_size && (
          <Badge variant="secondary" className="text-xs">
            {item.pizza_size}
          </Badge>
        )}
        {item.pizza_flavors && item.pizza_flavors.map((f, idx) => (
          <Badge key={idx} variant="outline" className="text-xs">
            {f}
          </Badge>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-lg">✨</span>
        <p className="text-xs text-muted-foreground">
          Finalização — conferir itens adicionais e embalagem
        </p>
      </div>
    </div>
  );
}
