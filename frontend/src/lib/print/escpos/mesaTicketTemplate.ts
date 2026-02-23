/**
 * Mesa/Table Ticket Template for 80mm Thermal Printers
 * 
 * VIA ENTREGADOR / EXPEDIÇÃO
 * 
 * Uses the ESC/POS driver with H2/H3/H4 styles and CODE128 barcode.
 * 
 * Profile: 80mm / 48 columns / Font A
 * 
 * LAYOUT:
 * - H2: MESA X (bold, centered)
 * - H2: PEDIDO N° XXX (bold, centered)
 * - H3: CLIENTE + info
 * - H2: OBS: COMANDA X
 * - H2: ITENS
 * - Item list with prices aligned right
 * - H3: SUBTOTAL
 * - H2: TOTAL (bold, single line)
 * - Troco (inverted H3, if applicable)
 * - H2: PAGAMENTO
 * - CODE128 barcode with ORDER:<id>
 * - H4: Footer
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ESCPOS, LINE } from './commands';
import {
  reset,
  h2,
  h3,
  h4,
  separator,
  wrapText,
  lineKeyValue,
  formatCurrency,
} from './styles';
import {
  printCode128,
  getOrderBarcodePayload,
  logBarcodeGeneration,
} from './barcode';

/**
 * Mesa ticket data structure
 */
export interface MesaTicketData {
  // Order identification
  orderId: string;
  orderNumber?: string | number | null;
  
  // Table/Comanda info
  tableNumber?: number | null;
  tableName?: string | null;
  comandaNumber?: number | null;
  
  // Customer info
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  
  // Items
  items: Array<{
    quantity: number;
    productName: string;
    unitPriceCents: number;
    totalPriceCents: number;
    notes?: string | null;
    additionals?: string[] | null;
  }>;
  
  // Totals (in cents)
  subtotalCents: number;
  deliveryFeeCents?: number | null;
  discountCents?: number | null;
  totalCents: number;
  
  // Payment
  paymentMethod?: string | null;
  changeForCents?: number | null;
  
  // Timestamps
  createdAt: string;
  
  // Company info
  companyName?: string | null;
}

/**
 * Validation result for mesa ticket
 */
export interface MesaTicketValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validate mesa ticket data before printing
 */
