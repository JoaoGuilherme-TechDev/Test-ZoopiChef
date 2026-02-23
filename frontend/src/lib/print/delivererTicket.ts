/**
 * Deliverer Complete Ticket Generator for 80mm Thermal Printers
 * 
 * VIA COMPLETA DO ENTREGADOR / EXPEDIÇÃO
 * 
 * LAYOUT PADRONIZADO:
 * - Cabeçalho: Nome do estabelecimento, Nº pedido, Data/hora, Origem
 * - Cliente: Nome, telefone, endereço completo
 * - Itens: Lista detalhada com observações e adicionais
 * - Totais: Subtotal, taxas, desconto, total
 * - Pagamento: Forma de pagamento, troco
 * - CÓDIGO DE BARRAS: Identificador único para scanner de expedição
 * 
 * REGRAS:
 * - OBRIGATÓRIO para pedidos delivery/expedição
 * - Código de barras Code128 com ORDER:<order_id>
 * - Validar dados obrigatórios antes de imprimir
 */

import { Order } from '@/hooks/useOrders';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildItemChildLines, truncateEllipsis } from '@/lib/receiptFormatting';
import { extractOrderOrigin } from './ticketValidation';

const LINE_WIDTH = 48;
const SEPARATOR_DASHED = '-'.repeat(LINE_WIDTH);
const SEPARATOR_DOUBLE = '='.repeat(LINE_WIDTH);
const INDENT = '      '; // 6 spaces for child items

export interface DelivererTicketData {
  orderId: string;
  orderNumber?: string | number | null;
  origin: string;
  createdAt: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  items: Array<{
    quantity: number;
    product_name: string;
    unit_price: number;
    selected_options_json?: any;
    notes?: string | null;
  }>;
  subtotal: number;
  deliveryFee?: number | null;
  discount?: number | null;
  total: number;
  paymentMethod?: string | null;
  changeFor?: number | null;
  notes?: string | null;
}

export interface DelivererValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Check if order needs expedition (deliverer ticket)
 */
export function needsExpeditionTicket(order: any): boolean {
  const orderType = String(order.order_type || '').toLowerCase();
  const fulfillmentType = String(order.fulfillment_type || '').toLowerCase();
  const source = String(order.source || '').toLowerCase();
  
  // Delivery orders always need expedition
  if (orderType === 'delivery' || fulfillmentType === 'delivery') {
    return true;
  }
  
  // Pickup orders need expedition
  if (orderType === 'pickup' || fulfillmentType === 'pickup' || orderType === 'local') {
    return true;
  }
  
  // Integration orders (iFood, Rappi, etc.) always need expedition
  if (['ifood', 'rappi', 'uber_eats', 'ubereats', '99food'].includes(source)) {
    return true;
  }
  
  // WhatsApp orders typically need expedition
  if (source === 'whatsapp') {
    return true;
  }
  
  // Counter orders with "take away" need expedition
  if (orderType === 'counter' && order.eat_here === false) {
    return true;
  }
  
  // Table/mesa orders DO NOT need expedition (unless explicitly configured)
  if (orderType === 'table' || orderType === 'dine_in' || order.table_number) {
    return false;
  }
  
  // Kiosk/totem with "levar" needs expedition
  if ((source === 'kiosk' || source === 'totem') && order.eat_here === false) {
    return true;
  }
  
  return false;
}

/**
 * Validate deliverer ticket data
 * Required: order ID, barcode identifier, items (min 1)
 * For delivery: address (at minimum street)
 */
