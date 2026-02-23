import { useEffect, useRef, useCallback } from 'react';
import { usePanicButton } from '@/hooks/usePanicButton';
import { toast } from 'sonner';

/**
 * Hook global que escuta 5x tecla Espaço em qualquer tela do sistema
 * para acionar o botão de pânico. Funciona mesmo fora do PDV.
 */
export function useGlobalPanicShortcut() {
  const { triggerPanic, isEnabled, isTriggering } = usePanicButton();
  const spaceCountRef = useRef(0);
  const spaceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  const handlePanic = useCallback(async () => {
    if (isProcessingRef.current || isTriggering) return;
    
    if (!isEnabled) {
      toast.warning('Botão de pânico não está configurado', {
        description: 'Configure em Configurações → Botão de Pânico',
      });
      return;
    }

    isProcessingRef.current = true;
    toast.loading('Acionando pânico...', { id: 'panic-trigger' });

    try {
      const result = await triggerPanic();
      
      if (result.success) {
        toast.success('Pânico acionado!', {
          id: 'panic-trigger',
          description: 'Mensagens enviadas com sucesso.',
        });
      } else {
        toast.error('Erro ao acionar pânico', {
          id: 'panic-trigger',
          description: result.errors.join(', '),
        });
      }
    } catch (err) {
      toast.error('Erro ao acionar pânico', { id: 'panic-trigger' });
    } finally {
      isProcessingRef.current = false;
    }
  }, [triggerPanic, isEnabled, isTriggering]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if user is typing in an input/textarea (but allow in contenteditable=false areas)
    const target = e.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.isContentEditable;
    
    // Don't trigger panic while typing
    if (isTyping) return;

    // Handle space bar
    if (e.key === ' ' || e.code === 'Space') {
      // Don't prevent default for normal space usage (scrolling, etc)
      // Only track for panic
      spaceCountRef.current += 1;
      
      // Clear previous timer
      if (spaceTimerRef.current) {
        clearTimeout(spaceTimerRef.current);
      }
      
      // Check if 5 presses within time window
      if (spaceCountRef.current >= 5) {
        e.preventDefault(); // Prevent scroll only when triggering panic
        spaceCountRef.current = 0;
        handlePanic();
      } else {
        // Reset counter after 2 seconds of no presses
        spaceTimerRef.current = setTimeout(() => {
          spaceCountRef.current = 0;
        }, 2000);
      }
      return;
    }

    // Reset space counter for other keys
    spaceCountRef.current = 0;
  }, [handlePanic]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (spaceTimerRef.current) {
        clearTimeout(spaceTimerRef.current);
      }
    };
  }, [handleKeyDown]);
}
