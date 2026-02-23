import { useEffect, useCallback } from 'react';

export interface PDVShortcuts {
  onSearch?: () => void;           // F2 or Ctrl+F - Open product search
  onFinalize?: () => void;         // F10 or Enter - Finalize sale
  onCancel?: () => void;           // Esc or F3 - Cancel/Close
  onClearCart?: () => void;        // F4 - Clear cart
  onPayment?: () => void;          // F5 - Open payment
  onPrintReceipt?: () => void;     // F6 - Print receipt
  onDiscount?: () => void;         // F7 - Apply discount
  onQuantity?: () => void;         // F8 - Change quantity
  onCodeInput?: () => void;        // F9 - Focus code input
  onNewSale?: () => void;          // F12 - New sale
  onCustomShortcut?: (key: string) => void; // Custom shortcuts
}

export function usePDVKeyboardShortcuts(shortcuts: PDVShortcuts, enabled: boolean = true) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore if user is typing in an input/textarea (unless it's a function key)
    const target = e.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const isFunctionKey = e.key.startsWith('F') && e.key.length <= 3;

    if (isTyping && !isFunctionKey) return;

    switch (e.key) {
      case 'F2':
        e.preventDefault();
        shortcuts.onSearch?.();
        break;

      case 'F3':
        e.preventDefault();
        shortcuts.onCancel?.();
        break;

      case 'F4':
        e.preventDefault();
        shortcuts.onClearCart?.();
        break;

      case 'F5':
        e.preventDefault();
        shortcuts.onPayment?.();
        break;

      case 'F6':
        e.preventDefault();
        shortcuts.onPrintReceipt?.();
        break;

      case 'F7':
        e.preventDefault();
        shortcuts.onDiscount?.();
        break;

      case 'F8':
        e.preventDefault();
        shortcuts.onQuantity?.();
        break;

      case 'F9':
        e.preventDefault();
        shortcuts.onCodeInput?.();
        break;

      case 'F10':
        e.preventDefault();
        shortcuts.onFinalize?.();
        break;

      case 'F12':
        e.preventDefault();
        shortcuts.onNewSale?.();
        break;

      case 'Escape':
        if (!isTyping) {
          e.preventDefault();
          shortcuts.onCancel?.();
        }
        break;

      default:
        // Ctrl+F for search
        if (e.ctrlKey && e.key === 'f') {
          e.preventDefault();
          shortcuts.onSearch?.();
        }
        // Ctrl+Enter for finalize
        if (e.ctrlKey && e.key === 'Enter') {
          e.preventDefault();
          shortcuts.onFinalize?.();
        }
        // Custom handler
        shortcuts.onCustomShortcut?.(e.key);
        break;
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
}

// Componente visual para mostrar atalhos disponíveis
export const SHORTCUT_LABELS: Record<string, string> = {
  'F2': 'Buscar Produto',
  'F3': 'Cancelar',
  'F4': 'Limpar Carrinho',
  'F5': 'Pagamento',
  'F6': 'Imprimir',
  'F7': 'Desconto',
  'F8': 'Quantidade',
  'F9': 'Código',
  'F10': 'Finalizar',
  'F12': 'Nova Venda',
  'Ctrl+F': 'Buscar',
  'Ctrl+Enter': 'Finalizar',
  'Esc': 'Fechar',
};
