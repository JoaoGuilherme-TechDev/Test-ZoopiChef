/**
 * Smart POS Print Module - Elegant Bluetooth Printing
 * 
 * Design principles:
 * - Inverted headers for emphasis
 * - Bold separators
 * - Clean hierarchy
 * - Professional look
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const LINE_WIDTH_80 = 48;
const LINE_WIDTH_58 = 32;

// ESC/POS Commands for Bluetooth printers
export const ESC = '\x1B';
export const GS = '\x1D';

export const ESCPOS = {
  INIT: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_HEIGHT: `${GS}!\x11`,
  DOUBLE_WIDTH: `${GS}!\x20`,
  DOUBLE_BOTH: `${GS}!\x31`,
  NORMAL: `${GS}!\x00`,
  UNDERLINE_ON: `${ESC}-\x01`,
  UNDERLINE_OFF: `${ESC}-\x00`,
  INVERTED_ON: `${GS}B\x01`,
  INVERTED_OFF: `${GS}B\x00`,
  CUT: `${GS}V\x00`,
  PARTIAL_CUT: `${GS}V\x01`,
  BEEP: `${ESC}B\x02\x02`,
  LINEFEED: '\n',
  WIDE_MODE_ON: `${ESC}W\x01`,
  WIDE_MODE_OFF: `${ESC}W\x00`,
};

export interface SmartPOSPrintConfig {
  paperWidth: 58 | 80;
  printerName?: string;
  printerAddress?: string;
  printStyle: 'elegant' | 'simple';
}

export interface SmartPOSCashClosingData {
  deviceName: string;
  operatorName: string;
  openedAt: string;
  closedAt: string;
  openingBalance: number;
  closingBalance: number; // Valor DIGITADO pelo operador
  expectedBalance: number; // Valor do SISTEMA
  difference: number;
  totalTransactions: number;
  totalRevenue: number;
  paymentsSummary: {
    pix: { count: number; total: number };
    credit: { count: number; total: number };
    debit: { count: number; total: number };
    cash: { count: number; total: number };
    voucher: { count: number; total: number };
  };
  companyName?: string;
  blindMode?: boolean; // Indica se foi fechamento em modo cego
}

// Helper functions
function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function padLine(left: string, right: string, width: number): string {
  const spaces = Math.max(1, width - left.length - right.length);
  return left + '.'.repeat(spaces) + right;
}

/**
 * Generate elegant cash closing ticket for Smart POS
 * With inverted headers and professional styling
 */
