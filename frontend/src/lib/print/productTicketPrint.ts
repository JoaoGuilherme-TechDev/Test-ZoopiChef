/**
 * Product Ticket Print - Impressão de tickets individuais por produto
 * 
 * Gera e imprime tickets individuais para cada produto do pedido.
 * Formato otimizado para impressora térmica 80mm.
 */

export interface ProductTicketData {
  companyName: string;
  productName: string;
  ticketIndex: number;
  ticketTotal: number;
  ticketCode: string;
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  attendantName?: string;
  showQRCode?: boolean;
  footerSite?: string;
  footerPhone?: string;
}

const TICKET_CSS = `
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
  
  * { 
    -webkit-print-color-adjust: exact !important; 
    print-color-adjust: exact !important;
    box-sizing: border-box;
  }
  
  .text-center { text-align: center; }
  .bold { font-weight: bold; }
  
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
    font-size: 20px;
    display: block;
    width: 100%;
  }
  
  .dashed-line {
    border-top: 1px dashed #000;
    margin: 8px 0;
    width: 100%;
    display: block;
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
  
  .product-name {
    text-align: center;
    font-size: 18px;
    font-weight: 900;
    margin: 10px 0;
    word-wrap: break-word;
  }
  
  .ticket-index {
    text-align: center;
    font-size: 14px;
    font-weight: bold;
    margin: 5px 0;
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
  
  .person-name {
    text-align: center;
    font-size: 12px;
    font-weight: bold;
    margin: 5px 0;
  }
  
  .ticket-label {
    text-align: center;
    font-size: 10px;
    color: #666;
    margin: 3px 0;
  }
`;

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

function cleanupPrintFrame(printFrame: HTMLIFrameElement, delayMs = 5000): void {
  setTimeout(() => {
    if (document.body.contains(printFrame)) {
      document.body.removeChild(printFrame);
    }
  }, delayMs);
}

/**
 * Gera o HTML de um ticket individual
 */
function buildTicketHtml(ticket: ProductTicketData): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // QR Code encodes the full redemption URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const ticketUrl = `${baseUrl}/ticket/${ticket.ticketCode}`;
  const qrCodeUrl = ticket.showQRCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticketUrl)}`
    : '';

  const personSection = (ticket.customerName || ticket.attendantName)
    ? `<div class="person-name">${ticket.customerName || ticket.attendantName}</div>`
    : '';

  const qrSection = ticket.showQRCode
    ? `<div class="text-center">
         <img class="qr-code" src="${qrCodeUrl}" alt="QR Code" />
         <div class="ticket-label">COD: ${ticket.ticketCode}</div>
       </div>`
    : '';

  const orderDisplay = ticket.orderNumber
    ? `#${ticket.orderNumber}`
    : ticket.orderId.slice(0, 8).toUpperCase();

  return `
    <!-- CABEÇALHO -->
    <div class="company-header">${ticket.companyName}</div>
    <div class="dashed-line"></div>
    
    <!-- DATA/HORA -->
    <div class="datetime-row">
      <div>DATA: ${dateStr} | HORA: ${timeStr}</div>
    </div>

    ${personSection}

    <div class="dashed-line"></div>

    <!-- PRODUTO -->
    <div class="inverse-box-large">TICKET</div>
    <div class="product-name">${ticket.productName}</div>
    <div class="inverse-box">(${ticket.ticketIndex}/${ticket.ticketTotal})</div>

    <!-- PEDIDO -->
    <div class="ticket-label">PEDIDO: ${orderDisplay}</div>

    <div class="dashed-line"></div>

    ${qrSection}

    <!-- RODAPÉ -->
    <div class="footer">
      <div>${ticket.footerSite || 'www.zoopi.app.br'}</div>
      <div>TEL: ${ticket.footerPhone || '(16) 98258.6199'}</div>
    </div>

    <div class="cut-space"></div>
  `;
}

/**
 * Imprime múltiplos tickets de produto em sequência
 */
export function printProductTickets(tickets: ProductTicketData[]): void {
  if (tickets.length === 0) return;

  const printFrame = createPrintFrame();

  // Concatenar todos os tickets em uma única página com separadores
  const allTicketsHtml = tickets
    .map((ticket) => buildTicketHtml(ticket))
    .join('<div style="page-break-before: always;"></div>');

  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tickets do Pedido</title>
        <meta charset="UTF-8">
        <style>${TICKET_CSS}</style>
      </head>
      <body>
        ${allTicketsHtml}
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
        console.error('[ProductTicketPrint] Print failed:', e);
      }
    }, 500);
  }

  cleanupPrintFrame(printFrame);
}
