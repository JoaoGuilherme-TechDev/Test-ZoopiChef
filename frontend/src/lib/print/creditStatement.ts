import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface CreditStatementData {
  // Customer data
  customer: {
    id: string;
    name: string;
    whatsapp: string;
    address?: string | null;
  };
  
  // Account summary
  summary: {
    currentBalance: number;
    creditLimit?: number | null;
    status: 'active' | 'blocked';
  };
  
  // Transactions
  transactions: Array<{
    id: string;
    created_at: string;
    transaction_type: 'debit' | 'payment';
    order_id: string | null;
    amount: number;
    balance_after: number;
    notes?: string | null;
  }>;
  
  // Company
  companyName: string;
  operatorName?: string;
}

/**
 * Calculate totals from transactions
 */
function calculateTotals(transactions: CreditStatementData['transactions']) {
  let totalDebits = 0;
  let totalPayments = 0;
  
  transactions.forEach(tx => {
    if (tx.transaction_type === 'debit') {
      totalDebits += tx.amount;
    } else {
      totalPayments += tx.amount;
    }
  });
  
  return {
    totalDebits,
    totalPayments,
    totalPending: totalDebits - totalPayments,
  };
}

/**
 * Format currency in Brazilian Real
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Generate credit statement HTML for printing
 * Optimized for 80mm thermal printers
 */