export function generateSmartPOSCashClosingText(
  data: SmartPOSCashClosingData,
  config: SmartPOSPrintConfig
): string {
  const w = config.paperWidth === 80 ? LINE_WIDTH_80 : LINE_WIDTH_58;
  const sep = '═'.repeat(w);
  const sepLight = '─'.repeat(w);
  const lines: string[] = [];

  const now = new Date();
  const dateTimeStr = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  // Initialize and start with elegant header
  lines.push('');
  
  // Inverted header block
  lines.push(sep);
  lines.push(centerText('█ FECHAMENTO DE CAIXA █', w));
  lines.push(sep);
  lines.push('');

  // Company and device info
  if (data.companyName) {
    lines.push(centerText(data.companyName.toUpperCase(), w));
  }
  lines.push(centerText(`Dispositivo: ${data.deviceName}`, w));
  lines.push(centerText(dateTimeStr, w));
  lines.push('');

  // Period section
  lines.push(sepLight);
  lines.push(centerText('▌ PERÍODO ▐', w));
  lines.push(sepLight);
  lines.push(`Abertura: ${format(new Date(data.openedAt), "dd/MM HH:mm", { locale: ptBR })}`);
  lines.push(`Fechamento: ${format(new Date(data.closedAt), "dd/MM HH:mm", { locale: ptBR })}`);
  lines.push(`Operador: ${data.operatorName}`);
  lines.push('');

  // Transaction summary
  lines.push(sepLight);
  lines.push(centerText('▌ RESUMO ▐', w));
  lines.push(sepLight);
  lines.push(padLine('Total Transações', String(data.totalTransactions), w));
  lines.push(padLine('Receita Total', formatCurrency(data.totalRevenue), w));
  lines.push('');

  // Payment methods with elegant formatting
  lines.push(sepLight);
  lines.push(centerText('▌ FORMAS DE PAGAMENTO ▐', w));
  lines.push(sepLight);

  const payments = data.paymentsSummary;
  if (payments.pix.count > 0) {
    lines.push(padLine(`PIX (${payments.pix.count}x)`, formatCurrency(payments.pix.total), w));
  }
  if (payments.credit.count > 0) {
    lines.push(padLine(`Crédito (${payments.credit.count}x)`, formatCurrency(payments.credit.total), w));
  }
  if (payments.debit.count > 0) {
    lines.push(padLine(`Débito (${payments.debit.count}x)`, formatCurrency(payments.debit.total), w));
  }
  if (payments.cash.count > 0) {
    lines.push(padLine(`Dinheiro (${payments.cash.count}x)`, formatCurrency(payments.cash.total), w));
  }
  if (payments.voucher.count > 0) {
    lines.push(padLine(`Voucher (${payments.voucher.count}x)`, formatCurrency(payments.voucher.total), w));
  }
  lines.push('');

  // Cash balance section (big box) - CAIXA CEGO format
  lines.push(sep);
  lines.push(centerText('█ CONFERÊNCIA █', w));
  lines.push(sep);
  lines.push(padLine('Saldo Inicial', formatCurrency(data.openingBalance), w));
  lines.push('');
  lines.push(centerText('--- CONFERÊNCIA DE GAVETA ---', w));
  lines.push(padLine('DIGITADO (Contado)', formatCurrency(data.closingBalance), w));
  lines.push(padLine('SISTEMA (Esperado)', formatCurrency(data.expectedBalance), w));
  lines.push('');

  // Difference highlight
  const diffLabel = data.difference === 0 ? 'SEM DIFERENÇA' : 
                    data.difference > 0 ? 'SOBRA' : 'FALTA';
  const diffIcon = data.difference >= 0 ? '✓' : '⚠';
  
  lines.push(sep);
  lines.push(centerText(`DIFERENÇA: ${formatCurrency(Math.abs(data.difference))} ${diffIcon}`, w));
  lines.push(centerText(diffLabel, w));
  lines.push(sep);
  lines.push('');

  // Signature
  lines.push('');
  lines.push('');
  lines.push(centerText('_'.repeat(Math.floor(w * 0.7)), w));
  lines.push(centerText('Assinatura do Operador', w));
  lines.push(centerText(data.operatorName, w));
  lines.push('');

  // Footer
  lines.push(sepLight);
  lines.push(centerText('Impresso em: ' + dateTimeStr, w));
  lines.push(centerText('www.zoopi.app.br', w));
  lines.push('');
  lines.push('');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate ESC/POS commands for elegant printing
 */
export function generateSmartPOSCashClosingESCPOS(
  data: SmartPOSCashClosingData,
  config: SmartPOSPrintConfig
): string {
  const w = config.paperWidth === 80 ? LINE_WIDTH_80 : LINE_WIDTH_58;
  const sep = '═'.repeat(w);
  const sepLight = '─'.repeat(w);
  let output = '';

  const now = new Date();
  const dateTimeStr = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  // Initialize printer
  output += ESCPOS.INIT;

  // Inverted header
  output += ESCPOS.ALIGN_CENTER;
  output += ESCPOS.INVERTED_ON;
  output += ESCPOS.DOUBLE_BOTH;
  output += ' FECHAMENTO DE CAIXA \n';
  output += ESCPOS.INVERTED_OFF;
  output += ESCPOS.NORMAL;

  output += sep + '\n';

  // Company/device info
  if (data.companyName) {
    output += ESCPOS.BOLD_ON;
    output += centerText(data.companyName.toUpperCase(), w) + '\n';
    output += ESCPOS.BOLD_OFF;
  }
  output += centerText(`Dispositivo: ${data.deviceName}`, w) + '\n';
  output += centerText(dateTimeStr, w) + '\n\n';

  // Period
  output += ESCPOS.INVERTED_ON;
  output += centerText(' PERÍODO ', w) + '\n';
  output += ESCPOS.INVERTED_OFF;
  output += `Abertura: ${format(new Date(data.openedAt), "dd/MM HH:mm", { locale: ptBR })}\n`;
  output += `Fechamento: ${format(new Date(data.closedAt), "dd/MM HH:mm", { locale: ptBR })}\n`;
  output += `Operador: ${data.operatorName}\n\n`;

  // Summary
  output += ESCPOS.INVERTED_ON;
  output += centerText(' RESUMO ', w) + '\n';
  output += ESCPOS.INVERTED_OFF;
  output += ESCPOS.BOLD_ON;
  output += padLine('Total Transações', String(data.totalTransactions), w) + '\n';
  output += ESCPOS.DOUBLE_HEIGHT;
  output += padLine('Receita Total', formatCurrency(data.totalRevenue), w) + '\n';
  output += ESCPOS.NORMAL;
  output += ESCPOS.BOLD_OFF + '\n';

  // Payments
  output += ESCPOS.INVERTED_ON;
  output += centerText(' FORMAS DE PAGAMENTO ', w) + '\n';
  output += ESCPOS.INVERTED_OFF;

  const payments = data.paymentsSummary;
  if (payments.pix.count > 0) {
    output += padLine(`PIX (${payments.pix.count}x)`, formatCurrency(payments.pix.total), w) + '\n';
  }
  if (payments.credit.count > 0) {
    output += padLine(`Crédito (${payments.credit.count}x)`, formatCurrency(payments.credit.total), w) + '\n';
  }
  if (payments.debit.count > 0) {
    output += padLine(`Débito (${payments.debit.count}x)`, formatCurrency(payments.debit.total), w) + '\n';
  }
  if (payments.cash.count > 0) {
    output += padLine(`Dinheiro (${payments.cash.count}x)`, formatCurrency(payments.cash.total), w) + '\n';
  }
  if (payments.voucher.count > 0) {
    output += padLine(`Voucher (${payments.voucher.count}x)`, formatCurrency(payments.voucher.total), w) + '\n';
  }
  output += '\n';

  // Cash conference - Big emphasis
  output += sep + '\n';
  output += ESCPOS.INVERTED_ON;
  output += ESCPOS.DOUBLE_BOTH;
  output += centerText(' CONFERÊNCIA ', w) + '\n';
  output += ESCPOS.NORMAL;
  output += ESCPOS.INVERTED_OFF;
  output += sep + '\n';

  output += padLine('Saldo Inicial', formatCurrency(data.openingBalance), w) + '\n';
  output += padLine('Saldo Esperado', formatCurrency(data.expectedBalance), w) + '\n';
  output += ESCPOS.BOLD_ON;
  output += padLine('Saldo Contado', formatCurrency(data.closingBalance), w) + '\n';
  output += ESCPOS.BOLD_OFF;
  output += '\n';

  // Difference - Big and bold
  const diffLabel = data.difference === 0 ? 'SEM DIFERENÇA' : 
                    data.difference > 0 ? 'SOBRA' : 'FALTA';
  const diffIcon = data.difference >= 0 ? '✓' : '⚠';

  output += ESCPOS.INVERTED_ON;
  output += ESCPOS.DOUBLE_BOTH;
  output += centerText(` ${diffLabel}: ${formatCurrency(Math.abs(data.difference))} ${diffIcon} `, w) + '\n';
  output += ESCPOS.NORMAL;
  output += ESCPOS.INVERTED_OFF;
  output += '\n\n';

  // Signature
  output += '\n\n';
  output += centerText('_'.repeat(Math.floor(w * 0.7)), w) + '\n';
  output += centerText('Assinatura do Operador', w) + '\n';
  output += ESCPOS.BOLD_ON;
  output += centerText(data.operatorName, w) + '\n';
  output += ESCPOS.BOLD_OFF;
  output += '\n';

  // Footer
  output += sepLight + '\n';
  output += centerText('Impresso em: ' + dateTimeStr, w) + '\n';
  output += centerText('www.zoopi.app.br', w) + '\n';

  // Cut
  output += '\n\n\n';
  output += ESCPOS.PARTIAL_CUT;

  return output;
}

/**
 * Generate HTML for browser-based printing (fallback)
 */
export function generateSmartPOSCashClosingHTML(
  data: SmartPOSCashClosingData,
  config: SmartPOSPrintConfig
): string {
  const w = config.paperWidth === 80 ? '80mm' : '58mm';
  const dateTimeStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  const payments = data.paymentsSummary;
  const diffLabel = data.difference === 0 ? 'SEM DIFERENÇA' : 
                    data.difference > 0 ? 'SOBRA' : 'FALTA';
  const diffClass = data.difference >= 0 ? 'success' : 'danger';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fechamento - ${data.deviceName}</title>
  <style>
    @page { size: ${w} auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: ${w};
      max-width: ${w};
      padding: 4mm;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .inverted {
      background: #000;
      color: #fff;
      padding: 8px 4px;
      text-align: center;
      font-weight: bold;
      margin: 4px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .inverted.large {
      font-size: 16px;
      letter-spacing: 1px;
    }
    .separator { 
      border-top: 2px solid #000; 
      margin: 6px 0; 
    }
    .separator-light { 
      border-top: 1px dashed #000; 
      margin: 6px 0; 
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
    }
    .row .dots {
      flex: 1;
      border-bottom: 1px dotted #000;
      margin: 0 4px 4px 4px;
    }
    .section { margin: 8px 0; }
    .section-header {
      background: #000;
      color: #fff;
      padding: 4px 8px;
      font-weight: bold;
      text-align: center;
      font-size: 11px;
      letter-spacing: 1px;
      margin-bottom: 4px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .big-box {
      border: 3px solid #000;
      padding: 12px;
      margin: 10px 0;
      text-align: center;
    }
    .big-value {
      font-size: 18px;
      font-weight: bold;
    }
    .success { color: #000; }
    .danger { background: #000; color: #fff; padding: 4px; }
    .signature {
      margin-top: 30px;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #000;
      width: 70%;
      margin: 20px auto 4px;
    }
    .footer {
      margin-top: 16px;
      text-align: center;
      font-size: 10px;
    }
    @media print { body { width: 100%; max-width: ${w}; } }
  </style>
</head>
<body>
  <div class="inverted large">█ FECHAMENTO DE CAIXA █</div>
  
  <div class="center">
    ${data.companyName ? `<div class="bold">${data.companyName.toUpperCase()}</div>` : ''}
    <div>Dispositivo: ${data.deviceName}</div>
    <div>${dateTimeStr}</div>
  </div>

  <div class="section">
    <div class="section-header">PERÍODO</div>
    <div class="row"><span>Abertura:</span><span>${format(new Date(data.openedAt), "dd/MM HH:mm")}</span></div>
    <div class="row"><span>Fechamento:</span><span>${format(new Date(data.closedAt), "dd/MM HH:mm")}</span></div>
    <div class="row"><span>Operador:</span><span>${data.operatorName}</span></div>
  </div>

  <div class="section">
    <div class="section-header">RESUMO</div>
    <div class="row"><span>Total Transações</span><span class="dots"></span><span class="bold">${data.totalTransactions}</span></div>
    <div class="row"><span>Receita Total</span><span class="dots"></span><span class="bold">${formatCurrency(data.totalRevenue)}</span></div>
  </div>

  <div class="section">
    <div class="section-header">FORMAS DE PAGAMENTO</div>
    ${payments.pix.count > 0 ? `<div class="row"><span>PIX (${payments.pix.count}x)</span><span class="dots"></span><span>${formatCurrency(payments.pix.total)}</span></div>` : ''}
    ${payments.credit.count > 0 ? `<div class="row"><span>Crédito (${payments.credit.count}x)</span><span class="dots"></span><span>${formatCurrency(payments.credit.total)}</span></div>` : ''}
    ${payments.debit.count > 0 ? `<div class="row"><span>Débito (${payments.debit.count}x)</span><span class="dots"></span><span>${formatCurrency(payments.debit.total)}</span></div>` : ''}
    ${payments.cash.count > 0 ? `<div class="row"><span>Dinheiro (${payments.cash.count}x)</span><span class="dots"></span><span>${formatCurrency(payments.cash.total)}</span></div>` : ''}
    ${payments.voucher.count > 0 ? `<div class="row"><span>Voucher (${payments.voucher.count}x)</span><span class="dots"></span><span>${formatCurrency(payments.voucher.total)}</span></div>` : ''}
  </div>

  <div class="big-box">
    <div class="section-header" style="margin:-12px -12px 10px -12px;">CONFERÊNCIA DE GAVETA</div>
    <div class="row"><span>Saldo Inicial</span><span class="dots"></span><span>${formatCurrency(data.openingBalance)}</span></div>
    <div class="separator-light"></div>
    <div style="background: #f5f5f5; padding: 8px; margin: 8px -12px; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd;">
      <div class="row"><span><strong>DIGITADO</strong> (Contado)</span><span class="dots"></span><span class="bold">${formatCurrency(data.closingBalance)}</span></div>
      <div class="row"><span><strong>SISTEMA</strong> (Esperado)</span><span class="dots"></span><span>${formatCurrency(data.expectedBalance)}</span></div>
    </div>
    <div class="separator"></div>
    <div style="font-size: 10px; color: #666; margin-bottom: 4px;">DIFERENÇA</div>
    <div class="big-value ${diffClass}">${diffLabel}: ${formatCurrency(Math.abs(data.difference))} ${data.difference >= 0 ? '✓' : '⚠'}</div>
    ${data.blindMode ? '<div style="font-size: 10px; margin-top: 4px; color: #666;">[CAIXA CEGO]</div>' : ''}
  </div>

  <div class="signature">
    <div class="signature-line"></div>
    <div>Assinatura do Operador</div>
    <div class="bold">${data.operatorName}</div>
  </div>

  <div class="footer">
    <div class="separator-light"></div>
    <div>Impresso em: ${dateTimeStr}</div>
    <div>www.zoopi.app.br</div>
  </div>
</body>
</html>`;
}

/**
 * Generate elegant production ticket for Smart POS
 */
export function generateSmartPOSProductionText(
  orderNumber: string,
  customerName: string,
  items: Array<{ name: string; quantity: number; options?: string[]; notes?: string }>,
  config: SmartPOSPrintConfig,
  options?: { source?: string; eatHere?: boolean; companyName?: string }
): string {
  const w = config.paperWidth === 80 ? LINE_WIDTH_80 : LINE_WIDTH_58;
  const sep = '═'.repeat(w);
  const sepLight = '─'.repeat(w);
  const lines: string[] = [];

  const now = new Date();
  const timeStr = format(now, 'HH:mm', { locale: ptBR });
  const dateStr = format(now, 'dd/MM', { locale: ptBR });

  // Header
  lines.push('');
  lines.push(sep);
  lines.push(centerText('█ PRODUÇÃO █', w));
  lines.push(sep);
  lines.push('');

  // Order info
  lines.push(centerText(`PEDIDO #${orderNumber}`, w));
  lines.push(centerText(customerName.toUpperCase(), w));
  lines.push(centerText(`${dateStr} ${timeStr}`, w));
  lines.push('');

  // Items
  lines.push(sepLight);
  lines.push('ITENS:');
  lines.push('');

  for (const item of items) {
    lines.push(`${item.quantity}x ${item.name.toUpperCase()}`);
    if (item.options && item.options.length > 0) {
      for (const opt of item.options) {
        lines.push(`   → ${opt}`);
      }
    }
    if (item.notes) {
      lines.push(`   ★ ${item.notes}`);
    }
    lines.push('');
  }

  lines.push(sepLight);

  // Eat here / Take away - big emphasis
  if (options?.eatHere !== undefined) {
    const mode = options.eatHere ? 'COMER AQUI' : 'LEVAR';
    lines.push('');
    lines.push(sep);
    lines.push(centerText(`★★ ${mode} ★★`, w));
    lines.push(sep);
    lines.push('');
  }

  // Source
  if (options?.source) {
    lines.push(centerText(`Origem: ${options.source}`, w));
  }

  lines.push('');
  lines.push(centerText(`Total: ${items.length} item(s)`, w));
  lines.push('');
  lines.push('');

  return lines.join('\n');
}
