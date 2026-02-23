import { CashClosingSummary, CashSession } from '@/hooks/useCashSession';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CashClosingPrintProps {
  session: CashSession;
  summary: CashClosingSummary;
  closingBalance: number;
  operatorName: string;
  companyName: string;
}

export function generateCashClosingReceipt(props: CashClosingPrintProps): string {
  const { session, summary, closingBalance, operatorName, companyName } = props;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const difference = closingBalance - summary.expectedCash;
  const now = new Date();

  // Duplicar linhas críticas para garantir legibilidade na impressão térmica
  const receipt = `
================================
================================
      FECHAMENTO DE CAIXA
      FECHAMENTO DE CAIXA
================================
================================
${companyName}
${companyName}
Data/Hora: ${format(now, "dd/MM/yyyy HH:mm", { locale: ptBR })}
Data/Hora: ${format(now, "dd/MM/yyyy HH:mm", { locale: ptBR })}

--------------------------------
--------------------------------
          PERÍODO
          PERÍODO
--------------------------------
--------------------------------
Abertura: ${format(new Date(session.opened_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
Abertura: ${format(new Date(session.opened_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
Fechamento: ${format(now, "dd/MM/yyyy HH:mm", { locale: ptBR })}
Fechamento: ${format(now, "dd/MM/yyyy HH:mm", { locale: ptBR })}
Operador Abertura: ${operatorName}
Operador Abertura: ${operatorName}
Operador Fechamento: ${operatorName}
Operador Fechamento: ${operatorName}

--------------------------------
--------------------------------
       RESUMO GERAL
       RESUMO GERAL
--------------------------------
--------------------------------
Total de Pedidos: ${summary.totalOrders}
Total de Pedidos: ${summary.totalOrders}
RECEITA TOTAL:    ${formatCurrency(summary.totalRevenue)}
RECEITA TOTAL:    ${formatCurrency(summary.totalRevenue)}
Ticket Médio:     ${formatCurrency(summary.avgTicket)}
Ticket Médio:     ${formatCurrency(summary.avgTicket)}
Taxa de Entrega:  ${formatCurrency(summary.deliveryFees)}
Taxa de Entrega:  ${formatCurrency(summary.deliveryFees)}

--------------------------------
--------------------------------
   POR FORMA DE PAGAMENTO
   POR FORMA DE PAGAMENTO
--------------------------------
--------------------------------
Dinheiro (${summary.payments.dinheiro.count}x):     ${formatCurrency(summary.payments.dinheiro.total)}
Dinheiro (${summary.payments.dinheiro.count}x):     ${formatCurrency(summary.payments.dinheiro.total)}
PIX (${summary.payments.pix.count}x):              ${formatCurrency(summary.payments.pix.total)}
PIX (${summary.payments.pix.count}x):              ${formatCurrency(summary.payments.pix.total)}
Cartão Crédito (${summary.payments.cartao_credito.count}x): ${formatCurrency(summary.payments.cartao_credito.total)}
Cartão Crédito (${summary.payments.cartao_credito.count}x): ${formatCurrency(summary.payments.cartao_credito.total)}
Cartão Débito (${summary.payments.cartao_debito.count}x):  ${formatCurrency(summary.payments.cartao_debito.total)}
Cartão Débito (${summary.payments.cartao_debito.count}x):  ${formatCurrency(summary.payments.cartao_debito.total)}
Fiado (${summary.payments.fiado.count}x):          ${formatCurrency(summary.payments.fiado.total)}
Fiado (${summary.payments.fiado.count}x):          ${formatCurrency(summary.payments.fiado.total)}
${summary.payments.outros.total > 0 ? `Outros (${summary.payments.outros.count}x):         ${formatCurrency(summary.payments.outros.total)}
Outros (${summary.payments.outros.count}x):         ${formatCurrency(summary.payments.outros.total)}` : ''}

--------------------------------
--------------------------------
    MOVIMENTAÇÃO DINHEIRO
    MOVIMENTAÇÃO DINHEIRO
--------------------------------
--------------------------------
Troco Inicial:     ${formatCurrency(session.opening_balance)}
Troco Inicial:     ${formatCurrency(session.opening_balance)}
(+) Dinheiro Recebido: ${formatCurrency(summary.payments.dinheiro.total)}
(+) Dinheiro Recebido: ${formatCurrency(summary.payments.dinheiro.total)}
(-) Troco Dado:    ${formatCurrency(summary.changeGiven)}
(-) Troco Dado:    ${formatCurrency(summary.changeGiven)}
Saldo Esperado:    ${formatCurrency(summary.expectedCash)}
Saldo Esperado:    ${formatCurrency(summary.expectedCash)}

================================
================================
         CONFERÊNCIA
         CONFERÊNCIA
================================
================================
Dinheiro Contado:  ${formatCurrency(closingBalance)}
Dinheiro Contado:  ${formatCurrency(closingBalance)}
Saldo Esperado:    ${formatCurrency(summary.expectedCash)}
Saldo Esperado:    ${formatCurrency(summary.expectedCash)}
--------------------------------
--------------------------------
${difference === 0 ? 'SEM DIFERENÇA' : difference > 0 ? 'SOBRA' : 'FALTA'}:            ${formatCurrency(Math.abs(difference))} ${difference >= 0 ? '✓' : '⚠'}
${difference === 0 ? 'SEM DIFERENÇA' : difference > 0 ? 'SOBRA' : 'FALTA'}:            ${formatCurrency(Math.abs(difference))} ${difference >= 0 ? '✓' : '⚠'}
================================
================================

--------------------------------
--------------------------------
      TOP PRODUTOS
      TOP PRODUTOS
--------------------------------
--------------------------------
${summary.topProducts.slice(0, 10).map((p, i) => {
  const line = `${i + 1}. ${p.name.substring(0, 15)} (${p.quantity}x) - ${formatCurrency(p.revenue)}`;
  return `${line}
${line}`;
}).join('\n')}

${summary.delivererStats.length > 0 ? `
--------------------------------
--------------------------------
       ENTREGADORES
       ENTREGADORES
--------------------------------
--------------------------------
${summary.delivererStats.map(d => {
  const line = `${d.name.substring(0, 12)} (${d.deliveries}x): ${formatCurrency(d.totalValue)}`;
  return `${line}
${line}`;
}).join('\n')}
` : ''}

--------------------------------
--------------------------------
        CANCELADOS
        CANCELADOS
--------------------------------
--------------------------------
Qtd Cancelados: ${summary.cancelled.count}
Qtd Cancelados: ${summary.cancelled.count}
Valor Cancel.: ${formatCurrency(summary.cancelled.total)}
Valor Cancel.: ${formatCurrency(summary.cancelled.total)}

--------------------------------
--------------------------------
          FIADO
          FIADO
--------------------------------
--------------------------------
Fiado Gerado:    ${formatCurrency(summary.fiadoGenerated)}
Fiado Gerado:    ${formatCurrency(summary.fiadoGenerated)}
Fiado Recebido:  ${formatCurrency(summary.fiadoReceived)}
Fiado Recebido:  ${formatCurrency(summary.fiadoReceived)}

================================
================================

Assinatura do Operador:


_____________________________
${operatorName}

================================
================================
      Zoopi Tecnologia
      Zoopi Tecnologia
================================
================================
`;

  return receipt;
}

export function printCashClosingReceipt(props: CashClosingPrintProps): void {
  const receipt = generateCashClosingReceipt(props);
  
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    alert('Popup bloqueado. Permita popups para imprimir.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fechamento de Caixa</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          padding: 10px;
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #000 !important;
          font-weight: bold !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        * {
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
    <body>${receipt}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
