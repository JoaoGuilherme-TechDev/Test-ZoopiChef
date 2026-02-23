import { useMemo, useState, useEffect } from 'react';
import { Clock, Timer, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDurationFromMinutes } from '@/lib/timeFormat';

export interface OrderTimestamps {
  created_at: string;
  accepted_at?: string | null;
  ready_at?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
}

export type OrderStage = 'aceite' | 'preparo' | 'expedicao' | 'entrega';

export interface StageTime {
  stage: OrderStage;
  label: string;
  startedAt: Date | null;
  endedAt: Date | null;
  durationMinutes: number | null;
  isActive: boolean;
  isCompleted: boolean;
}

export interface TimerAlertLevel {
  level: 'ok' | 'warn' | 'danger';
  shouldBlink: boolean;
}

interface OrderStageTimersProps {
  order: OrderTimestamps & { status: string };
  warnAfterMinutes?: number;
  dangerAfterMinutes?: number;
  compact?: boolean;
  showAll?: boolean;
}

// Re-export the formatDuration for backwards compatibility
export const formatDuration = formatDurationFromMinutes;

function calculateStageTimes(order: OrderTimestamps & { status: string }): StageTime[] {
  const now = new Date();
  const createdAt = new Date(order.created_at);
  const acceptedAt = order.accepted_at ? new Date(order.accepted_at) : null;
  const readyAt = order.ready_at ? new Date(order.ready_at) : null;
  const dispatchedAt = order.dispatched_at ? new Date(order.dispatched_at) : null;
  const deliveredAt = order.delivered_at ? new Date(order.delivered_at) : null;

  const stages: StageTime[] = [];

  // 1. Tempo de Aceite: created_at → accepted_at
  const aceiteStart = createdAt;
  const aceiteEnd = acceptedAt;
  const aceiteActive = !acceptedAt && order.status === 'novo';
  const aceiteDuration = aceiteEnd
    ? (aceiteEnd.getTime() - aceiteStart.getTime()) / (1000 * 60)
    : aceiteActive
      ? (now.getTime() - aceiteStart.getTime()) / (1000 * 60)
      : null;

  stages.push({
    stage: 'aceite',
    label: 'Aceite',
    startedAt: aceiteStart,
    endedAt: aceiteEnd,
    durationMinutes: aceiteDuration,
    isActive: aceiteActive,
    isCompleted: !!aceiteEnd,
  });

  // 2. Tempo de Preparo: accepted_at → ready_at
  const preparoStart = acceptedAt;
  const preparoEnd = readyAt;
  const preparoActive = !!acceptedAt && !readyAt && order.status === 'preparo';
  const preparoDuration = preparoStart
    ? preparoEnd
      ? (preparoEnd.getTime() - preparoStart.getTime()) / (1000 * 60)
      : preparoActive
        ? (now.getTime() - preparoStart.getTime()) / (1000 * 60)
        : null
    : null;

  stages.push({
    stage: 'preparo',
    label: 'Preparo',
    startedAt: preparoStart,
    endedAt: preparoEnd,
    durationMinutes: preparoDuration,
    isActive: preparoActive,
    isCompleted: !!preparoEnd,
  });

  // 3. Tempo de Expedição: ready_at → dispatched_at
  const expedicaoStart = readyAt;
  const expedicaoEnd = dispatchedAt;
  const expedicaoActive = !!readyAt && !dispatchedAt && order.status === 'pronto';
  const expedicaoDuration = expedicaoStart
    ? expedicaoEnd
      ? (expedicaoEnd.getTime() - expedicaoStart.getTime()) / (1000 * 60)
      : expedicaoActive
        ? (now.getTime() - expedicaoStart.getTime()) / (1000 * 60)
        : null
    : null;

  stages.push({
    stage: 'expedicao',
    label: 'Expedição',
    startedAt: expedicaoStart,
    endedAt: expedicaoEnd,
    durationMinutes: expedicaoDuration,
    isActive: expedicaoActive,
    isCompleted: !!expedicaoEnd,
  });

  // 4. Tempo de Entrega: dispatched_at → delivered_at
  const entregaStart = dispatchedAt;
  const entregaEnd = deliveredAt;
  const entregaActive = !!dispatchedAt && !deliveredAt && order.status === 'em_rota';
  const entregaDuration = entregaStart
    ? entregaEnd
      ? (entregaEnd.getTime() - entregaStart.getTime()) / (1000 * 60)
      : entregaActive
        ? (now.getTime() - entregaStart.getTime()) / (1000 * 60)
        : null
    : null;

  stages.push({
    stage: 'entrega',
    label: 'Entrega',
    startedAt: entregaStart,
    endedAt: entregaEnd,
    durationMinutes: entregaDuration,
    isActive: entregaActive,
    isCompleted: !!entregaEnd,
  });

  return stages;
}

function calculateTotalTime(order: OrderTimestamps & { status: string }): number {
  const now = new Date();
  const createdAt = new Date(order.created_at);
  const deliveredAt = order.delivered_at ? new Date(order.delivered_at) : null;

  const endTime = deliveredAt || now;
  return (endTime.getTime() - createdAt.getTime()) / (1000 * 60);
}

