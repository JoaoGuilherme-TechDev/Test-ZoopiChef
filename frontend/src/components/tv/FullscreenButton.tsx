import { useState, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FullscreenButtonProps {
  className?: string;
  autoHide?: boolean;
  autoHideDelay?: number;
  showLabel?: boolean;
}

export function FullscreenButton({ 
  className,
  autoHide = true,
  autoHideDelay = 3000,
  showLabel = true 
}: FullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  // Sync fullscreen state with browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    // Initial state check
    setIsFullscreen(!!document.fullscreenElement);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Auto-hide logic
  const resetHideTimer = useCallback(() => {
    if (!autoHide) return;

    setIsVisible(true);

    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    const timeout = setTimeout(() => {
      setIsVisible(false);
    }, autoHideDelay);

    setHideTimeout(timeout);
  }, [autoHide, autoHideDelay, hideTimeout]);

  // Show button on mouse move or touch
  useEffect(() => {
    if (!autoHide) return;

    const handleActivity = () => {
      resetHideTimer();
    };

    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('touchstart', handleActivity);
    document.addEventListener('keydown', handleActivity);

    // Initial timer
    resetHideTimer();

    return () => {
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('touchstart', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [autoHide, resetHideTimer]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          // Safari support
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).msRequestFullscreen) {
          // IE11 support
          await (elem as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  return (
    <Button
      variant="ghost"
      size="lg"
      onClick={toggleFullscreen}
      className={cn(
        "bg-black/60 hover:bg-black/80 text-white border border-white/20",
        "backdrop-blur-sm transition-all duration-300",
        "px-4 py-3 h-auto rounded-xl",
        "shadow-lg hover:shadow-xl",
        autoHide && !isVisible && "opacity-0 pointer-events-none",
        autoHide && isVisible && "opacity-100",
        className
      )}
      title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
    >
      {isFullscreen ? (
        <>
          <Minimize2 className="w-6 h-6" />
          {showLabel && <span className="ml-2 text-base font-medium">Sair</span>}
        </>
      ) : (
        <>
          <Maximize2 className="w-6 h-6" />
          {showLabel && <span className="ml-2 text-base font-medium">Tela cheia</span>}
        </>
      )}
    </Button>
  );
}
