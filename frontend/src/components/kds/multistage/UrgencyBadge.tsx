import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowDown, ArrowUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UrgencyLevel } from '@/hooks/useMultiStageKDS';
import { urgencyConfig } from '@/hooks/useMultiStageKDS';

interface UrgencyBadgeProps {
  urgency: UrgencyLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const urgencyIcons: Record<UrgencyLevel, React.ReactNode> = {
  low: <ArrowDown className="w-3 h-3" />,
  normal: null,
  high: <ArrowUp className="w-3 h-3" />,
  critical: <Zap className="w-3 h-3" />,
};

export function UrgencyBadge({ urgency, showLabel = true, size = 'md' }: UrgencyBadgeProps) {
  const config = urgencyConfig[urgency];
  
  if (urgency === 'normal' && !showLabel) return null;

  return (
    <Badge 
      className={cn(
        config.bgColor,
        "text-white font-semibold",
        urgency === 'critical' && "animate-pulse",
        size === 'sm' && "text-xs px-1.5 py-0",
        size === 'md' && "text-xs px-2 py-0.5",
        size === 'lg' && "text-sm px-3 py-1"
      )}
    >
      {urgencyIcons[urgency]}
      {showLabel && <span className="ml-1">{config.label}</span>}
    </Badge>
  );
}