export function getAlertLevel(
  minutes: number | null,
  warnAfterMinutes: number,
  dangerAfterMinutes: number
): TimerAlertLevel {
  if (minutes === null) return { level: 'ok', shouldBlink: false };
  if (minutes >= dangerAfterMinutes) return { level: 'danger', shouldBlink: true };
  if (minutes >= warnAfterMinutes) return { level: 'warn', shouldBlink: true };
  return { level: 'ok', shouldBlink: false };
}

export function getCurrentStageTime(order: OrderTimestamps & { status: string }): number | null {
  const stages = calculateStageTimes(order);
  const activeStage = stages.find(s => s.isActive);
  return activeStage?.durationMinutes ?? null;
}

export function getCurrentStageName(status: string): OrderStage | null {
  switch (status) {
    case 'novo':
      return 'aceite';
    case 'preparo':
      return 'preparo';
    case 'pronto':
      return 'expedicao';
    case 'em_rota':
      return 'entrega';
    default:
      return null;
  }
}

export function OrderStageTimers({
  order,
  warnAfterMinutes = 10,
  dangerAfterMinutes = 20,
  compact = false,
  showAll = false,
}: OrderStageTimersProps) {
  const [now, setNow] = useState(new Date());

  // Update every 15 seconds for live timers
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(interval);
  }, []);

  const stages = useMemo(
    () => calculateStageTimes(order),
    [order.created_at, order.accepted_at, order.ready_at, order.dispatched_at, order.delivered_at, order.status, now]
  );

  const totalMinutes = useMemo(
    () => calculateTotalTime(order),
    [order.created_at, order.delivered_at, now]
  );

  const activeStage = stages.find(s => s.isActive);
  const currentStageAlert = activeStage
    ? getAlertLevel(activeStage.durationMinutes, warnAfterMinutes, dangerAfterMinutes)
    : { level: 'ok' as const, shouldBlink: false };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="font-medium">{formatDuration(totalMinutes)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Tempo total do pedido</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {activeStage && (
          <Badge
            variant="outline"
            className={cn(
              'text-xs px-1.5 py-0.5',
              currentStageAlert.level === 'danger' && 'border-red-500 text-red-400 bg-red-500/20',
              currentStageAlert.level === 'warn' && 'border-yellow-500 text-yellow-400 bg-yellow-500/20',
              currentStageAlert.level === 'ok' && 'border-slate-600 text-slate-400'
            )}
          >
            <Timer className="w-2.5 h-2.5 mr-1" />
            {activeStage.label}: {formatDuration(activeStage.durationMinutes)}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Total Time */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="w-4 h-4" />
          Tempo Total
        </span>
        <span className="font-bold text-white">{formatDuration(totalMinutes)}</span>
      </div>

      {/* Stage Timeline */}
      <div className="flex gap-1">
        {stages.map((stage, i) => {
          const alert = stage.isActive
            ? getAlertLevel(stage.durationMinutes, warnAfterMinutes, dangerAfterMinutes)
            : { level: 'ok' as const, shouldBlink: false };

          return (
            <TooltipProvider key={stage.stage}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'flex-1 h-2 rounded-full transition-all',
                      stage.isCompleted && 'bg-green-500',
                      stage.isActive && alert.level === 'ok' && 'bg-blue-500',
                      stage.isActive && alert.level === 'warn' && 'bg-yellow-500 animate-pulse',
                      stage.isActive && alert.level === 'danger' && 'bg-red-500 animate-pulse',
                      !stage.isCompleted && !stage.isActive && 'bg-slate-700'
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-xs">
                    <p className="font-medium">{stage.label}</p>
                    <p>
                      {stage.isCompleted && <Check className="w-3 h-3 inline mr-1" />}
                      {stage.isActive && <Timer className="w-3 h-3 inline mr-1 animate-pulse" />}
                      {formatDuration(stage.durationMinutes)}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {/* Active Stage Info */}
      {activeStage && (
        <div
          className={cn(
            'flex items-center justify-between px-2 py-1 rounded text-xs',
            currentStageAlert.level === 'danger' && 'bg-red-500/20 text-red-300',
            currentStageAlert.level === 'warn' && 'bg-yellow-500/20 text-yellow-300',
            currentStageAlert.level === 'ok' && 'bg-blue-500/20 text-blue-300'
          )}
        >
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3" />
            {activeStage.label}
          </span>
          <span className="font-bold">{formatDuration(activeStage.durationMinutes)}</span>
        </div>
      )}

      {/* Completed Stages Summary */}
      {showAll && (
        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
          {stages
            .filter(s => s.isCompleted)
            .map(s => (
              <span key={s.stage} className="flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5 text-green-500" />
                {s.label} {formatDuration(s.durationMinutes)}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

// Hook for external use
export function useOrderStageTimers(order: OrderTimestamps & { status: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => ({
    stages: calculateStageTimes(order),
    totalMinutes: calculateTotalTime(order),
    currentStage: getCurrentStageName(order.status),
    currentStageTime: getCurrentStageTime(order),
  }), [order, now]);
}
