/**
 * Browser Print Utility - Professional Receipt Style
 * 
 * Prints thermal tickets using an invisible iframe technique.
 * Optimized for 80mm thermal printers with iFood/PDV modern layout.
 * 
 * Key features:
 * - @page size: 80mm auto - prevents infinite paper feed
 * - Inverted black boxes for headers (with -webkit-print-color-adjust: exact)
 * - Courier New font for proper number alignment
 * - Professional receipt layout
 */

import { Order } from '@/hooks/useOrders';

export interface PrintTicketOptions {
  ticketNumber: string;
  customerName?: string;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
  total?: number;
  companyName?: string;
  validationCode?: string;
  orderType?: string;
  tableNumber?: string;
  showQRCode?: boolean;
  qrCodeData?: string;
  /** Custom footer text */
  footerText?: string;
  /** Footer site URL */
  footerSite?: string;
  /** Footer phone number */
  footerPhone?: string;
  /** Extra content to append before footer */
  extraContent?: string;
  /** NSU - Número Sequencial Único do pagamento */
  nsu?: string;
  /** Payment method for display */
  paymentMethodLabel?: string;
}

/**
 * Creates an invisible iframe for printing
 */
function createPrintFrame(): HTMLIFrameElement {
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.left = '-9999px';
  printFrame.style.top = '0px';
  printFrame.style.width = '0px';
  printFrame.style.height = '0px';
  printFrame.style.border = 'none';
  document.body.appendChild(printFrame);
  return printFrame;
}

/**
 * Cleans up print frame after printing
 */
function cleanupPrintFrame(printFrame: HTMLIFrameElement, delayMs = 5000): void {
  setTimeout(() => {
    if (document.body.contains(printFrame)) {
      document.body.removeChild(printFrame);
    }
  }, delayMs);
}

/**
 * Format price in BRL
 */
