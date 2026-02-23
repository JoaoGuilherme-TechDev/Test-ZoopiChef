import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pause, Play, AlertTriangle, Wifi } from 'lucide-react';
import { UnavailableDialog } from './UnavailableDialog';

interface DelivererStatusBarProps {
  isAvailable: boolean;
  unavailabilityReason?: string | null;
  onSetUnavailable: (reason: string) => Promise<void>;
  onSetAvailable: () => Promise<void>;
  onPanic: () => Promise<void>;
  isPending?: boolean;
  hasPanicEnabled?: boolean;
}

export function DelivererStatusBar({
  isAvailable,
  unavailabilityReason,
  onSetUnavailable,
  onSetAvailable,
  onPanic,
  isPending = false,
  hasPanicEnabled = false,
}: DelivererStatusBarProps) {
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false);
  const [isPanicTriggering, setIsPanicTriggering] = useState(false);

  const handleSetUnavailable = async (reason: string) => {
    await onSetUnavailable(reason);
    setShowUnavailableDialog(false);
  };

  const handlePanic = async () => {
    if (isPanicTriggering) return;
    setIsPanicTriggering(true);
    try {
      await onPanic();
    } finally {
      setIsPanicTriggering(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 p-2 bg-card/80 backdrop-blur border-b">
        {/* Status indicator */}
        <Badge
          variant={isAvailable ? 'default' : 'destructive'}
          className={`${isAvailable ? 'bg-green-500' : 'bg-orange-500'} text-white`}
        >
          {isAvailable ? (
            <>
              <Wifi className="w-3 h-3 mr-1" />
              Disponível
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 mr-1" />
              Indisponível
            </>
          )}
        </Badge>

        {/* Reason if unavailable */}
        {!isAvailable && unavailabilityReason && (
          <span className="text-xs text-muted-foreground truncate flex-1">
            {unavailabilityReason}
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Toggle availability button */}
          {isAvailable ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowUnavailableDialog(true)}
              disabled={isPending}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              <Pause className="w-4 h-4 mr-1" />
              Pausar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="default"
              onClick={onSetAvailable}
              disabled={isPending}
              className="bg-green-500 hover:bg-green-600"
            >
              <Play className="w-4 h-4 mr-1" />
              Voltar
            </Button>
          )}

          {/* Panic button */}
          {hasPanicEnabled && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handlePanic}
              disabled={isPanicTriggering}
              className="bg-red-600 hover:bg-red-700"
            >
              <AlertTriangle className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <UnavailableDialog
        open={showUnavailableDialog}
        onOpenChange={setShowUnavailableDialog}
        onConfirm={handleSetUnavailable}
        isPending={isPending}
      />
    </>
  );
}
