/**
 * KioskAssistant - Virtual AI Assistant for the kiosk
 * 
 * Floating avatar that provides contextual help and suggestions
 * during the ordering process.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Sparkles, Gift, Heart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AssistantMessage {
  id: string;
  text: string;
  type: 'greeting' | 'suggestion' | 'discount' | 'tip' | 'celebration';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AvailableDiscount {
  type: 'percentage' | 'fixed_value' | 'free_item';
  value: number;
  prizeName: string;
  rewardId: string;
}

interface KioskAssistantProps {
  message: AssistantMessage | string | null;
  isExpanded?: boolean;
  onDismiss?: () => void;
  position?: 'bottom-left' | 'bottom-right' | 'top-right';
  customerName?: string;
  hasDiscount?: boolean;
  showDiscount?: boolean;
  discount?: AvailableDiscount | null;
  isVIP?: boolean;
  className?: string;
}

export function KioskAssistant({
  message,
  isExpanded = false,
  onDismiss,
  position = 'bottom-right',
  customerName,
  hasDiscount = false,
  showDiscount = false,
  discount,
  isVIP = false,
  className,
}: KioskAssistantProps) {
  const [showBubble, setShowBubble] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Normalize message to AssistantMessage
  const normalizedMessage: AssistantMessage | null = message 
    ? typeof message === 'string' 
      ? { id: 'auto', text: message, type: showDiscount ? 'discount' : 'suggestion' }
      : message
    : null;

  // Determine if we should show discount styling
  const effectiveHasDiscount = hasDiscount || showDiscount || !!discount;

  // Show bubble when message changes
  useEffect(() => {
    if (normalizedMessage) {
      setShowBubble(true);
      setIsMinimized(false);
    }
  }, [normalizedMessage?.id, normalizedMessage?.text]);

  // Auto-hide bubble after 10 seconds
  useEffect(() => {
    if (showBubble && normalizedMessage) {
      const timer = setTimeout(() => {
        setShowBubble(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showBubble, normalizedMessage?.id, normalizedMessage?.text]);

  const positionClasses = {
    'bottom-left': 'bottom-24 left-6',
    'bottom-right': 'bottom-24 right-6',
    'top-right': 'top-24 right-6',
  };

  const getIcon = (type: AssistantMessage['type']) => {
    switch (type) {
      case 'discount':
        return <Gift className="w-5 h-5" />;
      case 'celebration':
        return <Sparkles className="w-5 h-5" />;
      case 'suggestion':
        return <Heart className="w-5 h-5" />;
      default:
        return <MessageCircle className="w-5 h-5" />;
    }
  };

  const getAccentColor = (type: AssistantMessage['type']) => {
    switch (type) {
      case 'discount':
        return 'from-green-500 to-emerald-600';
      case 'celebration':
        return 'from-yellow-500 to-orange-500';
      case 'suggestion':
        return 'from-pink-500 to-rose-500';
      default:
        return 'from-blue-500 to-indigo-600';
    }
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={cn(
          'fixed z-50',
          positionClasses[position],
          className
        )}
      >
        <Button
          size="icon"
          className={cn(
            'w-16 h-16 rounded-full shadow-2xl bg-gradient-to-br',
            effectiveHasDiscount ? 'from-green-500 to-emerald-600' : 'from-orange-500 to-red-500',
            'hover:scale-110 transition-transform'
          )}
          onClick={() => setIsMinimized(false)}
        >
          <Bot className="w-8 h-8 text-white" />
          {effectiveHasDiscount && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
              <Gift className="w-4 h-4 text-yellow-800" />
            </span>
          )}
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'fixed z-50 flex items-end gap-3',
        positionClasses[position],
        className
      )}
    >
      {/* Avatar */}
      <motion.div
        className="relative flex-shrink-0"
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsMinimized(true)}
      >
        <div className={cn(
          'w-16 h-16 rounded-full shadow-2xl bg-gradient-to-br flex items-center justify-center cursor-pointer',
          effectiveHasDiscount ? 'from-green-500 to-emerald-600' : 'from-orange-500 to-red-500'
        )}>
          <Bot className="w-8 h-8 text-white" />
        </div>
        
        {/* Pulse animation */}
        <motion.div
          className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-br',
            effectiveHasDiscount ? 'from-green-500 to-emerald-600' : 'from-orange-500 to-red-500'
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        {/* Discount badge */}
        {effectiveHasDiscount && (
          <motion.span 
            className="absolute -top-1 -right-1 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Gift className="w-4 h-4 text-yellow-800" />
          </motion.span>
        )}
      </motion.div>

      {/* Message bubble */}
      <AnimatePresence>
        {showBubble && normalizedMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20 }}
            className={cn(
              'relative bg-gray-800 rounded-2xl p-4 shadow-2xl max-w-xs border border-gray-700'
            )}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setShowBubble(false);
                onDismiss?.();
              }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
            >
              <X className="w-4 h-4 text-gray-300" />
            </button>

            {/* Message header */}
            <div className="flex items-center gap-2 mb-2">
              <div className={cn(
                'w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center',
                getAccentColor(normalizedMessage.type)
              )}>
                {getIcon(normalizedMessage.type)}
              </div>
              <span className="text-sm font-medium text-gray-300">
                {normalizedMessage.type === 'greeting' ? 'Olá!' : 
                 normalizedMessage.type === 'discount' ? 'Oferta!' :
                 normalizedMessage.type === 'celebration' ? 'Parabéns!' :
                 'Sugestão'}
              </span>
            </div>

            {/* Message text */}
            <p className="text-white text-base leading-relaxed">
              {normalizedMessage.text}
            </p>

            {/* Action button */}
            {normalizedMessage.action && (
              <Button
                size="sm"
                className={cn(
                  'mt-3 w-full bg-gradient-to-r text-white',
                  getAccentColor(normalizedMessage.type)
                )}
                onClick={normalizedMessage.action.onClick}
              >
                {normalizedMessage.action.label}
              </Button>
            )}

            {/* Triangle pointer */}
            <div className="absolute left-0 bottom-4 -ml-2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-gray-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Mini floating indicator when assistant is hidden
 */
export function KioskAssistantMiniBadge({
  hasMessage,
  hasDiscount,
  onClick,
  className,
}: {
  hasMessage: boolean;
  hasDiscount: boolean;
  onClick: () => void;
  className?: string;
}) {
  if (!hasMessage && !hasDiscount) return null;

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileTap={{ scale: 0.9 }}
      className={cn(
        'fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-xl',
        'bg-gradient-to-br flex items-center justify-center',
        hasDiscount ? 'from-green-500 to-emerald-600' : 'from-orange-500 to-red-500',
        className
      )}
      onClick={onClick}
    >
      <Bot className="w-7 h-7 text-white" />
      {(hasMessage || hasDiscount) && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
          <Sparkles className="w-3 h-3 text-yellow-800" />
        </span>
      )}
    </motion.button>
  );
}
