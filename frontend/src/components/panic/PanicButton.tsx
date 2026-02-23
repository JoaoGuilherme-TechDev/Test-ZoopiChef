import { useState, useRef, useCallback } from 'react';
import { Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePanicButton } from '@/hooks/usePanicButton';

export function PanicButton() {
  const { isEnabled, triggerPanic, isTriggering } = usePanicButton();
  const [isActivating, setIsActivating] = useState(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickRef = useRef<number>(0);

  const handleActivation = useCallback(async () => {
    if (isTriggering) return;
    
    setIsActivating(true);
    
    // Trigger panic silently
    await triggerPanic();
    
    // Brief visual feedback
    setTimeout(() => {
      setIsActivating(false);
    }, 500);
  }, [triggerPanic, isTriggering]);

  // Double-click handler
  const handleClick = useCallback(() => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickRef.current;
    
    if (timeSinceLastClick < 400) {
      // Double click detected
      handleActivation();
    }
    
    lastClickRef.current = now;
  }, [handleActivation]);

  // Long-press handlers (2 seconds)
  const handleMouseDown = useCallback(() => {
    pressTimerRef.current = setTimeout(() => {
      handleActivation();
    }, 2000);
  }, [handleActivation]);

  const handleMouseUp = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  // Don't render if not enabled
  if (!isEnabled) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`text-muted-foreground transition-colors duration-200 ${
        isActivating ? 'text-destructive' : ''
      }`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      disabled={isTriggering}
      title="Status da conexão"
    >
      <Wifi className="w-4 h-4" />
    </Button>
  );
}
