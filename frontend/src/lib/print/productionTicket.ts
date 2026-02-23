/**
 * Production Ticket Generator for 80mm Thermal Printers
 * 
 * LAYOUT PADRONIZADO:
 * - Cabeçalho: Nome do estabelecimento + ORIGEM DO PEDIDO (destaque)
 * - Nº do pedido + Data/hora
 * - Itens com quantidade, nome, observações e adicionais
 * - Observação geral do pedido
 * - Modo de consumo (Comer Aqui / Levar)
 * - Rodapé: Qtd itens + identificador
 * 
 * REGRAS:
 * - NUNCA exibir nome do setor no cabeçalho
 * - SEMPRE exibir origem do pedido
 * - Validar dados obrigatórios antes de imprimir
 */

import { Order } from '@/hooks/useOrders';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildItemChildLines, truncateEllipsis } from '@/lib/receiptFormatting';
import { 
  validateProductionTicket, 
  extractOrderOrigin,
  formatValidationErrors,
  logValidationFailure,
  type ProductionTicketData,
  type ValidationResult 
} from './ticketValidation';

const LINE_WIDTH = 48;
const SEPARATOR_DASHED = '-'.repeat(LINE_WIDTH);
const SEPARATOR_DOUBLE = '='.repeat(LINE_WIDTH);
const INDENT = '      '; // 6 spaces for child items

interface ProductionItem {
  product_name: string;
  quantity: number;
  selected_options_json?: any;
  notes?: string | null;
}

/**
 * Center text within LINE_WIDTH
 */
function centerText(text: string, width: number = LINE_WIDTH): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Prepare production ticket data from order
 */
/**
 * Customer dietary info for production ticket
 */
interface CustomerDietaryInfo {
  hasGlutenIntolerance?: boolean;
  hasLactoseIntolerance?: boolean;
  dietaryRestrictions?: string[];
  allergyNotes?: string | null;
}

function prepareProductionData(
  order: Order,
  items?: ProductionItem[]
): ProductionTicketData {
  const orderItems = items || (order.items || []) as ProductionItem[];
  
  return {
    orderId: order.id,
    orderNumber: (order as any).order_number || order.id.slice(0, 8).toUpperCase(),
    origin: extractOrderOrigin(order as any),
    createdAt: order.created_at,
    items: orderItems.map(item => ({
      quantity: item.quantity,
      product_name: item.product_name,
    })),
    customerName: order.customer_name,
    notes: (order as any).notes,
  };
}

/**
 * Build dietary alert section for production ticket
 */
function buildDietaryAlertHTML(dietary: CustomerDietaryInfo): string {
  const alerts: string[] = [];
  
  if (dietary.hasGlutenIntolerance) alerts.push('SEM GLÚTEN');
  if (dietary.hasLactoseIntolerance) alerts.push('SEM LACTOSE');
  if (dietary.dietaryRestrictions?.length) {
    alerts.push(...dietary.dietaryRestrictions.map(r => r.toUpperCase()));
  }
  
  if (alerts.length === 0 && !dietary.allergyNotes) return '';
  
  return `
    <div class="dietary-alert">
      <div class="dietary-title">⚠️ RESTRIÇÕES ALIMENTARES ⚠️</div>
      ${alerts.length > 0 ? `<div class="dietary-list">${alerts.join(' • ')}</div>` : ''}
      ${dietary.allergyNotes ? `<div class="dietary-notes">ALERGIAS: ${dietary.allergyNotes.toUpperCase()}</div>` : ''}
    </div>
  `;
}

/**
 * Build dietary alert section for text-based production ticket
 */
function buildDietaryAlertText(dietary: CustomerDietaryInfo): string[] {
  const lines: string[] = [];
  const alerts: string[] = [];
  
  if (dietary.hasGlutenIntolerance) alerts.push('SEM GLUTEN');
  if (dietary.hasLactoseIntolerance) alerts.push('SEM LACTOSE');
  if (dietary.dietaryRestrictions?.length) {
    alerts.push(...dietary.dietaryRestrictions.map(r => r.toUpperCase()));
  }
  
  if (alerts.length === 0 && !dietary.allergyNotes) return lines;
  
  lines.push('');
  lines.push('!!! RESTRICOES ALIMENTARES !!!');
  if (alerts.length > 0) {
    lines.push(alerts.join(' | '));
  }
  if (dietary.allergyNotes) {
    lines.push(`ALERGIAS: ${dietary.allergyNotes.toUpperCase()}`);
  }
  lines.push('');
  
  return lines;
}

