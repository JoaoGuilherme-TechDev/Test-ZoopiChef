import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OrderReadyCall } from '@/hooks/useOrderReadyCalls';

interface OrderReadyOverlayProps {
  call: OrderReadyCall;
  durationSeconds?: number; // 0 = infinite until dismissed
  onDismiss?: () => void;
}

export function OrderReadyOverlay({ 
  call, 
  durationSeconds = 5,
  onDismiss 
}: OrderReadyOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Handle manual dismiss
  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setVisible(false);
    // Wait for fade out animation before calling onDismiss
    setTimeout(() => {
      onDismiss?.();
    }, 500);
  }, [onDismiss]);

  useEffect(() => {
    // Fade in
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss after duration (if not infinite)
  useEffect(() => {
    if (dismissed || durationSeconds === 0) return;
    
    const timer = setTimeout(() => {
      handleDismiss();
    }, durationSeconds * 1000);
    
    return () => clearTimeout(timer);
  }, [durationSeconds, dismissed, handleDismiss]);

  // If dismissed, don't render
  if (dismissed && !visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Dismiss button (always visible for infinite, or as backup) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-white/60 hover:text-white hover:bg-white/10 z-10"
        aria-label="Fechar"
      >
        <X className="h-8 w-8" />
      </Button>

      <div className="text-center px-8 animate-in zoom-in-95 duration-500">
        {/* Nome do cliente (se existir) */}
        {call.customer_name && (
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold text-white mb-8 tracking-wide uppercase">
            {call.customer_name}
          </h1>
        )}

        {/* Número do pedido */}
        <div className="mb-8">
          <span className="text-3xl md:text-4xl lg:text-5xl text-gray-300 font-medium">
            Pedido
          </span>
          <span className="text-6xl md:text-8xl lg:text-9xl font-bold text-primary ml-4">
            #{call.order_number}
          </span>
        </div>

        {/* Mensagem principal */}
        <p className="text-4xl md:text-5xl lg:text-6xl font-semibold text-green-400 animate-pulse">
          SEU PEDIDO ESTÁ PRONTO!
        </p>

        {/* Barra de progresso (only show if not infinite) */}
        {durationSeconds > 0 && (
          <div className="mt-12 w-full max-w-md mx-auto">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full ease-linear"
                style={{ 
                  width: '100%',
                  animation: `shrink ${durationSeconds}s linear forwards`
                }}
              />
            </div>
          </div>
        )}

        {/* Hint for infinite mode */}
        {durationSeconds === 0 && (
          <p className="mt-12 text-white/40 text-lg">
            Clique no X para fechar
          </p>
        )}
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
