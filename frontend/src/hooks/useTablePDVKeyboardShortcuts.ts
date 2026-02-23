import { useEffect, useCallback, useRef } from 'react';

export interface TablePDVShortcuts {
  onPrintAndClose?: () => void;     // F - Imprimir ticket completo e fechar conta
  onTransfer?: () => void;           // T - Abrir tela de transferir
  onReopen?: () => void;             // R - Reabrir mesa/Comanda
  onMerge?: () => void;              // J - Juntar Comanda
  onPayment?: () => void;            // P - Pagar mesa/Comanda
  onOpenDrawer?: () => void;         // G - Abrir gaveta
  onLinkCustomer?: () => void;       // C - Vincular Cliente
  onClearAllItems?: () => void;      // X - Excluir todos pedidos (com aviso)
  onDeleteItem?: () => void;         // Del - Deletar um item específico
  onBackToMap?: () => void;          // V - Voltar para mapa
  onPanic?: () => void;              // 5x Espaço - Botão pânico
  onWithdrawal?: () => void;         // S - Sangria
  onCloseCash?: () => void;          // M - Fechar caixa
  onReceiveFiado?: () => void;       // Y - Recebimento de Fiado
  onManagerReport?: () => void;      // Z - Relatório gerencial
}

export function useTablePDVKeyboardShortcuts(
  shortcuts: TablePDVShortcuts, 
  enabled: boolean = true
) {
  const spaceCountRef = useRef(0);
  const spaceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore if user is typing in an input/textarea
    const target = e.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    
    // Allow shortcuts even when typing for specific keys
    const allowedWhileTyping = ['Escape'];
    
    if (isTyping && !allowedWhileTyping.includes(e.key)) return;

    // Handle 5x space bar for panic
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      spaceCountRef.current += 1;
      
      // Clear previous timer
      if (spaceTimerRef.current) {
        clearTimeout(spaceTimerRef.current);
      }
      
      // Check if 5 presses
      if (spaceCountRef.current >= 5) {
        shortcuts.onPanic?.();
        spaceCountRef.current = 0;
      } else {
        // Reset counter after 2 seconds
        spaceTimerRef.current = setTimeout(() => {
          spaceCountRef.current = 0;
        }, 2000);
      }
      return;
    }

    // Reset space counter for other keys
    spaceCountRef.current = 0;

    const key = e.key.toUpperCase();

    switch (key) {
      case 'F':
        e.preventDefault();
        shortcuts.onPrintAndClose?.();
        break;

      case 'T':
        e.preventDefault();
        shortcuts.onTransfer?.();
        break;

      case 'R':
        e.preventDefault();
        shortcuts.onReopen?.();
        break;

      case 'J':
        e.preventDefault();
        shortcuts.onMerge?.();
        break;

      case 'P':
        e.preventDefault();
        shortcuts.onPayment?.();
        break;

      case 'G':
        e.preventDefault();
        shortcuts.onOpenDrawer?.();
        break;

      case 'C':
        e.preventDefault();
        shortcuts.onLinkCustomer?.();
        break;

      case 'X':
        e.preventDefault();
        shortcuts.onClearAllItems?.();
        break;

      case 'V':
        e.preventDefault();
        shortcuts.onBackToMap?.();
        break;

      case 'S':
        e.preventDefault();
        shortcuts.onWithdrawal?.();
        break;

      case 'M':
        e.preventDefault();
        shortcuts.onCloseCash?.();
        break;

      case 'Y':
        e.preventDefault();
        shortcuts.onReceiveFiado?.();
        break;

      case 'Z':
        e.preventDefault();
        shortcuts.onManagerReport?.();
        break;

      case 'DELETE':
        e.preventDefault();
        shortcuts.onDeleteItem?.();
        break;

      default:
        break;
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (spaceTimerRef.current) {
          clearTimeout(spaceTimerRef.current);
        }
      };
    }
  }, [handleKeyDown, enabled]);
}

// Labels para exibição
export const TABLE_PDV_SHORTCUT_LABELS: Record<string, string> = {
  'F': 'Imprimir e Fechar Conta',
  'T': 'Transferir',
  'R': 'Reabrir Mesa/Comanda',
  'J': 'Juntar Comandas',
  'P': 'Pagamento',
  'G': 'Abrir Gaveta',
  'C': 'Vincular Cliente',
  'X': 'Excluir Todos Pedidos',
  'Del': 'Deletar Item',
  'V': 'Voltar ao Mapa',
  '5x Espaço': 'Botão Pânico',
  'S': 'Sangria',
  'M': 'Fechar Caixa',
  'Y': 'Receber Fiado',
  'Z': 'Relatório Gerencial',
};
