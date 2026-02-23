import { CashSession } from '@/hooks/useCashSession';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CashSupplyPrintProps {
  session: CashSession;
  operatorName: string;
  companyName: string;
  notes?: string;
}

/**
 * Gera o texto do cupom de suprimento / abertura de caixa
 */
export function generateCashSupplyReceipt(props: CashSupplyPrintProps): string {
  const { session, operatorName, companyName, notes } = props;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const openedAt = new Date(session.opened_at);

  const receipt = `
================================
     SUPRIMENTO / ABERTURA
         DE CAIXA
================================

${companyName}

================================
     DADOS DA OPERAÇÃO
================================

Data/Hora:  ${format(openedAt, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}

Operador:   ${operatorName}

ID Sessão:  ${session.id.slice(0, 8).toUpperCase()}

================================
     VALOR DO SUPRIMENTO
================================

TROCO INICIAL:

   ${formatCurrency(session.opening_balance)}

${notes ? `
================================
        OBSERVAÇÃO
================================
${notes}
` : ''}
================================
     ASSINATURA OPERADOR
================================




_____________________________
${operatorName}




================================
    Zoopi Tecnologia
================================
`;

  return receipt;
}

/**
 * Imprime o cupom de suprimento (abertura de caixa) usando window.print
 */
export function printCashSupplyReceipt(props: CashSupplyPrintProps): void {
  const receipt = generateCashSupplyReceipt(props);
  
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    console.error('Popup bloqueado. Permita popups para imprimir.');
    return;
  }

  // Render via textContent (evita HTML quebrar/ficar em branco) e imprime após load
  const safeText = receipt;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Suprimento - Abertura de Caixa</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          padding: 10px;
          margin: 0;
          color: #000 !important;
          font-weight: bold !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        * {
          color: #000 !important;
          font-weight: bold !important;
        }
        pre {
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #000 !important;
          font-weight: bold !important;
        }
        @media print {
          body {
            width: 80mm;
            margin: 0;
            padding: 5px;
          }
        }
      </style>
    </head>
    <body>
      <pre id="receipt"></pre>
      <script>
        const el = document.getElementById('receipt');
        el.textContent = ${JSON.stringify(safeText)};
        window.addEventListener('load', () => {
          // garante 1 frame de render antes do print
          requestAnimationFrame(() => {
            window.focus();
            window.print();
          });
        });
        window.addEventListener('afterprint', () => {
          window.close();
        });
      </script>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
}

