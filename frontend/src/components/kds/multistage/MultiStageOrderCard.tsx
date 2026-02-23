import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Play, Check, Lock, Clock, User } from 'lucide-react';
import { StageProgressBar } from './StageProgressBar';
import { UrgencyBadge } from './UrgencyBadge';
import { UrgencySelector } from './UrgencySelector';
import type { OrderWithStages, KDSStageDefinition, UrgencyLevel } from '@/hooks/useMultiStageKDS';

interface MultiStageOrderCardProps {
  order: OrderWithStages;
  stageDefinitions: KDSStageDefinition[];
  userStageKeys: string[];
  onAdvanceStage: (orderId: string, stageKey: string) => void;
  onUrgencyChange: (orderId: string, urgency: UrgencyLevel) => void;
  isAdvancing?: boolean;
  isAdmin?: boolean;
}

export function MultiStageOrderCard({
  order,
  stageDefinitions,
  userStageKeys,
  onAdvanceStage,
  onUrgencyChange,
  isAdvancing = false,
  isAdmin = false,
}: MultiStageOrderCardProps) {
  const [showUrgencySelector, setShowUrgencySelector] = useState(false);
  
  const currentStage = order.current_stage;
  const currentStageDef = currentStage 
    ? stageDefinitions.find(d => d.stage_key === currentStage.stage_key)
    : null;

  // Check if user can interact with this order
  const canInteract = userStageKeys.length === 0 || 
    (currentStage && userStageKeys.includes(currentStage.stage_key));
  
  const isWaitingForUser = currentStage?.status === 'pending' && canInteract;
  const isInProgress = currentStage?.status === 'in_progress';
  const isUserWorking = isInProgress && canInteract;

  // Card styling based on state
  const getCardStyle = () => {
    if (order.urgency === 'critical') return 'border-red-500 ring-2 ring-red-500/50';
    if (order.urgency === 'high') return 'border-orange-500';
    if (isUserWorking) return 'border-orange-400 ring-1 ring-orange-400/50';
    if (isWaitingForUser) return 'border-yellow-400';
    if (!canInteract) return 'border-slate-600 opacity-70';
    return 'border-slate-600';
  };

  const handleActionClick = () => {
    if (!currentStage || !canInteract) return;
    onAdvanceStage(order.id, currentStage.stage_key);
  };

  const getActionButton = () => {
    if (!currentStage) return null;
    
    if (!canInteract) {
      return (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Lock className="w-4 h-4" />
          <span>Aguardando {currentStageDef?.stage_name || currentStage.stage_key}</span>
        </div>
      );
    }

    if (currentStage.status === 'pending') {
      return (
        <Button
          onClick={handleActionClick}
          disabled={isAdvancing}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold gap-2"
        >
          <Play className="w-4 h-4" />
          Iniciar {currentStageDef?.stage_name}
        </Button>
      );
    }

    if (currentStage.status === 'in_progress') {
      return (
        <Button
          onClick={handleActionClick}
          disabled={isAdvancing}
          className="bg-green-500 hover:bg-green-600 text-white font-bold gap-2"
        >
          <Check className="w-4 h-4" />
          Concluir {currentStageDef?.stage_name}
        </Button>
      );
    }

    return null;
  };

  // Calculate time in current stage
  const getStageTime = () => {
    if (!currentStage?.started_at) return null;
    const elapsed = Date.now() - new Date(currentStage.started_at).getTime();
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={cn("transition-all", getCardStyle())}>
      <CardHeader className="py-3 px-4 border-b border-border/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg">
              #{order.order_number ? String(order.order_number).padStart(3, '0') : order.id.slice(-4).toUpperCase()}
            </span>
            <UrgencyBadge urgency={order.urgency} showLabel={order.urgency !== 'normal'} />
          </div>
          
          <div className="flex items-center gap-2">
            {isInProgress && (
              <Badge className="bg-orange-500/30 text-orange-300 gap-1">
                <Clock className="w-3 h-3" />
                {getStageTime()}
              </Badge>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUrgencySelector(!showUrgencySelector)}
                className="text-muted-foreground hover:text-foreground"
              >
                ⚡
              </Button>
            )}
          </div>
        </div>

        {/* Urgency selector dropdown for admins */}
        {showUrgencySelector && isAdmin && (
          <div className="mt-2">
            <UrgencySelector
              currentUrgency={order.urgency}
              onSelect={(urgency) => {
                onUrgencyChange(order.id, urgency);
                setShowUrgencySelector(false);
              }}
            />
          </div>
        )}

        {/* Customer name */}
        {order.customer_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <User className="w-3 h-3" />
            <span>{order.customer_name}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="py-3 px-4 space-y-3">
        {/* Stage progress bar */}
        <StageProgressBar
          stages={order.stages}
          stageDefinitions={stageDefinitions}
          compact={true}
        />

        {/* Current stage indicator */}
        {currentStage && currentStageDef && (
          <div 
            className="flex items-center gap-2 py-2 px-3 rounded-lg"
            style={{ backgroundColor: `${currentStageDef.color}20`, borderLeft: `3px solid ${currentStageDef.color}` }}
          >
            <span className="text-sm font-medium" style={{ color: currentStageDef.color }}>
              Etapa atual:
            </span>
            <span className="font-bold">{currentStageDef.stage_name}</span>
          </div>
        )}

        {/* Action button */}
        <div className="flex justify-end">
          {getActionButton()}
        </div>
      </CardContent>
    </Card>
  );
}
