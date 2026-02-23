import { Order } from '@/hooks/useOrders';
import { PrintSector } from '@/hooks/usePrintSectors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildItemPrintBlock } from '@/lib/receiptFormatting';

const receiptTypeLabels: Record<string, string> = {
  delivery: 'DELIVERY',
  entrega: 'DELIVERY',
  retirada: 'RETIRADA',
  pickup: 'RETIRADA',
  local: 'CONSUMO LOCAL',
  dine_in: 'CONSUMO LOCAL',
  table: 'MESA',
};

const MAIN_LINE_LEN = 42;
const CHILD_LINE_LEN = MAIN_LINE_LEN - 4;

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

interface PartialKitchenItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  selected_options_json?: any;
}

/**
 * Generate a partial kitchen ticket for selected items only
 * Optimized for 80mm thermal printers
 */
export function generatePartialKitchenTicketHTML(
  order: Order,
  selectedItems: PartialKitchenItem[],
  companyName?: string,
  sector?: PrintSector | null
): string {
  const orderNumber = (order as any).order_number
    ? String((order as any).order_number).padStart(3, '0')
    : order.id.slice(0, 8).toUpperCase();
  const printTime = format(new Date(), 'HH:mm', { locale: ptBR });
  const receiptType =
    receiptTypeLabels[order.receipt_type || ''] ||
    order.receipt_type?.toUpperCase() ||
    'DELIVERY';

  // Extract command info if available
  const commandNumber = (order as any).command_number ?? null;
  const commandName = (order as any).command_name ?? null;
  const hasCommandInfo = commandNumber !== null || commandName !== null;

  const totalItems = (order.items || []).length;
  const selectedCount = selectedItems.length;

  // Generate items text blocks
  const itemsText = selectedItems
    .map((item) => {
      const block = buildItemPrintBlock({
        qty: item.quantity,
        name: item.product_name,
        price: item.quantity * item.unit_price,
        selectedOptionsJson: item.selected_options_json,
        notes: item.notes,
        lineLen: MAIN_LINE_LEN,
        childMaxLen: CHILD_LINE_LEN,
      });

      return `<div class="item-row"><pre class="item-pre">${escapeHtml(block)}</pre></div>`;
    })
    .join('');

  const sectorBadge = sector
    ? `<div class="sector-badge" style="background: ${sector.color || '#3b82f6'};">${sector.name.toUpperCase()}</div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Produção Parcial - Pedido #${orderNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 12px; 
      width: 76mm;
      padding: 4px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .header { text-align: center; margin-bottom: 8px; }
    .company { font-size: 16px; font-weight: bold; text-transform: uppercase; }
    
    .partial-badge {
      background: #f59e0b;
      color: #000;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      padding: 10px;
      margin: 8px 0;
      border: 3px solid #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .sector-badge {
      color: #fff;
      font-size: 20px;
      font-weight: bold;
      padding: 10px;
      margin: 8px 0;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .order-number {
      background: #000;
      color: #fff;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      padding: 12px;
      margin: 8px 0;
      letter-spacing: 2px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .order-type {
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      margin: 6px 0;
      padding: 6px;
      border: 2px solid #000;
    }
    
    .times {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      font-weight: bold;
      margin: 8px 0;
      padding: 4px;
      background: #eee;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .separator { border-top: 1px dashed #000; margin: 8px 0; }
    .separator-bold { border-top: 2px solid #000; margin: 8px 0; }
    
    .customer-section { margin: 8px 0; }
    .customer-line { font-size: 14px; font-weight: bold; margin: 4px 0; word-wrap: break-word; }
    
    .items-title { 
      font-size: 14px; 
      font-weight: bold; 
      margin-bottom: 8px; 
      border-bottom: 2px solid #000; 
      padding-bottom: 4px;
      color: #000;
    }

    .item-row { margin: 8px 0; padding: 4px 0; border-bottom: 1px dotted #ccc; }
    .item-pre {
      font-size: 12px;
      font-weight: bold;
      white-space: pre;
      overflow: hidden;
      margin-top: 4px;
    }
    
    .footer { text-align: center; font-size: 11px; margin-top: 12px; padding-top: 8px; border-top: 2px solid #000; }
    
    @media print { body { width: 100%; max-width: 76mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">${companyName || 'COZINHA'}</div>
  </div>
  
  <div class="partial-badge">
    ⚡ PRODUÇÃO PARCIAL ⚡
    <br>
    ${selectedCount} de ${totalItems} itens
  </div>
  
  ${sectorBadge}
  
  <div class="order-number">PEDIDO #${orderNumber}</div>
  
  ${hasCommandInfo ? `
  <div class="customer-line" style="background: #f59e0b; color: #000; padding: 8px; text-align: center; font-weight: bold; margin: 4px 0;">
    🏷️ COMANDA ${commandNumber ? `#${commandNumber}` : ''}${commandName ? ` - ${commandName.toUpperCase()}` : ''}
  </div>
  ` : ''}
  
  <div class="order-type">${receiptType}</div>
  
  <div class="times">
    <span>IMPRESSO: ${printTime}</span>
  </div>
  
  <div class="separator"></div>
  
  ${
    order.customer_name || order.customer_phone
      ? `
  <div class="customer-section">
    ${order.customer_name ? `<div class="customer-line">👤 ${order.customer_name.toUpperCase()}</div>` : ''}
    ${order.customer_phone ? `<div class="customer-line">📞 ${order.customer_phone}</div>` : ''}
  </div>
  <div class="separator"></div>
  `
      : ''
  }
  
  <div class="items-title">ITENS PARA PRODUZIR (${selectedCount}):</div>
  <div class="items-section">
    ${itemsText || '<div>Nenhum item</div>'}
  </div>
  
  <div class="footer">
    <div style="margin-bottom: 4px;"><img src="/zoopi-logo.png" alt="Zoopi" style="height: 25px; opacity: 0.8;" onerror="this.style.display='none'" /></div>
    <div>TICKET PARCIAL - ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</div>
  </div>
  
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;
}

/**
 * Open a print window for partial kitchen ticket
 */
export function printPartialKitchenTicket(
  order: Order,
  selectedItems: PartialKitchenItem[],
  companyName?: string,
  sector?: PrintSector | null
): void {
  const html = generatePartialKitchenTicketHTML(order, selectedItems, companyName, sector);
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