export function validateDelivererTicket(data: DelivererTicketData): DelivererValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: Order ID (for barcode)
  if (!data.orderId) {
    errors.push('ID do pedido ausente - não é possível gerar código de barras');
  }

  // Required: Created at (date/time)
  if (!data.createdAt) {
    errors.push('Data/hora do pedido ausente');
  }

  // Required: Items (minimum 1)
  if (!data.items || data.items.length === 0) {
    errors.push('Pedido sem itens');
  } else {
    data.items.forEach((item, index) => {
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: quantidade inválida`);
      }
      if (!item.product_name || item.product_name.trim() === '') {
        errors.push(`Item ${index + 1}: nome do produto ausente`);
      }
    });
  }

  // Required: Total
  if (data.total === undefined || data.total === null) {
    errors.push('Total do pedido ausente');
  }

  // Warnings (non-blocking)
  if (!data.origin || data.origin.trim() === '' || data.origin === 'ORIGEM NÃO IDENTIFICADA') {
    warnings.push('Origem do pedido não identificada');
  }
  if (!data.customerName) {
    warnings.push('Nome do cliente não informado');
  }
  if (!data.customerPhone) {
    warnings.push('Telefone do cliente não informado');
  }
  if (!data.customerAddress) {
    warnings.push('Endereço de entrega não informado');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get barcode value for order
 * Format: ORDER:<order_id first 8 chars>
 */
export function getBarcodeValue(orderId: string): string {
  // Use first 8 chars of UUID for shorter barcode
  const shortId = orderId.slice(0, 8).toUpperCase();
  return `ORDER:${shortId}`;
}

/**
 * Generate SVG barcode for Code128
 * This is a simplified Code128B implementation
 */
function generateBarcodePatterns(text: string): string {
  // Code128B character set patterns (bars and spaces)
  const CODE128_PATTERNS: Record<string, string> = {
    ' ': '11011001100', '!': '11001101100', '"': '11001100110', '#': '10010011000',
    '$': '10010001100', '%': '10001001100', '&': '10011001000', "'": '10011000100',
    '(': '10001100100', ')': '11001001000', '*': '11001000100', '+': '11000100100',
    ',': '10110011100', '-': '10011011100', '.': '10011001110', '/': '10111001100',
    '0': '10011101100', '1': '10011100110', '2': '11001110010', '3': '11001011100',
    '4': '11001001110', '5': '11011100100', '6': '11001110100', '7': '11101101110',
    '8': '11101001100', '9': '11100101100', ':': '11100100110', ';': '11101100100',
    '<': '11100110100', '=': '11100110010', '>': '11011011000', '?': '11011000110',
    '@': '11000110110', 'A': '10100011000', 'B': '10001011000', 'C': '10001000110',
    'D': '10110001000', 'E': '10001101000', 'F': '10001100010', 'G': '11010001000',
    'H': '11000101000', 'I': '11000100010', 'J': '10110111000', 'K': '10110001110',
    'L': '10001101110', 'M': '10111011000', 'N': '10111000110', 'O': '10001110110',
    'P': '11101110110', 'Q': '11010001110', 'R': '11000101110', 'S': '11011101000',
    'T': '11011100010', 'U': '11011101110', 'V': '11101011000', 'W': '11101000110',
    'X': '11100010110', 'Y': '11101101000', 'Z': '11101100010',
  };
  
  const START_B = '11010010000';
  const STOP = '1100011101011';
  
  let pattern = START_B;
  let checksum = 104; // Start B value
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charPattern = CODE128_PATTERNS[char];
    if (charPattern) {
      pattern += charPattern;
      checksum += (char.charCodeAt(0) - 32) * (i + 1);
    }
  }
  
  // Add checksum
  const checksumValue = checksum % 103;
  const checksumChar = String.fromCharCode(checksumValue + 32);
  pattern += CODE128_PATTERNS[checksumChar] || CODE128_PATTERNS[' '];
  
  pattern += STOP;
  
  return pattern;
}

/**
 * Generate SVG barcode element
 */
function generateBarcodeSVG(text: string, width: number = 200, height: number = 50): string {
  const pattern = generateBarcodePatterns(text);
  const barWidth = width / pattern.length;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  
  let x = 0;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      svg += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="black"/>`;
    }
    x += barWidth;
  }
  
  svg += '</svg>';
  return svg;
}

/**
 * Center text within LINE_WIDTH
 */
function centerText(text: string, width: number = LINE_WIDTH): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Format currency in BRL
 */