export function validateMesaTicket(data: MesaTicketData): MesaTicketValidation {
  const errors: string[] = [];
  
  if (!data.orderId) {
    errors.push('ID do pedido ausente - não é possível gerar código de barras');
  }
  
  if (!data.items || data.items.length === 0) {
    errors.push('Pedido sem itens');
  }
  
  if (data.totalCents === undefined || data.totalCents === null) {
    errors.push('Total do pedido ausente');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Normalize payment method label
 */
function normalizePaymentMethod(method: string | null | undefined): string {
  if (!method) return 'Não informado';
  
  const normalized = method.toLowerCase().trim();
  const labels: Record<string, string> = {
    'pix': 'PIX',
    'credit': 'CARTAO CREDITO',
    'debit': 'CARTAO DEBITO',
    'cash': 'DINHEIRO',
    'money': 'DINHEIRO',
    'dinheiro': 'DINHEIRO',
    'cartao': 'CARTAO',
    'cartao_credito': 'CARTAO CREDITO',
    'cartao_debito': 'CARTAO DEBITO',
    'credit_card': 'CARTAO CREDITO',
    'debit_card': 'CARTAO DEBITO',
    'voucher': 'VALE REFEICAO',
    'ifood': 'PAGO VIA IFOOD',
    'app': 'PAGO VIA APP',
  };
  
  return labels[normalized] || method.toUpperCase();
}

/**
 * Build the Mesa ticket using ESC/POS driver
 * Returns raw ESC/POS bytes ready for agent queue
 */
export function buildMesaTicketEscPos(data: MesaTicketData): string {
  // Validate first
  const validation = validateMesaTicket(data);
  if (!validation.valid) {
    console.error('[mesaTicket] Validation failed:', validation.errors);
    throw new Error(validation.errors.join('; '));
  }
  
  const LINE_WIDTH = LINE.WIDTH;
  
  // Format helpers
  const orderNum = data.orderNumber 
    ? String(data.orderNumber).padStart(3, '0')
    : data.orderId.slice(0, 8).toUpperCase();
  
  const tableDisplay = data.tableNumber
    ? `MESA ${data.tableNumber}`
    : (data.tableName || 'MESA');
  
  const comandaDisplay = data.comandaNumber
    ? `COMANDA: ${data.comandaNumber}`
    : '';
  
  const printedAt = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  const createdAtFormatted = format(new Date(data.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  
  // Start building ticket
  let ticket = '';
  
  // === INIT ===
  ticket += reset();
  
  // === HEADER: MESA ===
  ticket += h2(tableDisplay, { center: true, doubleHeight: true });
  ticket += separator();
  
  // === HEADER: PEDIDO N° ===
  ticket += h2(`PEDIDO No ${orderNum}`, { center: true });
  ticket += separator();
  
  // === CLIENTE ===
  ticket += h3('CLIENTE', { center: false });
  
  // Customer name line
  const customerName = data.customerName || tableDisplay;
  let customerLine = `Nome: ${customerName.toUpperCase()}`;
  if (comandaDisplay) {
    customerLine += ` ${comandaDisplay}`;
  }
  
  // Wrap customer info if too long
  const customerLines = wrapText(customerLine, LINE_WIDTH);
  for (const line of customerLines) {
    ticket += line + ESCPOS.LF;
  }
  
  // Address if present
  if (data.customerAddress) {
    const addrLines = wrapText(`End: ${data.customerAddress}`, LINE_WIDTH);
    for (const line of addrLines) {
      ticket += line + ESCPOS.LF;
    }
  }
  
  // Phone if present
  if (data.customerPhone) {
    ticket += `Tel: ${data.customerPhone}` + ESCPOS.LF;
  }
  
  ticket += separator();
  
  // === OBS: COMANDA ===
  if (data.comandaNumber) {
    ticket += h2(`OBS: COMANDA ${data.comandaNumber}`, { center: false });
    ticket += separator();
  }
  
  // === ITENS ===
  ticket += h2('ITENS', { center: false });
  ticket += separator();
  
  // Group identical items by productName + notes
  const groupedItems = new Map<string, typeof data.items[0] & { quantity: number; totalPriceCents: number }>();
  for (const item of data.items) {
    const key = `${item.productName}|||${item.notes || ''}|||${(item.additionals || []).join(',')}`;
    const existing = groupedItems.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      existing.totalPriceCents += item.totalPriceCents;
    } else {
      groupedItems.set(key, { ...item, totalPriceCents: item.totalPriceCents });
    }
  }
  
  // Print each grouped item
  for (const item of groupedItems.values()) {
    const qtyStr = `${item.quantity}x`;
    const priceStr = formatCurrency(item.totalPriceCents);
    
    // Calculate available width for product name
    // Format: "Nx NOME..................... R$ XX,XX"
    const priceWidth = priceStr.length;
    const qtyWidth = qtyStr.length + 1; // +1 for space
    const nameMaxWidth = LINE_WIDTH - qtyWidth - priceWidth - 1;
    
    const nameLines = wrapText(item.productName.toUpperCase(), nameMaxWidth);
    
    if (nameLines.length === 0) {
      // Empty name fallback
      ticket += lineKeyValue(qtyStr, priceStr, LINE_WIDTH);
    } else if (nameLines.length === 1) {
      // Single line: qty + name + price aligned
      const namePart = `${qtyStr} ${nameLines[0]}`;
      const padding = LINE_WIDTH - namePart.length - priceWidth;
      ticket += namePart + ' '.repeat(Math.max(1, padding)) + priceStr + ESCPOS.LF;
    } else {
      // Multi-line: first lines without price, last with price
      for (let i = 0; i < nameLines.length - 1; i++) {
        ticket += `${i === 0 ? qtyStr : ' '.repeat(qtyWidth - 1)} ${nameLines[i]}` + ESCPOS.LF;
      }
      // Last line with price
      const lastLine = `${' '.repeat(qtyWidth - 1)} ${nameLines[nameLines.length - 1]}`;
      const padding = LINE_WIDTH - lastLine.length - priceWidth;
      ticket += lastLine + ' '.repeat(Math.max(1, padding)) + priceStr + ESCPOS.LF;
    }
    
    // Print notes/observations in H4
    if (item.notes) {
      const noteLines = wrapText(`OBS: ${item.notes}`, LINE_WIDTH - 3);
      for (const line of noteLines) {
        ticket += `   ${line}` + ESCPOS.LF;
      }
    }
    
    // Print additionals
    if (item.additionals && item.additionals.length > 0) {
      for (const add of item.additionals) {
        const addLines = wrapText(`+ ${add}`, LINE_WIDTH - 3);
        for (const line of addLines) {
          ticket += `   ${line}` + ESCPOS.LF;
        }
      }
    }
  }
  
  ticket += separator();
  
  // === SUBTOTAL ===
  ticket += ESCPOS.SIZE_NORMAL;
  ticket += ESCPOS.ALIGN_LEFT;
  ticket += ESCPOS.BOLD_ON;
  ticket += lineKeyValue('SUBTOTAL:', formatCurrency(data.subtotalCents), LINE_WIDTH);
  ticket += ESCPOS.BOLD_OFF;

  // Delivery fee if present
  if (data.deliveryFeeCents && data.deliveryFeeCents > 0) {
    ticket += lineKeyValue('TAXA ENTREGA:', formatCurrency(data.deliveryFeeCents), LINE_WIDTH);
  }

  // Discount if present
  if (data.discountCents && data.discountCents > 0) {
    ticket += lineKeyValue('DESCONTO:', `-${formatCurrency(data.discountCents)}`, LINE_WIDTH);
  }

  ticket += separator();

  // === TOTAL (H2-like: bold, MUST be single line, no size expand) ===
  ticket += ESCPOS.SIZE_NORMAL;
  ticket += ESCPOS.ALIGN_LEFT;
  ticket += ESCPOS.BOLD_ON;
  ticket += lineKeyValue('TOTAL:', formatCurrency(data.totalCents), LINE_WIDTH);
  ticket += ESCPOS.BOLD_OFF;

  ticket += separator();
  
  // === TROCO (inverted H3, only if applicable) ===
  if (data.changeForCents && data.changeForCents > data.totalCents) {
    const trocoValue = data.changeForCents - data.totalCents;
    
    ticket += ESCPOS.INVERT_ON;
    ticket += ESCPOS.BOLD_ON;
    ticket += lineKeyValue('TROCO:', formatCurrency(trocoValue), LINE_WIDTH);
    ticket += ESCPOS.BOLD_OFF;
    ticket += ESCPOS.INVERT_OFF;
    
    ticket += separator();
  }
  
  // === PAGAMENTO ===
  const paymentLabel = normalizePaymentMethod(data.paymentMethod);
  ticket += h2(`PAGAMENTO: ${paymentLabel}`, { center: false });
  
  ticket += separator();
  
  // === BARCODE ===
  ticket += h4('ESCANEIE PARA EXPEDICAO', { center: true });
  
  // Generate barcode
  const barcodePayload = getOrderBarcodePayload(data.orderId);
  const barcodeResult = printCode128(barcodePayload, {
    height: 80,
    width: 2,
    showHRI: true,
    center: true,
  });
  
  logBarcodeGeneration(barcodeResult, {
    orderId: data.orderId,
    orderNumber: orderNum,
  });
  
  if (!barcodePayload) {
    throw new Error('Impressão bloqueada: não foi possível gerar código de barras');
  }

  if (barcodeResult.success && barcodeResult.data) {
    ticket += barcodeResult.data;
  } else {
    throw new Error(barcodeResult.error || 'Impressão bloqueada: não foi possível gerar código de barras');
  }
  
  // Print payload text below barcode
  ticket += h4(barcodePayload, { center: true });
  
  ticket += separator();
  
  // === FOOTER ===
  ticket += ESCPOS.ALIGN_CENTER;
  ticket += h4('VIA ENTREGADOR / EXPEDICAO', { center: true });
  ticket += h4(`Impresso: ${printedAt}`, { center: true });
  ticket += h4('www.zoopi.app.br', { center: true });
  
  // === FINAL RESET ===
  ticket += reset();
  
  // Cut paper (if supported)
  ticket += ESCPOS.LF + ESCPOS.LF + ESCPOS.LF;
  ticket += ESCPOS.CUT;
  
  // Log ticket info
  console.log('[mesaTicket] Generated ticket:', {
    orderId: data.orderId,
    orderNumber: orderNum,
    tableNumber: data.tableNumber,
    comandaNumber: data.comandaNumber,
    itemCount: data.items.length,
    total: formatCurrency(data.totalCents),
    barcodePayload,
    barcodeMethod: barcodeResult.method,
    ticketBytes: ticket.length,
    printerProfile: '80mm / 48 columns',
  });
  
  return ticket;
}

/**
 * Create mesa ticket metadata for print queue
 */
export function createMesaTicketMetadata(data: MesaTicketData): Record<string, any> {
  const escPosData = buildMesaTicketEscPos(data);
  
  return {
    ticketType: 'mesa_expedição',
    template: 'mesa_entregador',
    orderId: data.orderId,
    orderNumber: data.orderNumber,
    tableNumber: data.tableNumber,
    comandaNumber: data.comandaNumber,
    barcodePayload: getOrderBarcodePayload(data.orderId),
    rawEscPos: escPosData,
    printerProfile: {
      width: '80mm',
      columns: 48,
      font: 'A',
    },
  };
}
