import { CashClosingSummary } from '@/hooks/useCashSession';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface CashClosingPrintData {
  sessionId: string;
  openedAt: string;
  closedAt: string;
  openedByName: string;
  closedByName: string;
  companyName: string;
  summary: CashClosingSummary;
  closingBalance: number;
  difference: number;
  differenceReason?: string;
  blindMode?: boolean; // Modo caixa cego
}

export function generateCashClosingHTML(data: CashClosingPrintData): string {
  const { summary, companyName } = data;
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const differenceClass = data.difference > 0 ? 'positive' : data.difference < 0 ? 'negative' : '';
  const differenceLabel = data.difference > 0 ? 'SOBRA' : data.difference < 0 ? 'FALTA' : 'SEM DIFERENÇA';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fechamento de Caixa</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 12px; 
      width: 80mm; 
      padding: 5mm;
      background: #fff;
      color: #000 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    * {
      color: #000 !important;
      font-weight: bold !important;
    }
    .header { 
      text-align: center; 
      border-bottom: 2px dashed #000; 
      padding-bottom: 8px; 
      margin-bottom: 8px; 
    }
    .header h2 { font-size: 16px; margin-bottom: 4px; }
    .header .company { font-weight: bold; font-size: 14px; }
    .section { 
      margin: 8px 0; 
      padding: 8px 0; 
      border-bottom: 1px dashed #ccc; 
    }
    .section-title { 
      font-weight: bold; 
      font-size: 13px; 
      margin-bottom: 6px; 
      text-transform: uppercase;
    }
    .row { 
      display: flex; 
      justify-content: space-between; 
      margin: 3px 0; 
    }
    .row.total { 
      font-weight: bold; 
      font-size: 14px; 
      padding-top: 6px;
      border-top: 1px solid #000;
    }
    .row.highlight { 
      background: #f0f0f0; 
      padding: 4px 2px; 
      margin: 2px -2px;
    }
    .positive { color: green; }
    .negative { color: red; }
    .big { font-size: 16px; font-weight: bold; }
    .small { font-size: 10px; color: #666; }
    .center { text-align: center; }
    .divider { 
      border-top: 2px dashed #000; 
      margin: 10px 0; 
    }
    .signature {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #000;
      text-align: center;
    }
    .product-list { margin-left: 10px; }
    .product-item { font-size: 11px; }
    @media print {
      body { margin: 0; }
      @page { size: 80mm auto; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">${companyName}</div>
    <h2>FECHAMENTO DE CAIXA</h2>
    <p class="small">Impresso em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
  </div>

  <div class="section">
    <div class="section-title">Período</div>
    <div class="row"><span>Abertura:</span><span>${formatDate(data.openedAt)}</span></div>
    <div class="row"><span>Fechamento:</span><span>${formatDate(data.closedAt)}</span></div>
    <div class="row"><span>Operador Abertura:</span><span>${data.openedByName}</span></div>
    <div class="row"><span>Operador Fechamento:</span><span>${data.closedByName}</span></div>
  </div>

  <div class="section">
    <div class="section-title">Resumo Geral</div>
    <div class="row"><span>Total de Pedidos:</span><span>${summary.totalOrders}</span></div>
    <div class="row highlight"><span>RECEITA TOTAL:</span><span class="big">${formatCurrency(summary.totalRevenue)}</span></div>
    <div class="row"><span>Ticket Médio:</span><span>${formatCurrency(summary.avgTicket)}</span></div>
    <div class="row"><span>Taxa de Entrega:</span><span>${formatCurrency(summary.deliveryFees)}</span></div>
  </div>

  <div class="section">
    <div class="section-title">Por Forma de Pagamento</div>
    <div class="row"><span>Dinheiro (${summary.payments.dinheiro.count}x):</span><span>${formatCurrency(summary.payments.dinheiro.total)}</span></div>
    <div class="row"><span>PIX (${summary.payments.pix.count}x):</span><span>${formatCurrency(summary.payments.pix.total)}</span></div>
    <div class="row"><span>Cartão Crédito (${summary.payments.cartao_credito.count}x):</span><span>${formatCurrency(summary.payments.cartao_credito.total)}</span></div>
    <div class="row"><span>Cartão Débito (${summary.payments.cartao_debito.count}x):</span><span>${formatCurrency(summary.payments.cartao_debito.total)}</span></div>
    <div class="row"><span>Fiado (${summary.payments.fiado.count}x):</span><span>${formatCurrency(summary.payments.fiado.total)}</span></div>
    ${summary.payments.outros.count > 0 ? `<div class="row"><span>Outros (${summary.payments.outros.count}x):</span><span>${formatCurrency(summary.payments.outros.total)}</span></div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Movimentação Dinheiro</div>
    <div class="row"><span>Troco Inicial:</span><span>${formatCurrency(summary.openingBalance)}</span></div>
    <div class="row"><span>(+) Dinheiro Recebido:</span><span>${formatCurrency(summary.payments.dinheiro.total)}</span></div>
    <div class="row"><span>(-) Troco Dado:</span><span>${formatCurrency(summary.changeGiven)}</span></div>
    <div class="row highlight"><span>Saldo Esperado:</span><span>${formatCurrency(summary.expectedCash)}</span></div>
  </div>

  <div class="section">
    <div class="section-title">Conferência${data.blindMode ? ' (Caixa Cego)' : ''}</div>
    <div class="row"><span>DIGITADO (Contado):</span><span class="big">${formatCurrency(data.closingBalance)}</span></div>
    <div class="row"><span>SISTEMA (Esperado):</span><span class="big">${formatCurrency(summary.expectedCash)}</span></div>
    <div class="row highlight ${differenceClass}">
      <span>DIFERENÇA ${data.difference > 0 ? '(SOBRA)' : data.difference < 0 ? '(FALTA)' : ''}:</span>
      <span class="big">${formatCurrency(Math.abs(data.difference))}</span>
    </div>
    ${data.differenceReason ? `<div class="row small"><span>Motivo:</span><span>${data.differenceReason}</span></div>` : ''}
  </div>

  ${summary.cancelled.count > 0 ? `
  <div class="section">
    <div class="section-title">Cancelamentos</div>
    <div class="row"><span>Quantidade:</span><span>${summary.cancelled.count}</span></div>
    <div class="row"><span>Valor Total:</span><span>${formatCurrency(summary.cancelled.total)}</span></div>
  </div>
  ` : ''}

  ${summary.topProducts.length > 0 ? `
  <div class="section">
    <div class="section-title">Top Produtos</div>
    <div class="product-list">
      ${summary.topProducts.slice(0, 5).map((p, i) => `
        <div class="product-item">
          ${i + 1}. ${p.name} (${p.quantity}x) - ${formatCurrency(p.revenue)}
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${summary.delivererStats.length > 0 ? `
  <div class="section">
    <div class="section-title">Entregadores</div>
    ${summary.delivererStats.map(d => `
      <div class="row">
        <span>${d.name} (${d.deliveries}x):</span>
        <span>${formatCurrency(d.totalValue)}</span>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="divider"></div>

  <div class="signature">
    <p>_______________________________</p>
    <p class="small">Assinatura do Responsável</p>
  </div>

  <p class="center small" style="margin-top: 20px;">
    ID: ${data.sessionId.slice(0, 8)}
  </p>
</body>
</html>
  `;
}

export function printCashClosing(data: CashClosingPrintData): void {
  const html = generateCashClosingHTML(data);
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
