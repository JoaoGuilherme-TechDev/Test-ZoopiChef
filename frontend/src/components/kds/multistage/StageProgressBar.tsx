import { cn } from '@/lib/utils';
import { Check, Clock, Play, Loader2 } from 'lucide-react';
import type { OrderStageProgress, StageStatus, KDSStageDefinition } from '@/hooks/useMultiStageKDS';

interface StageProgressBarProps {
  stages: OrderStageProgress[];
  stageDefinitions: KDSStageDefinition[];
  compact?: boolean;
}

const statusIcons: Record<StageStatus, React.ReactNode> = {
  waiting: <Clock className="w-3 h-3 text-slate-400" />,
  pending: <Clock className="w-3 h-3 text-yellow-400" />,
  in_progress: <Loader2 className="w-3 h-3 text-orange-400 animate-spin" />,
  done: <Check className="w-3 h-3 text-green-400" />,
  skipped: <span className="w-3 h-3 text-slate-500">–</span>,
};

export function StageProgressBar({ stages, stageDefinitions, compact = false }: StageProgressBarProps) {
  if (!stages.length) return null;

  const sortedStages = [...stages].sort((a, b) => a.stage_order - b.stage_order);

  return (
    <div className={cn("flex items-center gap-1", compact ? "text-xs" : "text-sm")}>
      {sortedStages.map((stage, index) => {
        const definition = stageDefinitions.find(d => d.stage_key === stage.stage_key);
        const isActive = stage.status === 'pending' || stage.status === 'in_progress';
        const isDone = stage.status === 'done';

        return (
          <div key={stage.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full transition-all",
                isActive && "bg-orange-500/30 ring-1 ring-orange-400",
                isDone && "bg-green-500/20",
                !isActive && !isDone && "bg-slate-700/50"
              )}
              style={isActive && definition?.color ? { borderColor: definition.color } : undefined}
            >
              {statusIcons[stage.status]}
              {!compact && (
                <span className={cn(
                  "font-medium",
                  isActive && "text-orange-300",
                  isDone && "text-green-300",
                  !isActive && !isDone && "text-slate-400"
                )}>
                  {definition?.stage_name || stage.stage_key}
                </span>
              )}
            </div>
            {index < sortedStages.length - 1 && (
              <div className={cn(
                "w-3 h-0.5 mx-0.5",
                isDone ? "bg-green-500" : "bg-slate-600"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