/**
 * Validate production ticket before generating
 * Returns null if invalid, with errors logged
 */
export function validateBeforePrint(order: Order, items?: ProductionItem[]): ValidationResult {
  const data = prepareProductionData(order, items);
  const result = validateProductionTicket(data);
  
  if (!result.valid) {
    logValidationFailure('production', order.id, result);
  }
  
  return result;
}

/**
 * Generate HTML production ticket following exact specifications
 * NO SECTOR NAME in header - only ORIGIN
 */
export function generateProductionTicketHTML(
  order: Order,
  items?: ProductionItem[],
  companyName?: string,
  dietaryInfo?: CustomerDietaryInfo
): string {
  // Validate first
  const validation = validateBeforePrint(order, items);
  if (!validation.valid) {
    return generateErrorTicketHTML(order.id, validation);
  }

  // Extract origin label (NEVER sector name)
  const originLabel = extractOrderOrigin(order as any);

  // Get order number
  const orderNumber = (order as any).order_number
    ? String((order as any).order_number)
    : order.id.slice(0, 8).toUpperCase();

  // Get customer name
  const customerName = (order.customer_name || 'CLIENTE').toUpperCase();

  // Get date/time - format: YYYY-MM-DD - hora HH:MM
  const orderDate = format(new Date(order.created_at), 'yyyy-MM-dd', { locale: ptBR });
  const orderTime = format(new Date(order.created_at), 'HH:mm', { locale: ptBR });

  // Consume mode
  const eatHere = (order as any).eat_here ?? (order as any).eat_in;
  const consumeMode = eatHere === true ? 'COMER AQUI' : eatHere === false ? 'LEVAR' : '';

  // Build items
  const orderItems = items || (order.items || []) as ProductionItem[];
  const totalItems = orderItems.length;

  const itemsHtml = orderItems.map(item => {
    const childLines = buildItemChildLines({
      selectedOptionsJson: item.selected_options_json,
      notes: item.notes,
      childMaxLen: LINE_WIDTH - INDENT.length,
    });

    const childHtml = childLines.map(line =>
      `<div class="item-child">${INDENT}${line.toUpperCase()}</div>`
    ).join('');

    return `
      <div class="item">
        <div class="item-main">${item.quantity} X ${item.product_name.toUpperCase()}</div>
        ${childHtml}
      </div>
    `;
  }).join('');

  // General notes
  const generalNotes = (order as any).notes;
  const notesHtml = generalNotes 
    ? `<div class="general-obs">
        <div class="obs-title">⚠️ OBSERVAÇÃO DO PEDIDO</div>
        <div class="obs-content">${String(generalNotes).toUpperCase()}</div>
      </div>` 
    : '';

  // Consume mode badge
  const consumeModeHtml = consumeMode
    ? `<div class="consume-mode">${consumeMode}</div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Produção - Pedido #${orderNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', Courier, monospace; 
      font-size: 12px; 
      width: 80mm;
      max-width: 80mm;
      padding: 2mm;
      line-height: 1.2;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .company-name {
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      padding: 4px;
    }
    
    .header-origin {
      background: #000;
      color: #fff;
      font-size: 16px;
      font-weight: 900;
      text-align: center;
      padding: 12px 4px;
      margin: 4px 0;
      letter-spacing: 1px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .separator-dashed {
      font-family: 'Courier New', monospace;
      text-align: center;
      color: #000;
      margin: 4px 0;
      font-size: 12px;
    }
    
    .separator-double {
      font-family: 'Courier New', monospace;
      text-align: center;
      color: #000;
      margin: 4px 0;
      font-size: 12px;
    }
    
    .order-info {
      font-size: 12px;
      margin: 2px 0;
      font-family: 'Courier New', monospace;
    }
    
    .order-info .value {
      font-weight: bold;
    }
    
    .order-number-box {
      background: #000;
      color: #fff;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      padding: 10px;
      margin: 6px 0;
      letter-spacing: 2px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .items-title {
      font-size: 14px;
      font-weight: bold;
      margin: 6px 0 4px 0;
      font-family: 'Courier New', monospace;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
    }
    
    .item {
      margin: 8px 0;
    }
    
    .item-main {
      font-size: 14px;
      font-weight: bold;
      font-family: 'Courier New', monospace;
    }
    
    .item-child {
      font-size: 12px;
      font-family: 'Courier New', monospace;
      white-space: pre;
      margin: 1px 0;
    }
    
    .general-obs {
      margin: 8px 0;
    }
    
    .obs-title {
      background: #000;
      color: #fff;
      font-size: 12px;
      font-weight: bold;
      text-align: center;
      padding: 4px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .obs-content {
      background: #000;
      color: #fff;
      font-size: 14px;
      font-weight: bold;
      padding: 8px;
      margin-top: 2px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .consume-mode {
      background: #000;
      color: #fff;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      padding: 12px 4px;
      margin: 8px 0;
      letter-spacing: 2px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .footer {
      text-align: center;
      margin-top: 6px;
      font-family: 'Courier New', monospace;
    }
    
    .item-count {
      font-size: 14px;
      font-weight: bold;
      margin: 4px 0;
    }
    
    .ticket-type {
      font-size: 12px;
      margin: 4px 0;
      color: #666;
    }
    
    .website {
      font-size: 11px;
      margin-top: 4px;
    }
    
    .dietary-alert {
      background: #ff0000;
      color: #fff;
      margin: 8px 0;
      padding: 8px;
      border: 3px dashed #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .dietary-title {
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 4px;
    }
    
    .dietary-list {
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1px;
    }
    
    .dietary-notes {
      font-size: 12px;
      text-align: center;
      margin-top: 4px;
    }
    
    @media print { 
      body { width: 100%; max-width: 80mm; } 
    }
  </style>
</head>
<body>
  ${companyName ? `<div class="company-name">${companyName.toUpperCase()}</div>` : ''}
  
  <!-- ORIGEM DO PEDIDO - DESTAQUE PRINCIPAL -->
  <div class="header-origin">★★★ ${originLabel} ★★★</div>
  
  <!-- NÚMERO DO PEDIDO -->
  <div class="order-number-box">PEDIDO #${orderNumber}</div>
  
  <div class="separator-dashed">${SEPARATOR_DASHED}</div>
  
  <div class="order-info">Cliente: <span class="value">${customerName}</span></div>
  <div class="order-info">Data: ${orderDate} - Hora: ${orderTime}</div>
  
  <div class="separator-dashed">${SEPARATOR_DASHED}</div>
  
  <div class="items-title">ITENS</div>
  
  <div class="items-section">
    ${itemsHtml}
  </div>
  
  <div class="separator-dashed">${SEPARATOR_DASHED}</div>
  
  ${dietaryInfo ? buildDietaryAlertHTML(dietaryInfo) : ''}
  
  ${notesHtml}
  
  ${consumeModeHtml}
  
  <div class="separator-double">${SEPARATOR_DOUBLE}</div>
  
  <div class="footer">
    <div class="item-count">Qtd itens: ${totalItems}</div>
    <div class="ticket-type">PRODUÇÃO</div>
    <div class="website">www.zoopi.app.br</div>
  </div>
</body>
</html>`;
}