function formatPrice(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

/**
 * Professional Receipt CSS for thermal printing (80mm paper)
 * Style: iFood/PDV Modern - Inverted headers, Courier font, uppercase
 */
const THERMAL_BASE_CSS = `
  @page { size: 80mm auto; margin: 0; }
  
  body {
    font-family: 'Courier New', monospace;
    width: 72mm;
    margin: 0;
    padding: 5px;
    background: #fff;
    color: #000;
    font-size: 12px;
    line-height: 1.2;
    text-transform: uppercase;
  }
  
  /* FORÇA A IMPRESSÃO DE FUNDO PRETO */
  * { 
    -webkit-print-color-adjust: exact !important; 
    print-color-adjust: exact !important;
    box-sizing: border-box;
  }
  
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .bold { font-weight: bold; }
  
  /* FAIXAS PRETAS ESTILO CUPOM */
  .inverse-box {
    background-color: #000 !important;
    color: #fff !important;
    padding: 6px 0;
    margin: 8px 0;
    text-align: center;
    font-weight: 900;
    font-size: 16px;
    display: block;
    width: 100%;
  }
  
  .inverse-box-large {
    background-color: #000 !important;
    color: #fff !important;
    padding: 10px 0;
    margin: 8px 0;
    text-align: center;
    font-weight: 900;
    font-size: 22px;
    display: block;
    width: 100%;
  }
  
  .inverse-box-small {
    background-color: #000 !important;
    color: #fff !important;
    padding: 3px 5px;
    margin: 5px 0;
    font-weight: bold;
    font-size: 14px;
    display: inline-block;
  }

  /* LINHAS PONTILHADAS */
  .dashed-line {
    border-top: 1px dashed #000;
    margin: 8px 0;
    width: 100%;
    display: block;
  }

  /* TABELA DE ITENS PARA ALINHAMENTO PERFEITO */
  .item-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  .item-name { flex: 1; margin-right: 5px; }
  .item-price { white-space: nowrap; font-weight: bold; }
  .item-notes {
    font-size: 10px;
    font-style: italic;
    margin-left: 15px;
    margin-bottom: 4px;
    text-transform: none;
  }
  
  .total-section {
    background-color: #000 !important;
    color: #fff !important;
    padding: 10px;
    margin-top: 10px;
    display: flex;
    justify-content: space-between;
    font-size: 18px;
    font-weight: 900;
  }
  
  .subtotal-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 12px;
  }
  
  .section-header {
    font-weight: bold;
    margin: 8px 0 4px 0;
    font-size: 11px;
  }
  
  .qr-code {
    width: 120px;
    height: 120px;
    margin: 10px auto;
    display: block;
    image-rendering: pixelated;
  }
  
  .footer {
    text-align: center;
    margin-top: 15px;
    font-size: 10px;
    line-height: 1.4;
  }
  
  .cut-space {
    height: 15mm;
  }
  
  .company-header {
    text-align: center;
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 5px;
  }
  
  .datetime-row {
    text-align: center;
    font-size: 11px;
    margin: 4px 0;
  }
`;

/**
 * Gets order type label for display
 */
function getOrderTypeLabel(orderType?: string, tableNumber?: string): string {
  switch (orderType) {
    case 'table':
      return tableNumber ? `MESA ${tableNumber}` : 'MESA';
    case 'delivery':
      return 'DELIVERY';
    case 'takeout':
      return 'PARA LEVAR';
    case 'counter':
      return 'BALCÃO';
    default:
      return 'PEDIDO';
  }
}

/**
 * Prints a professional receipt ticket using browser's native print dialog via hidden iframe
 * Layout inspired by iFood/modern POS systems
 */
export function printTicketBrowser(options: PrintTicketOptions): void {
  const {
    ticketNumber,
    customerName,
    items = [],
    total = 0,
    companyName = 'Estabelecimento',
    validationCode,
    orderType,
    tableNumber,
    showQRCode = true,
    qrCodeData,
    footerText,
    footerSite = 'www.zoopi.app.br',
    footerPhone = '(16) 98258.6199',
    extraContent,
    nsu,
    paymentMethodLabel,
  } = options;

  // Create invisible iframe
  const printFrame = createPrintFrame();

  // Current date/time
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Generate QR Code URL (using public API)
  const qrData = qrCodeData || ticketNumber;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

  // Order type label for header
  const orderTypeLabel = getOrderTypeLabel(orderType, tableNumber);

  // Build items HTML with professional alignment
  const itemsHtml = items.map(item => {
    const itemTotal = item.quantity * item.unitPrice;
    return `
      <div class="item-row">
        <span class="item-name">${item.quantity}x ${item.name}</span>
        <span class="item-price">${formatPrice(itemTotal)}</span>
      </div>
      ${item.notes ? `<div class="item-notes">OBS: ${item.notes}</div>` : ''}
    `;
  }).join('');

  // Customer section
  const customerSection = customerName 
    ? `<div class="text-center" style="margin: 5px 0;">
         <div class="section-header">CLIENTE</div>
         <div class="bold">${customerName}</div>
       </div>`
    : '';

  // Table section (inverted box for tables)
  const tableSection = orderType === 'table' && tableNumber
    ? `<div class="inverse-box">MESA ${tableNumber}</div>`
    : '';

  // Footer text
  const finalFooterText = footerText || 'OBRIGADO PELA PREFERÊNCIA!';

  // Build complete HTML
  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Pedido #${ticketNumber}</title>
        <meta charset="UTF-8">
        <style>${THERMAL_BASE_CSS}</style>
      </head>
      <body>
        <!-- CABEÇALHO DA EMPRESA -->
        <div class="company-header">${companyName}</div>

        <div class="dashed-line"></div>

        <!-- NÚMERO DO PEDIDO -->
        <div class="inverse-box-large">
          ${orderTypeLabel} #${ticketNumber}
        </div>

        ${tableSection}
        ${customerSection}

        ${validationCode ? `
          <div class="text-center">
            <span class="inverse-box-small">COD: ${validationCode}</span>
          </div>
        ` : ''}

        <div class="dashed-line"></div>

        <!-- DATA/HORA -->
        <div class="datetime-row">
          <div>DATA: ${dateStr}</div>
          <div>HORA: ${timeStr}</div>
        </div>

        ${items.length > 0 ? `
          <div class="dashed-line"></div>

          <!-- ITENS -->
          <div class="section-header">ITENS:</div>
          ${itemsHtml}

          <div class="dashed-line"></div>

          <!-- SUBTOTAL -->
          <div class="subtotal-row">
            <span>SUBTOTAL:</span>
            <span class="bold">${formatPrice(total)}</span>
          </div>

          <!-- TOTAL -->
          <div class="total-section">
            <span>TOTAL</span>
            <span>${formatPrice(total)}</span>
          </div>

          ${paymentMethodLabel ? `
            <div class="subtotal-row" style="margin-top: 5px;">
              <span>PAGAMENTO:</span>
              <span class="bold">${paymentMethodLabel.toUpperCase()}</span>
            </div>
          ` : ''}

          ${nsu ? `
            <div class="subtotal-row">
              <span>NSU:</span>
              <span class="bold">${nsu}</span>
            </div>
          ` : ''}
        ` : ''}

        ${showQRCode ? `
          <!-- QR CODE -->
          <div class="text-center">
            <img class="qr-code" src="${qrCodeUrl}" alt="QR Code" />
          </div>
        ` : ''}

        ${extraContent ? `<div style="margin: 10px 0;">${extraContent}</div>` : ''}

        <!-- RODAPÉ -->
        <div class="footer">
          <div>${finalFooterText}</div>
          <div style="margin-top: 5px;">${footerSite}</div>
          <div>TEL: ${footerPhone}</div>
        </div>

        <!-- ESPAÇO PARA CORTE -->
        <div class="cut-space"></div>
      </body>
    </html>
  `;

  // Write to iframe and trigger print
  const doc = printFrame.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(content);
    doc.close();

    // Wait for content and images to load, then print
    printFrame.contentWindow?.addEventListener('load', () => {
      setTimeout(() => {
        printFrame.contentWindow?.print();
      }, 100);
    });

    // Fallback: trigger print after short delay
    setTimeout(() => {
      try {
        printFrame.contentWindow?.print();
      } catch (e) {
        console.error('[BrowserPrint] Print failed:', e);
      }
    }, 500);
  }

  // Cleanup iframe after print dialog closes
  cleanupPrintFrame(printFrame);
}

/**
 * Prints raw HTML content using the thermal print CSS
 */
export function printRawHtmlBrowser(htmlContent: string, title = 'Print'): void {
  const printFrame = createPrintFrame();

  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="UTF-8">
        <style>${THERMAL_BASE_CSS}</style>
      </head>
      <body>
        ${htmlContent}
        <div class="cut-space"></div>
      </body>
    </html>
  `;

  const doc = printFrame.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(content);
    doc.close();

    printFrame.contentWindow?.addEventListener('load', () => {
      setTimeout(() => {
        printFrame.contentWindow?.print();
      }, 100);
    });

    setTimeout(() => {
      try {
        printFrame.contentWindow?.print();
      } catch (e) {
        console.error('[BrowserPrint] Print failed:', e);
      }
    }, 500);
  }

  cleanupPrintFrame(printFrame);
}