function formatCurrency(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

/**
 * Normalize payment method label
 */
function normalizePaymentMethod(method: string | null | undefined): string {
  if (!method) return 'Não informado';
  
  const normalized = method.toLowerCase().trim();
  const labels: Record<string, string> = {
    'pix': 'PIX',
    'credit': 'Cartão de Crédito',
    'debit': 'Cartão de Débito',
    'cash': 'Dinheiro',
    'money': 'Dinheiro',
    'dinheiro': 'Dinheiro',
    'cartao': 'Cartão',
    'cartao_credito': 'Cartão de Crédito',
    'cartao_debito': 'Cartão de Débito',
    'credit_card': 'Cartão de Crédito',
    'debit_card': 'Cartão de Débito',
    'voucher': 'Vale Refeição',
    'ifood': 'Pago via iFood',
    'app': 'Pago via App',
  };
  
  return labels[normalized] || method;
}

/**
 * Generate HTML deliverer ticket with barcode
 */
export function generateDelivererTicketHTML(
  order: Order & {
    order_type?: string;
    source?: string | null;
    table_number?: number | null;
    command_number?: number | null;
    eat_here?: boolean | null;
    eat_in?: boolean | null;
    integration_order_id?: string | null;
    payment_method?: string | null;
    change_for?: number | null;
    delivery_fee?: number | null;
    discount?: number | null;
    notes?: string | null;
    subtotal?: number | null;
  },
  companyName?: string,
  companyAddress?: string
): string {
  // Prepare data
  const data: DelivererTicketData = {
    orderId: order.id,
    orderNumber: (order as any).order_number || order.id.slice(0, 8).toUpperCase(),
    origin: extractOrderOrigin(order as any),
    createdAt: order.created_at,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerAddress: order.customer_address,
    items: ((order.items || []) as any[]).map(item => ({
      quantity: item.quantity,
      product_name: item.product_name,
      unit_price: item.unit_price || 0,
      selected_options_json: item.selected_options_json,
      notes: item.notes,
    })),
    subtotal: order.subtotal ?? order.total ?? 0,
    deliveryFee: order.delivery_fee,
    discount: order.discount,
    total: order.total,
    paymentMethod: order.payment_method,
    changeFor: order.change_for,
    notes: order.notes,
  };

  // Validate
  const validation = validateDelivererTicket(data);
  if (!validation.valid) {
    return generateErrorTicketHTML(order.id, validation);
  }

  // Generate barcode
  const barcodeValue = getBarcodeValue(order.id);
  const barcodeSVG = generateBarcodeSVG(barcodeValue, 200, 40);

  // Format data
  const orderNumber = String(data.orderNumber);
  const customerName = (data.customerName || 'CLIENTE').toUpperCase();
  const orderDate = format(new Date(data.createdAt), 'dd/MM/yyyy', { locale: ptBR });
  const orderTime = format(new Date(data.createdAt), 'HH:mm', { locale: ptBR });

  // Build items HTML
  const itemsHtml = data.items.map(item => {
    const childLines = buildItemChildLines({
      selectedOptionsJson: item.selected_options_json,
      notes: item.notes,
      childMaxLen: LINE_WIDTH - INDENT.length,
    });

    const childHtml = childLines.map(line =>
      `<div class="item-child">${INDENT}${line.toUpperCase()}</div>`
    ).join('');

    const itemTotal = item.quantity * item.unit_price;

    return `
      <div class="item">
        <div class="item-main">
          <span class="item-qty-name">${item.quantity}x ${item.product_name.toUpperCase()}</span>
          <span class="item-price">${formatCurrency(itemTotal)}</span>
        </div>
        ${childHtml}
      </div>
    `;
  }).join('');

  // Calculate totals
  const subtotal = data.subtotal || data.items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
  const deliveryFee = data.deliveryFee || 0;
  const discount = data.discount || 0;
  const total = data.total || (subtotal + deliveryFee - discount);
  
  // Change calculation
  const changeFor = data.changeFor || 0;
  const changeValue = changeFor > total ? changeFor - total : 0;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Via Entregador - Pedido #${orderNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', Courier, monospace; 
      font-size: 12px; 
      width: 80mm;
      max-width: 80mm;
      padding: 3mm;
      line-height: 1.3;
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
    
    .company-address {
      font-size: 10px;
      text-align: center;
      color: #333;
      margin-bottom: 4px;
    }
    
    .header-origin {
      background: #000;
      color: #fff;
      font-size: 14px;
      font-weight: 900;
      text-align: center;
      padding: 8px 4px;
      margin: 4px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .order-number-box {
      background: #000;
      color: #fff;
      font-size: 28px;
      font-weight: bold;
      text-align: center;
      padding: 12px;
      margin: 6px 0;
      letter-spacing: 2px;
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
      font-weight: bold;
    }
    
    .order-info {
      font-size: 12px;
      margin: 2px 0;
      font-family: 'Courier New', monospace;
    }
    
    .order-info .label {
      font-weight: normal;
    }
    
    .order-info .value {
      font-weight: bold;
    }
    
    .customer-section {
      margin: 8px 0;
      padding: 6px;
      border: 1px solid #000;
    }
    
    .customer-title {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 4px;
      border-bottom: 1px dashed #000;
      padding-bottom: 2px;
    }
    
    .customer-info {
      font-size: 12px;
      margin: 2px 0;
    }
    
    .address-section {
      background: #f0f0f0;
      padding: 6px;
      margin: 4px 0;
      border: 2px solid #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .address-title {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .address-content {
      font-size: 14px;
      font-weight: bold;
    }
    
    .items-title {
      font-size: 12px;
      font-weight: bold;
      margin: 6px 0 4px 0;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
    }
    
    .item {
      margin: 4px 0;
    }
    
    .item-main {
      font-size: 12px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
    }
    
    .item-child {
      font-size: 11px;
      white-space: pre;
      color: #333;
    }
    
    .totals-section {
      margin: 8px 0;
    }
    
    .total-line {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin: 2px 0;
    }
    
    .total-final {
      font-size: 16px;
      font-weight: bold;
      background: #000;
      color: #fff;
      padding: 6px;
      margin: 4px 0;
      display: flex;
      justify-content: space-between;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .payment-section {
      margin: 6px 0;
      padding: 6px;
      border: 1px solid #000;
    }
    
    .payment-title {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .payment-info {
      font-size: 14px;
      font-weight: bold;
    }
    
    .change-info {
      font-size: 14px;
      font-weight: bold;
      color: #000;
      background: #ffeb3b;
      padding: 4px;
      margin-top: 4px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .obs-section {
      margin: 6px 0;
      padding: 6px;
      background: #ffe0e0;
      border: 1px solid #c00;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .obs-title {
      font-size: 12px;
      font-weight: bold;
      color: #c00;
    }
    
    .obs-content {
      font-size: 12px;
      font-weight: bold;
    }
    
    .barcode-section {
      margin: 10px 0;
      text-align: center;
      padding: 8px;
      border: 2px dashed #000;
    }
    
    .barcode-title {
      font-size: 10px;
      margin-bottom: 4px;
      color: #666;
    }
    
    .barcode-svg {
      display: inline-block;
    }
    
    .barcode-text {
      font-size: 14px;
      font-weight: bold;
      font-family: 'Courier New', monospace;
      margin-top: 4px;
      letter-spacing: 2px;
    }
    
    .footer {
      text-align: center;
      margin-top: 8px;
      font-size: 11px;
    }
    
    .ticket-type {
      font-size: 14px;
      font-weight: bold;
      margin: 4px 0;
      background: #000;
      color: #fff;
      padding: 4px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    @media print { 
      body { width: 100%; max-width: 80mm; } 
    }
  </style>
</head>
<body>
  ${companyName ? `<div class="company-name">${companyName.toUpperCase()}</div>` : ''}
  ${companyAddress ? `<div class="company-address">${companyAddress}</div>` : ''}
  
  <!-- ORIGEM DO PEDIDO -->
  <div class="header-origin">★ ${data.origin} ★</div>
  
  <!-- NÚMERO DO PEDIDO -->
  <div class="order-number-box">#${orderNumber}</div>
  
  <div class="separator-dashed">${SEPARATOR_DASHED}</div>
  
  <div class="order-info">
    <span class="label">Data:</span> <span class="value">${orderDate}</span> | 
    <span class="label">Hora:</span> <span class="value">${orderTime}</span>
  </div>
  
  <!-- CLIENTE -->
  <div class="customer-section">
    <div class="customer-title">📞 CLIENTE</div>
    <div class="customer-info"><strong>Nome:</strong> ${customerName}</div>
    ${data.customerPhone ? `<div class="customer-info"><strong>Fone:</strong> ${data.customerPhone}</div>` : ''}
  </div>
  
  ${data.customerAddress ? `
  <!-- ENDEREÇO -->
  <div class="address-section">
    <div class="address-title">📍 ENDEREÇO DE ENTREGA</div>
    <div class="address-content">${data.customerAddress.toUpperCase()}</div>
  </div>
  ` : ''}
  
  <div class="separator-dashed">${SEPARATOR_DASHED}</div>
  
  <!-- ITENS -->
  <div class="items-title">ITENS DO PEDIDO</div>
  <div class="items-section">
    ${itemsHtml}
  </div>
  
  <div class="separator-dashed">${SEPARATOR_DASHED}</div>
  
  <!-- TOTAIS -->
  <div class="totals-section">
    <div class="total-line">
      <span>Subtotal:</span>
      <span>${formatCurrency(subtotal)}</span>
    </div>
    ${deliveryFee > 0 ? `
    <div class="total-line">
      <span>Taxa de entrega:</span>
      <span>${formatCurrency(deliveryFee)}</span>
    </div>
    ` : ''}
    ${discount > 0 ? `
    <div class="total-line">
      <span>Desconto:</span>
      <span>-${formatCurrency(discount)}</span>
    </div>
    ` : ''}
  </div>
  
  <div class="total-final">
    <span>TOTAL:</span>
    <span>${formatCurrency(total)}</span>
  </div>
  
  <!-- PAGAMENTO -->
  <div class="payment-section">
    <div class="payment-title">💳 PAGAMENTO</div>
    <div class="payment-info">${normalizePaymentMethod(data.paymentMethod)}</div>
    ${changeFor > 0 && changeValue > 0 ? `
    <div class="change-info">
      💵 TROCO PARA ${formatCurrency(changeFor)}: ${formatCurrency(changeValue)}
    </div>
    ` : ''}
  </div>
  
  ${data.notes ? `
  <!-- OBSERVAÇÕES -->
  <div class="obs-section">
    <div class="obs-title">⚠️ OBSERVAÇÃO</div>
    <div class="obs-content">${data.notes.toUpperCase()}</div>
  </div>
  ` : ''}
  
  <div class="separator-double">${SEPARATOR_DOUBLE}</div>
  
  <!-- CÓDIGO DE BARRAS -->
  <div class="barcode-section">
    <div class="barcode-title">ESCANEIE PARA EXPEDIÇÃO</div>
    <div class="barcode-svg">${barcodeSVG}</div>
    <div class="barcode-text">${barcodeValue}</div>
  </div>
  
  <div class="separator-double">${SEPARATOR_DOUBLE}</div>
  
  <div class="footer">
    <div class="ticket-type">VIA ENTREGADOR / EXPEDIÇÃO</div>
    <div>www.zoopi.app.br</div>
  </div>
</body>
</html>`;
}

/**
 * Generate error ticket when validation fails
 */
function generateErrorTicketHTML(orderId: string, validation: DelivererValidationResult): string {
  const errorList = validation.errors.map(e => `<li>${e}</li>`).join('');
  const warningList = validation.warnings.map(w => `<li style="color: orange;">${w}</li>`).join('');
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Erro - Via Entregador</title>
  <style>
    body { font-family: 'Courier New', monospace; padding: 10px; max-width: 80mm; }
    .error-title { background: #f00; color: #fff; padding: 10px; text-align: center; font-weight: bold; }
    .error-list { margin: 10px 0; padding-left: 20px; }
    .warning-title { background: #ff9800; color: #fff; padding: 6px; text-align: center; font-weight: bold; margin-top: 10px; }
    .order-id { font-size: 10px; color: #666; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="error-title">⚠️ IMPRESSÃO BLOQUEADA</div>
  <p style="margin: 8px 0;">Via do entregador não pode ser gerada:</p>
  <ul class="error-list">${errorList}</ul>
  ${validation.warnings.length > 0 ? `
  <div class="warning-title">⚠️ AVISOS</div>
  <ul class="error-list">${warningList}</ul>
  ` : ''}
  <p class="order-id">Pedido: ${orderId}</p>
</body>
</html>`;
}

/**
 * Generate plain text deliverer ticket (48 columns)
 * For network printers using raw text
 */
export function generateDelivererTicketText(
  order: Order & {
    order_type?: string;
    source?: string | null;
    payment_method?: string | null;
    change_for?: number | null;
    delivery_fee?: number | null;
    discount?: number | null;
    notes?: string | null;
  },
  companyName?: string
): string | null {
  // Prepare and validate data
  const data: DelivererTicketData = {
    orderId: order.id,
    orderNumber: (order as any).order_number || order.id.slice(0, 8).toUpperCase(),
    origin: extractOrderOrigin(order as any),
    createdAt: order.created_at,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerAddress: order.customer_address,
    items: ((order.items || []) as any[]).map(item => ({
      quantity: item.quantity,
      product_name: item.product_name,
      unit_price: item.unit_price || 0,
      selected_options_json: item.selected_options_json,
      notes: item.notes,
    })),
    subtotal: (order as any).subtotal ?? order.total ?? 0,
    deliveryFee: order.delivery_fee,
    discount: order.discount,
    total: order.total,
    paymentMethod: order.payment_method,
    changeFor: order.change_for,
    notes: order.notes,
  };

  const validation = validateDelivererTicket(data);
  if (!validation.valid) {
    console.error('[DelivererTicket] Impressão bloqueada:', validation.errors);
    return null;
  }

  const lines: string[] = [];
  const barcodeValue = getBarcodeValue(order.id);
  
  // Header
  if (companyName) {
    lines.push(centerText(companyName.toUpperCase()));
  }
  lines.push('');
  lines.push(centerText(`*** ${data.origin} ***`));
  lines.push('');
  lines.push(centerText(`PEDIDO #${data.orderNumber}`));
  lines.push('');
  
  lines.push(SEPARATOR_DASHED);
  
  // Date/Time
  const orderDate = format(new Date(data.createdAt), 'dd/MM/yyyy', { locale: ptBR });
  const orderTime = format(new Date(data.createdAt), 'HH:mm', { locale: ptBR });
  lines.push(`Data: ${orderDate}  Hora: ${orderTime}`);
  
  lines.push(SEPARATOR_DASHED);
  
  // Customer
  lines.push('CLIENTE');
  lines.push(`Nome: ${(data.customerName || 'Não informado').toUpperCase()}`);
  if (data.customerPhone) {
    lines.push(`Fone: ${data.customerPhone}`);
  }
  
  // Address
  if (data.customerAddress) {
    lines.push('');
    lines.push('ENDERECO DE ENTREGA');
    // Word wrap address
    const addr = data.customerAddress.toUpperCase();
    for (let i = 0; i < addr.length; i += LINE_WIDTH) {
      lines.push(addr.slice(i, i + LINE_WIDTH));
    }
  }
  
  lines.push(SEPARATOR_DASHED);
  
  // Items
  lines.push('ITENS');
  data.items.forEach(item => {
    const itemTotal = item.quantity * item.unit_price;
    const priceFmt = formatCurrency(itemTotal);
    const nameLen = LINE_WIDTH - priceFmt.length - 4;
    const name = truncateEllipsis(`${item.quantity}x ${item.product_name}`, nameLen);
    lines.push(`${name.padEnd(nameLen)} ${priceFmt}`);
    
    const childLines = buildItemChildLines({
      selectedOptionsJson: item.selected_options_json,
      notes: item.notes,
      childMaxLen: LINE_WIDTH - INDENT.length,
    });
    childLines.forEach(line => {
      lines.push(`${INDENT}${line.toUpperCase()}`);
    });
  });
  
  lines.push(SEPARATOR_DASHED);
  
  // Totals
  const subtotal = data.subtotal || data.items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
  const deliveryFee = data.deliveryFee || 0;
  const discount = data.discount || 0;
  const total = data.total || (subtotal + deliveryFee - discount);
  
  lines.push(`${'Subtotal:'.padEnd(LINE_WIDTH - 15)}${formatCurrency(subtotal).padStart(15)}`);
  if (deliveryFee > 0) {
    lines.push(`${'Taxa Entrega:'.padEnd(LINE_WIDTH - 15)}${formatCurrency(deliveryFee).padStart(15)}`);
  }
  if (discount > 0) {
    lines.push(`${'Desconto:'.padEnd(LINE_WIDTH - 15)}${('-' + formatCurrency(discount)).padStart(15)}`);
  }
  lines.push(SEPARATOR_DASHED);
  lines.push(`${'TOTAL:'.padEnd(LINE_WIDTH - 15)}${formatCurrency(total).padStart(15)}`);
  
  lines.push(SEPARATOR_DASHED);
  
  // Payment
  lines.push('PAGAMENTO');
  lines.push(normalizePaymentMethod(data.paymentMethod));
  
  const changeFor = data.changeFor || 0;
  const changeValue = changeFor > total ? changeFor - total : 0;
  if (changeFor > 0 && changeValue > 0) {
    lines.push(`TROCO PARA ${formatCurrency(changeFor)}: ${formatCurrency(changeValue)}`);
  }
  
  // Notes
  if (data.notes) {
    lines.push(SEPARATOR_DASHED);
    lines.push('*** OBSERVACAO ***');
    lines.push(truncateEllipsis(data.notes.toUpperCase(), LINE_WIDTH));
  }
  
  lines.push(SEPARATOR_DOUBLE);
  
  // Barcode (text representation)
  lines.push(centerText('CODIGO DE BARRAS'));
  lines.push(centerText(barcodeValue));
  
  lines.push(SEPARATOR_DOUBLE);
  
  lines.push(centerText('VIA ENTREGADOR / EXPEDICAO'));
  lines.push('');
  lines.push(centerText('www.zoopi.app.br'));
  lines.push('');
  lines.push('');
  
  return lines.join('\n');
}
