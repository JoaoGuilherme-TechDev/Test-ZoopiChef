import { useKitchenLoad } from '@/hooks/useKitchenLoad';
import { AlertTriangle, Activity, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface KitchenLoadBannerProps {
  compact?: boolean;
}

export function KitchenLoadBanner({ compact = false }: KitchenLoadBannerProps) {
  const { loadState, calculateLoad, isLoading } = useKitchenLoad();

  if (!loadState.dynamic_eta_enabled) {
    return null;
  }

  const getLevelStyles = () => {
    switch (loadState.current_load_level) {
      case 'danger':
        return 'bg-destructive/10 border-destructive/30 text-destructive';
      case 'warn':
        return 'bg-warning/10 border-warning/30 text-warning';
      default:
        return 'bg-success/10 border-success/30 text-success';
    }
  };

  const getLevelLabel = () => {
    switch (loadState.current_load_level) {
      case 'danger':
        return 'CRÍTICO';
      case 'warn':
        return 'ALERTA';
      default:
        return 'NORMAL';
    }
  };

  const getLevelIcon = () => {
    switch (loadState.current_load_level) {
      case 'danger':
      case 'warn':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium',
        getLevelStyles()
      )}>
        {getLevelIcon()}
        <span>{getLevelLabel()}</span>
        {loadState.current_eta_extra_minutes > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            +{loadState.current_eta_extra_minutes}min
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center justify-between gap-4 px-4 py-3 rounded-lg border',
      getLevelStyles()
    )}>
      <div className="flex items-center gap-3">
        {getLevelIcon()}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold">{getLevelLabel()}</span>
            <span className="text-sm opacity-80">
              Capacidade da Cozinha
            </span>
          </div>
          <div className="text-sm opacity-80 flex items-center gap-4">
            <span>
              Carga: {loadState.current_eta_extra_minutes > 0 
                ? `+${loadState.current_eta_extra_minutes} min no ETA`
                : 'Normal'
              }
            </span>
            <span>
              Capacidade: {loadState.kitchen_capacity_units_per_10min} un/10min
            </span>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => calculateLoad.mutate()}
        disabled={calculateLoad.isPending || isLoading}
        className="shrink-0"
      >
        <RefreshCw className={cn(
          'h-4 w-4 mr-1',
          calculateLoad.isPending && 'animate-spin'
        )} />
        Atualizar
      </Button>
    </div>
  );
}