/**
 * Helper to print an Order object
 */
export function printOrderBrowser(order: Order, companyName?: string): void {
  const items = (order.items || []).map(item => ({
    name: item.product_name,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    notes: item.notes || undefined,
  }));

  const ticketNumber = order.order_number 
    ? String(order.order_number).padStart(3, '0')
    : order.id.slice(0, 8).toUpperCase();

  printTicketBrowser({
    ticketNumber,
    customerName: order.customer_name || undefined,
    items,
    total: order.total,
    companyName: companyName || 'Estabelecimento',
    orderType: order.order_type || undefined,
    tableNumber: order.table_number || undefined,
    showQRCode: true,
    qrCodeData: order.id,
  });
}

/**
 * Print a simple receipt (for PDV)
 */
export function printReceiptBrowser(options: {
  total: number;
  paymentMethod: string;
  items?: Array<{ name: string; quantity: number; unitPrice: number }>;
  companyName?: string;
  orderId?: string;
  footerText?: string;
  nsu?: string;
}): void {
  const { total, paymentMethod, items = [], companyName, orderId, footerText, nsu } = options;

  const ticketNumber = orderId?.slice(0, 8).toUpperCase() || 
    String(Date.now()).slice(-6);

  printTicketBrowser({
    ticketNumber,
    items,
    total,
    companyName: companyName || 'Estabelecimento',
    validationCode: paymentMethod,
    showQRCode: false,
    footerText,
    nsu,
    paymentMethodLabel: paymentMethod,
  });
}
