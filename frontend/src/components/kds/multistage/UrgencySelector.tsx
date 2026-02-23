import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UrgencyLevel } from '@/hooks/useMultiStageKDS';
import { urgencyConfig } from '@/hooks/useMultiStageKDS';

interface UrgencySelectorProps {
  currentUrgency: UrgencyLevel;
  onSelect: (urgency: UrgencyLevel) => void;
}

const urgencyLevels: UrgencyLevel[] = ['low', 'normal', 'high', 'critical'];

export function UrgencySelector({ currentUrgency, onSelect }: UrgencySelectorProps) {
  return (
    <div className="flex gap-1 p-2 bg-slate-800 rounded-lg">
      {urgencyLevels.map((level) => {
        const config = urgencyConfig[level];
        const isSelected = level === currentUrgency;
        
        return (
          <Button
            key={level}
            variant={isSelected ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onSelect(level)}
            className={cn(
              "flex-1 transition-all",
              isSelected && config.bgColor,
              isSelected && "text-white",
              !isSelected && "text-slate-400 hover:text-white"
            )}
          >
            {config.label}
          </Button>
        );
      })}
    </div>
  );
}