export function generateCreditStatementHTML(data: CreditStatementData): string {
  const printDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const totals = calculateTotals(data.transactions);
  
  // Sort transactions by date (oldest first for statement)
  const sortedTransactions = [...data.transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  // Generate transaction rows
  const transactionsHtml = sortedTransactions.map(tx => {
    const txDate = format(new Date(tx.created_at), 'dd/MM/yy', { locale: ptBR });
    const txTime = format(new Date(tx.created_at), 'HH:mm', { locale: ptBR });
    const isDebit = tx.transaction_type === 'debit';
    const typeLabel = isDebit ? 'DÉBITO' : 'CRÉDITO';
    const orderRef = tx.order_id ? `#${tx.order_id.slice(0, 6)}` : '-';
    
    return `
      <tr class="${isDebit ? 'row-debit' : 'row-credit'}">
        <td class="date-col">${txDate}<br><span class="time">${txTime}</span></td>
        <td class="type-col">${typeLabel}</td>
        <td class="order-col">${orderRef}</td>
        <td class="value-col ${isDebit ? 'value-debit' : 'value-credit'}">
          ${isDebit ? '+' : '-'}${formatCurrency(tx.amount)}
        </td>
        <td class="balance-col">${formatCurrency(tx.balance_after)}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Extrato de Fiado - ${data.customer.name}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 11px; 
      width: 76mm;
      padding: 4px;
      line-height: 1.3;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .header { 
      text-align: center; 
      padding-bottom: 8px;
      border-bottom: 2px solid #000;
    }
    .company-name { font-size: 14px; font-weight: bold; }
    .doc-title { 
      font-size: 16px; 
      font-weight: bold; 
      margin: 8px 0;
      background: #000;
      color: #fff;
      padding: 8px;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-date { font-size: 10px; margin-top: 4px; }
    
    .section { margin: 10px 0; }
    .section-title { 
      font-size: 12px; 
      font-weight: bold; 
      text-decoration: underline;
      margin-bottom: 6px;
    }
    
    .customer-info { margin: 8px 0; }
    .customer-info .row { 
      display: flex; 
      justify-content: space-between; 
      margin: 3px 0;
      font-size: 11px;
    }
    .customer-info .label { font-weight: bold; }
    
    .summary-box {
      border: 2px solid #000;
      padding: 8px;
      margin: 10px 0;
    }
    .summary-row { 
      display: flex; 
      justify-content: space-between; 
      margin: 4px 0;
      font-size: 12px;
    }
    .summary-balance {
      background: #000;
      color: #fff;
      padding: 8px;
      margin-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: bold;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .separator { border-top: 1px dashed #000; margin: 8px 0; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }
    th {
      background: #000;
      color: #fff;
      padding: 4px 2px;
      text-align: left;
      font-size: 8px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    td {
      padding: 3px 2px;
      border-bottom: 1px dotted #ccc;
      vertical-align: top;
    }
    .date-col { width: 18%; }
    .type-col { width: 18%; font-weight: bold; }
    .order-col { width: 15%; }
    .value-col { width: 24%; text-align: right; }
    .balance-col { width: 25%; text-align: right; font-weight: bold; }
    
    .time { font-size: 7px; color: #666; }
    .value-debit { color: #c00; }
    .value-credit { color: #060; }
    .row-debit { background: #fff; }
    .row-credit { background: #f5f5f5; }
    
    .totals {
      margin-top: 10px;
      border: 2px solid #000;
      padding: 8px;
    }
    .totals-row { 
      display: flex; 
      justify-content: space-between; 
      margin: 4px 0;
      font-size: 11px;
    }
    .totals-row.total-debit { color: #c00; }
    .totals-row.total-credit { color: #060; }
    .totals-row.total-pending { 
      font-size: 13px; 
      font-weight: bold;
      padding-top: 6px;
      border-top: 1px solid #000;
      margin-top: 6px;
    }
    
    .signature {
      margin-top: 30px;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #000;
      width: 80%;
      margin: 0 auto;
      padding-top: 4px;
    }
    .signature-text {
      font-size: 9px;
      margin-top: 4px;
    }
    .signature-notice {
      font-size: 8px;
      font-style: italic;
      margin-top: 8px;
      padding: 4px;
      border: 1px dashed #000;
    }
    
    .footer {
      text-align: center;
      font-size: 9px;
      margin-top: 12px;
      padding-top: 6px;
      border-top: 2px solid #000;
    }
    
    @media print { 
      body { width: 100%; max-width: 76mm; } 
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${data.companyName.toUpperCase()}</div>
  </div>
  
  <div class="doc-title">EXTRATO DE CONTA FIADO</div>
  
  <div class="print-date">Emitido em: ${printDate}</div>
  
  <!-- Customer Data Section -->
  <div class="section">
    <div class="section-title">A) DADOS DO CLIENTE</div>
    <div class="customer-info">
      <div class="row">
        <span class="label">Nome:</span>
        <span>${data.customer.name.toUpperCase()}</span>
      </div>
      <div class="row">
        <span class="label">WhatsApp:</span>
        <span>${data.customer.whatsapp}</span>
      </div>
      ${data.customer.address ? `
      <div class="row">
        <span class="label">Endereço:</span>
        <span>${data.customer.address}</span>
      </div>
      ` : ''}
    </div>
  </div>
  
  <div class="separator"></div>
  
  <!-- Account Summary Section -->
  <div class="section">
    <div class="section-title">B) RESUMO DA CONTA</div>
    <div class="summary-box">
      <div class="summary-row">
        <span>Status:</span>
        <span>${data.summary.status === 'active' ? 'ATIVO' : 'BLOQUEADO'}</span>
      </div>
      ${data.summary.creditLimit ? `
      <div class="summary-row">
        <span>Limite de Crédito:</span>
        <span>${formatCurrency(data.summary.creditLimit)}</span>
      </div>
      ` : ''}
      <div class="summary-balance">
        <span>SALDO DEVEDOR:</span>
        <span>${formatCurrency(data.summary.currentBalance)}</span>
      </div>
    </div>
  </div>
  
  <div class="separator"></div>
  
  <!-- Statement Detail Section -->
  <div class="section">
    <div class="section-title">C) EXTRATO DETALHADO</div>
    ${sortedTransactions.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>DATA</th>
          <th>TIPO</th>
          <th>PEDIDO</th>
          <th>VALOR</th>
          <th>SALDO</th>
        </tr>
      </thead>
      <tbody>
        ${transactionsHtml}
      </tbody>
    </table>
    ` : '<div style="text-align: center; padding: 10px; font-style: italic;">Nenhuma movimentação registrada</div>'}
  </div>
  
  <div class="separator"></div>
  
  <!-- Totals Section -->
  <div class="section">
    <div class="section-title">D) TOTALIZAÇÃO</div>
    <div class="totals">
      <div class="totals-row total-debit">
        <span>Total de Compras Fiado:</span>
        <span>${formatCurrency(totals.totalDebits)}</span>
      </div>
      <div class="totals-row total-credit">
        <span>Total Já Pago:</span>
        <span>${formatCurrency(totals.totalPayments)}</span>
      </div>
      <div class="totals-row total-pending">
        <span>TOTAL EM ABERTO:</span>
        <span>${formatCurrency(totals.totalPending)}</span>
      </div>
    </div>
  </div>
  
  <!-- Signature Section -->
  <div class="signature">
    <div class="signature-line"></div>
    <div class="signature-text">Assinatura do Cliente</div>
    <div class="signature-notice">
      Declaro estar ciente do saldo acima informado.
    </div>
  </div>
  
  <div class="footer">
    <div>VIA DO CLIENTE</div>
    ${data.operatorName ? `<div>Emitido por: ${data.operatorName}</div>` : ''}
  </div>
  
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;
}

/**
 * Print credit statement via browser
 */
export function printCreditStatement(data: CreditStatementData): void {
  const html = generateCreditStatementHTML(data);
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