/**
 * Generate error ticket when validation fails
 */
function generateErrorTicketHTML(orderId: string, validation: ValidationResult): string {
  const errorList = validation.errors.map(e => `<li>${e}</li>`).join('');
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Erro de Impressão</title>
  <style>
    body { font-family: 'Courier New', monospace; padding: 10px; max-width: 80mm; }
    .error-title { background: #f00; color: #fff; padding: 10px; text-align: center; font-weight: bold; }
    .error-list { margin: 10px 0; padding-left: 20px; }
    .order-id { font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <div class="error-title">⚠️ IMPRESSÃO BLOQUEADA</div>
  <p>Dados obrigatórios faltando:</p>
  <ul class="error-list">${errorList}</ul>
  <p class="order-id">Pedido: ${orderId}</p>
</body>
</html>`;
}

/**
 * Generate plain text production ticket (48 columns, monospace)
 * For network printers using raw text
 */
export function generateProductionTicketText(
  order: Order,
  items?: ProductionItem[],
  companyName?: string,
  dietaryInfo?: CustomerDietaryInfo
): string | null {
  // Validate first
  const validation = validateBeforePrint(order, items);
  if (!validation.valid) {
    console.error('[ProductionTicket] Impressão bloqueada:', formatValidationErrors(validation));
    return null;
  }

  const lines: string[] = [];
  
  // Extract origin (NEVER sector)
  const originLabel = extractOrderOrigin(order as any);

  // Get order number
  const orderNumber = (order as any).order_number
    ? String((order as any).order_number)
    : order.id.slice(0, 8).toUpperCase();

  // Get customer name
  const customerName = (order.customer_name || 'CLIENTE').toUpperCase();

  // Get date/time
  const orderDate = format(new Date(order.created_at), 'yyyy-MM-dd', { locale: ptBR });
  const orderTime = format(new Date(order.created_at), 'HH:mm', { locale: ptBR });

  // ============ HEADER =========
  if (companyName) {
    lines.push(centerText(companyName.toUpperCase()));
  }
  lines.push('');
  lines.push(centerText(`*** ${originLabel} ***`));
  lines.push('');
  lines.push(centerText(`PEDIDO #${orderNumber}`));
  lines.push('');

  lines.push(SEPARATOR_DASHED);
  
  // ============ ORDER INFO ============
  lines.push(`Cliente: ${customerName}`);
  lines.push(`Data: ${orderDate} - Hora: ${orderTime}`);
  
  lines.push(SEPARATOR_DASHED);
  
  // ============ ITEMS ============
  lines.push('ITENS');
  lines.push('');
  
  const orderItems = items || (order.items || []) as ProductionItem[];
  let totalItems = 0;
  
  orderItems.forEach((item) => {
    totalItems++;
    
    const itemLine = `${item.quantity} X ${item.product_name.toUpperCase()}`;
    lines.push(truncateEllipsis(itemLine, LINE_WIDTH));
    
    const childLines = buildItemChildLines({
      selectedOptionsJson: item.selected_options_json,
      notes: item.notes,
      childMaxLen: LINE_WIDTH - INDENT.length,
    });
    
    childLines.forEach(line => {
      lines.push(`${INDENT}${line.toUpperCase()}`);
    });
    
    lines.push('');
  });
  
  lines.push(SEPARATOR_DASHED);
  
  // ============ DIETARY RESTRICTIONS ============
  if (dietaryInfo) {
    const dietaryLines = buildDietaryAlertText(dietaryInfo);
    lines.push(...dietaryLines);
    if (dietaryLines.length > 0) {
      lines.push(SEPARATOR_DASHED);
    }
  }
  
  // ============ GENERAL NOTES =========
  const generalNotes = (order as any).notes;
  if (generalNotes) {
    lines.push('*** OBSERVAÇÃO DO PEDIDO ***');
    lines.push(truncateEllipsis(String(generalNotes).toUpperCase(), LINE_WIDTH));
    lines.push(SEPARATOR_DASHED);
  }
  
  // ============ CONSUME MODE ============
  const eatHere = (order as any).eat_here ?? (order as any).eat_in;
  const consumeMode = eatHere === true ? 'COMER AQUI' : eatHere === false ? 'LEVAR' : '';
  if (consumeMode) {
    lines.push('');
    lines.push(centerText(`*** ${consumeMode} ***`));
    lines.push('');
  }
  
  lines.push(SEPARATOR_DOUBLE);
  
  // ============ FOOTER ============
  lines.push(`Qtd itens: ${totalItems}`);
  lines.push(centerText('PRODUCAO'));
  lines.push('');
  lines.push(centerText('www.zoopi.app.br'));
  
  return lines.join('\n');
}

/**
 * Print production ticket via browser
 */
export function printProductionTicket(
  order: Order,
  items?: ProductionItem[],
  companyName?: string,
  dietaryInfo?: CustomerDietaryInfo
): boolean {
  // Validate first
  const validation = validateBeforePrint(order, items);
  if (!validation.valid) {
    console.error('[ProductionTicket] Impressão bloqueada:', formatValidationErrors(validation));
    return false;
  }

  const html = generateProductionTicketHTML(order, items, companyName, dietaryInfo);
  const printWindow = window.open('', '_blank', 'width=350,height=700');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    return true;
  }
  return false;
}
