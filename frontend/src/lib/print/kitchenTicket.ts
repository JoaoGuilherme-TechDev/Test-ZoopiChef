/**
 * Kitchen Ticket Generator for 80mm Thermal Printers
 * 
 * LAYOUT PADRONIZADO:
 * - Cabeçalho: Nome do estabelecimento + ORIGEM DO PEDIDO (destaque)
 * - Nº do pedido em destaque
 * - Tipo de recebimento + modo de consumo
 * - Cliente, endereço, observações
 * - Itens detalhados com observações
 * 
 * REGRAS:
 * - NUNCA exibir nome do setor no cabeçalho (setor é para roteamento interno apenas)
 * - SEMPRE exibir origem do pedido em destaque
 */
import { Order } from '@/hooks/useOrders';
import { PrintSector } from '@/hooks/usePrintSectors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildItemPrintBlock, truncateEllipsis } from '@/lib/receiptFormatting';
import { formatPrintFooter, DEFAULT_FOOTER } from './printFooter';
import { getOrderTypeLabel, getOrderTypePrintLabel } from '@/lib/orderTypeLabel';
import { extractOrderOrigin } from './ticketValidation';

const receiptTypeLabels: Record<string, string> = {
  delivery: 'DELIVERY',
  entrega: 'DELIVERY',
  retirada: 'RETIRADA',
  pickup: 'RETIRADA',
  local: 'COMER AQUI',
  dine_in: 'COMER AQUI',
  table: 'MESA',
  qrcode: 'QR CODE',
  qr_code: 'QR CODE',
  takeaway: 'LEVAR',
  levar: 'LEVAR',
  comanda: 'COMANDA',
  counter: 'BALCÃO',
  balcao: 'BALCÃO',
  online: 'ONLINE',
};

// Paper-friendly line lengths (monospace) – keep single-line, truncate with ellipsis
const MAIN_LINE_LEN = 42;
const CHILD_LINE_LEN = MAIN_LINE_LEN - 4;

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * Interface for order items with edit status and sommelier info
 */
interface KitchenOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  edit_status?: 'new' | 'modified' | 'removed' | null;
  previous_quantity?: number | null;
  previous_notes?: string | null;
  selected_options_json?: any;
  // Sommelier fields
  sommelier_suggested?: boolean;
  sommelier_wine_id?: string | null;
  sommelier_tip?: string | null;
}

/**
 * Generate kitchen ticket HTML for thermal printer
 * Optimized for 80mm thermal printers
 */
export function generateKitchenTicketHTML(
  order: Order & { edit_version?: number; last_edit_at?: string | null },
  companyName?: string,
  sector?: PrintSector | null,
  items?: KitchenOrderItem[],
  footerText?: string
): string {
  // Check if this is a table order
  const isTableOrder = order.order_type === 'table' || order.receipt_type === 'table';
  
  // Use order_number if available, otherwise fallback to ID
  const orderNumber = (order as any).order_number 
    ? String((order as any).order_number).padStart(3, '0')
    : order.id.slice(0, 8).toUpperCase();
  const orderTime = format(new Date(order.created_at), 'HH:mm', { locale: ptBR });
  
  // Extract command info if available (from table commands or comandas)
  const commandNumber = (order as any).command_number ?? null;
  const commandName = (order as any).command_name ?? null;
  const hasCommandInfo = commandNumber !== null || commandName !== null;
  
  // For table orders, use "MESA" as the main type
  let receiptType = receiptTypeLabels[order.receipt_type || ''] || order.receipt_type?.toUpperCase() || 'DELIVERY';
  
  // For table orders, extract table number from table_number field or customer_name
  let tableDisplayLabel = '';
  if (isTableOrder) {
    const tableNum = (order as any).table_number || order.customer_name?.match(/MESA (\d+)/)?.[1] || '';
    tableDisplayLabel = tableNum ? `MESA ${tableNum}` : 'MESA';
    receiptType = 'MESA';
  }
  // Calculate estimated time
  let estimatedTime: string | null = null;
  if ((order as any).eta_minutes) {
    const etaDate = new Date(order.created_at);
    etaDate.setMinutes(etaDate.getMinutes() + (order as any).eta_minutes);
    estimatedTime = format(etaDate, 'HH:mm', { locale: ptBR });
  }

  // Use provided items or order items
  const orderItems = (items || order.items || []) as KitchenOrderItem[];
  
  // Check if order was edited
  const isEdited = order.edit_version && order.edit_version > 0;
  const hasEditItems = orderItems.some(item => item.edit_status);

  // Determinar a origem do pedido usando função centralizada
  const originLabel = extractOrderOrigin(order as any);
  const orderTypeInfo = getOrderTypeLabel(order.order_type, (order as any).source, (order as any).eat_here ?? (order as any).eat_in);
  const orderTypePrintLabel = `★★★ ${originLabel} ★★★`;

  // Determinar o modo de consumo
  let consumeMode = '';
  const eatIn = (order as any).eat_in;
  if (eatIn === true) {
    consumeMode = 'COMER AQUI';
  } else if (eatIn === false) {
    consumeMode = 'LEVAR';
  }

  // Generate items text blocks with strict formatting rules
  const itemsText = orderItems
    .map((item) => {
      const editClass = item.edit_status ? `item-${item.edit_status}` : '';
      let statusLabel = '';
      let changeDetail = '';

      if (item.edit_status === 'new') {
        statusLabel = '<div class="status-badge status-new">★★★ NOVO ★★★</div>';
      } else if (item.edit_status === 'modified') {
        statusLabel = '<div class="status-badge status-modified">▶▶▶ ALTERADO ◀◀◀</div>';
        if (item.previous_quantity && item.previous_quantity !== item.quantity) {
          changeDetail = `<div class="change-detail">▸ QTD ANTERIOR: ${item.previous_quantity}x  →  NOVA: ${item.quantity}x</div>`;
        }
        if (item.previous_notes !== item.notes) {
          const oldNotes = item.previous_notes || '(sem obs)';
          const newNotes = item.notes || '(sem obs)';
          changeDetail += `<div class="change-detail">▸ OBS: "${escapeHtml(oldNotes)}" → "${escapeHtml(newNotes)}"</div>`;
        }
      } else if (item.edit_status === 'removed') {
        statusLabel = '<div class="status-badge status-removed">✖✖✖ REMOVIDO ✖✖✖</div>';
      }

      const block = buildItemPrintBlock({
        qty: item.quantity,
        name: item.product_name,
        price: item.quantity * item.unit_price,
        selectedOptionsJson: item.selected_options_json,
        notes: item.notes,
        lineLen: MAIN_LINE_LEN,
        childMaxLen: CHILD_LINE_LEN,
      });

      // Sommelier tip section
      const sommelierTipHtml = (item.sommelier_suggested && item.sommelier_tip) 
        ? `<div class="sommelier-tip">
            <div class="sommelier-tip-header">🍷 DICA DO ENÓLOGO</div>
            <div class="sommelier-tip-content">${escapeHtml(item.sommelier_tip)}</div>
          </div>`
        : '';

      return `
        <div class="item-row ${editClass}">
          ${statusLabel}
          <pre class="item-pre">${escapeHtml(block)}</pre>
          ${changeDetail}
          ${sommelierTipHtml}
        </div>`;
    })
    .join('');

  const editedBadge = isEdited 
    ? `<div class="edited-badge">✏️ EDITADO (v${order.edit_version})</div>` 
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cozinha - Pedido #${orderNumber}</title>
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
    
    .order-number {
      background: #000;
      color: #fff;
      font-size: 32px;
      font-weight: bold;
      text-align: center;
      padding: 14px;
      margin: 8px 0;
      letter-spacing: 3px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .origin-badge {
      font-size: 22px;
      font-weight: bold;
      text-align: center;
      padding: 10px;
      margin: 6px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .order-type {
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      margin: 6px 0;
      padding: 10px;
      border: 3px solid #000;
      background: #000;
      color: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .consume-mode {
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      padding: 8px;
      margin: 6px 0;
      border: 2px dashed #000;
    }
    
    .table-badge {
      background: #000;
      color: #fff;
      font-size: 26px;
      font-weight: bold;
      text-align: center;
      padding: 12px;
      margin: 8px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .command-badge {
      background: #000;
      color: #fff;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      padding: 10px;
      margin: 6px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .sector-name {
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      padding: 4px;
      margin: 4px 0;
      border: 1px solid #000;
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
    .address-obs {
      background: #000;
      color: #fff;
      padding: 6px;
      font-weight: bold;
      margin: 4px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .obs-section { margin: 8px 0; }
    .obs-title {
      background: #000;
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      padding: 6px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .obs-content {
      background: #000;
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      padding: 8px;
      margin-top: 2px;
      word-wrap: break-word;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .edited-badge {
      background: #f59e0b;
      color: #000;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      padding: 8px;
      margin: 8px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .items-title { 
      font-size: 12px; 
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

    /* Keep legacy classes (used for edit highlighting) */
    .item-main { display: none; }
    .item-qty { display: none; }
    .item-name { display: none; }
    .item-detail { display: none; }
    
    /* Edit status styles - High contrast for thermal printing */
    .item-new { background: #000; color: #fff; padding: 8px; margin: 6px -4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .item-modified { background: #000; color: #fff; padding: 8px; margin: 6px -4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .item-removed { background: #000; color: #fff; padding: 8px; margin: 6px -4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    
    .status-badge { font-size: 12px; font-weight: bold; padding: 4px 8px; border: 2px solid #000; }
    .status-new { background: #fff; color: #000; border: 3px solid #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .status-modified { background: #fff; color: #000; border: 3px solid #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .status-removed { background: #fff; color: #000; border: 3px solid #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    
    .change-detail { font-size: 12px; font-weight: bold; padding-left: 30px; color: #000; margin-top: 4px; border: 1px dashed #000; padding: 4px 4px 4px 30px; }
    
    /* Sommelier tip styles - High visibility for kitchen */
    .sommelier-tip {
      background: #f0e6ff;
      border: 2px solid #6b21a8;
      border-radius: 4px;
      padding: 6px;
      margin: 6px 0 4px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sommelier-tip-header {
      font-size: 11px;
      font-weight: bold;
      color: #6b21a8;
      margin-bottom: 2px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sommelier-tip-content {
      font-size: 12px;
      font-weight: bold;
      color: #000;
    }
    
    .footer { text-align: center; font-size: 11px; margin-top: 12px; padding-top: 8px; border-top: 2px solid #000; }
    .footer-site { font-size: 10px; margin-top: 4px; font-weight: bold; }
    
    @media print { body { width: 100%; max-width: 76mm; } }
  </style>
</head>
  <body>
    <div class="header">
      <div class="company">${companyName ? String(companyName).toUpperCase() : ''}</div>
    </div>
    
    <!-- Número do pedido em destaque -->
    <div class="order-number">PEDIDO #${orderNumber}</div>
    
    <!-- Origem/Módulo do pedido com destaque -->
    ${orderTypePrintLabel ? `<div class="origin-badge" style="background-color: ${orderTypeInfo.bgColor}; color: ${orderTypeInfo.textColor};">${orderTypePrintLabel}</div>` : ''}
    
    <!-- Tipo de recebimento -->
    <div class="order-type">${receiptType}</div>
    
    <!-- Modo de consumo (comer aqui / levar) -->
    ${consumeMode ? `<div class="consume-mode">${consumeMode}</div>` : ''}
    
    <!-- Mesa ou Comanda -->
    ${isTableOrder && tableDisplayLabel 
      ? `<div class="table-badge">★★★ ${tableDisplayLabel} ★★★</div>`
      : ''
    }
    
    ${hasCommandInfo ? `
    <div class="command-badge">
      🏷️ COMANDA ${commandNumber ? `#${commandNumber}` : ''}${commandName ? ` - ${commandName.toUpperCase()}` : ''}
    </div>
    ` : ''}
    
    ${editedBadge}

    <div class="times">
      <span>HORA: ${orderTime}</span>
      <span>PREV: ${estimatedTime || '--:--'}</span>
    </div>

  <div class="separator"></div>

  ${order.customer_name || order.customer_phone ? `
  <div class="customer-section">
    ${order.customer_name ? `<div class="customer-line">👤 ${order.customer_name.toUpperCase()}</div>` : ''}
    ${order.customer_phone ? `<div class="customer-line">📞 ${order.customer_phone}</div>` : ''}
    ${order.customer_address ? `<div class="customer-line">📍 ${order.customer_address.toUpperCase()}</div>` : ''}
    ${order.address_notes ? `<div class="address-obs">⚠️ ${order.address_notes.toUpperCase()}</div>` : ''}
  </div>
  <div class="separator"></div>
  ` : ''}
  
  ${order.notes ? `
  <div class="obs-section">
    <div class="obs-title">⚠️ OBSERVAÇÕES DO PEDIDO</div>
    <div class="obs-content">${order.notes.toUpperCase()}</div>
  </div>
  <div class="separator-bold"></div>
  ` : ''}
  
  <div class="items-title">ITENS:</div>
  <div class="items-section">
    ${itemsText || '<div>Nenhum item</div>'}
  </div>
  
  <div class="footer">
    <div style="margin-bottom: 4px;"><img src="/zoopi-logo.png" alt="Zoopi" style="height: 30px; opacity: 0.8;" onerror="this.style.display='none'" /></div>
    <div>Impresso: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</div>
    <div class="footer-site">${footerText || formatPrintFooter(DEFAULT_FOOTER)}</div>
  </div>
  
</body>
</html>`;
}

/**
 * Generate a change ticket HTML for edited orders
 * Shows only what changed (new/modified/removed items)
 */
export function generateChangeTicketHTML(
  order: Order & { edit_version?: number },
  changes: {
    addedItems: KitchenOrderItem[];
    modifiedItems: Array<KitchenOrderItem & { oldQuantity?: number; oldNotes?: string }>;
    removedItems: Array<{ product_name: string; quantity: number }>;
  },
  companyName?: string,
  sector?: PrintSector | null,
  footerText?: string
): string {
  // Use order_number if available, otherwise fallback to ID
  const orderNumber = (order as any).order_number 
    ? String((order as any).order_number).padStart(3, '0')
    : order.id.slice(0, 8).toUpperCase();
  const changeTime = format(new Date(), 'HH:mm', { locale: ptBR });

  const sectorBadge = sector 
    ? `<div class="sector-badge" style="background: ${sector.color || '#3b82f6'};">${sector.name.toUpperCase()}</div>` 
    : '';

  // Build added items HTML - HIGH CONTRAST
  const addedHtml = changes.addedItems.length > 0 
    ? `
      <div class="change-section">
        <div class="section-title section-added">★★★ ITENS ADICIONADOS ★★★</div>
        ${changes.addedItems.map(item => `
          <div class="change-item added">
            <div class="item-qty-big">${item.quantity}x</div>
            <div class="item-name-big">${item.product_name.toUpperCase()}</div>
            ${item.notes ? `<div class="item-obs-big">📝 ${item.notes.toUpperCase()}</div>` : ''}
          </div>
        `).join('')}
      </div>`
    : '';

  // Build modified items HTML - HIGH CONTRAST
  const modifiedHtml = changes.modifiedItems.length > 0 
    ? `
      <div class="change-section">
        <div class="section-title section-modified">▶▶▶ ITENS ALTERADOS ◀◀◀</div>
        ${changes.modifiedItems.map(item => {
          const qtyChanged = item.oldQuantity && item.oldQuantity !== item.quantity;
          const notesChanged = item.oldNotes !== item.notes;
          return `
            <div class="change-item modified">
              <div class="item-name-big">${item.product_name.toUpperCase()}</div>
              ${qtyChanged ? `<div class="change-detail-big">▸ QTD: ${item.oldQuantity}x → ${item.quantity}x</div>` : ''}
              ${notesChanged ? `<div class="change-detail-big">▸ OBS: "${item.oldNotes || '(sem)'}" → "${item.notes || '(sem)'}"</div>` : ''}
            </div>`;
        }).join('')}
      </div>`
    : '';

  // Build removed items HTML - HIGH CONTRAST
  const removedHtml = changes.removedItems.length > 0 
    ? `
      <div class="change-section">
        <div class="section-title section-removed">✖✖✖ ITENS REMOVIDOS ✖✖✖</div>
        ${changes.removedItems.map(item => `
          <div class="change-item removed">
            <div class="item-qty-big">${item.quantity}x</div>
            <div class="item-name-big">${item.product_name.toUpperCase()}</div>
          </div>
        `).join('')}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Alteração - Pedido #${orderNumber}</title>
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
    
    .header {
      background: #000;
      color: #fff;
      text-align: center;
      padding: 16px 12px;
      margin: -4px -4px 8px -4px;
      border: 4px solid #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-title { font-size: 28px; font-weight: bold; letter-spacing: 2px; }
    .header-sub { font-size: 16px; font-weight: bold; margin-top: 4px; }
    
    .sector-badge {
      color: #fff;
      font-size: 20px;
      font-weight: bold;
      padding: 10px;
      margin: 8px 0;
      text-align: center;
      border: 3px solid #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .order-info {
      background: #000;
      color: #fff;
      text-align: center;
      padding: 14px;
      margin: 8px 0;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 1px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .change-section { margin: 16px 0; }
    
    .section-title {
      font-size: 18px;
      font-weight: bold;
      padding: 10px;
      margin-bottom: 8px;
      text-align: center;
      border: 3px solid #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .section-added { background: #000; color: #fff; }
    .section-modified { background: #000; color: #fff; }
    .section-removed { background: #000; color: #fff; }
    
    .change-item {
      padding: 12px;
      margin: 8px 0;
      font-size: 16px;
      border: 2px solid #000;
      background: #fff;
    }
    .change-item.added { border-width: 4px; }
    .change-item.modified { border-width: 4px; }
    .change-item.removed { border-width: 4px; border-style: dashed; }
    
    .item-qty-big { font-size: 22px; font-weight: bold; }
    .item-name-big { font-size: 18px; font-weight: bold; margin-top: 4px; }
    .item-obs-big { font-size: 14px; font-weight: bold; margin-top: 6px; padding: 6px; background: #000; color: #fff; }
    .change-detail-big { font-size: 14px; font-weight: bold; margin-top: 6px; padding: 4px 8px; border: 1px dashed #000; }
    
    .footer { text-align: center; font-size: 12px; font-weight: bold; margin-top: 16px; padding-top: 10px; border-top: 3px solid #000; }
    .footer-site { font-size: 10px; margin-top: 4px; }
    
    @media print { body { width: 100%; max-width: 76mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">⚠️ ALTERAÇÃO</div>
    <div class="header-sub">TICKET DE MUDANÇA</div>
  </div>
  
  ${sectorBadge}
  
  <div class="order-info">
    PEDIDO #${orderNumber}<br>
    v${order.edit_version || 1} - ${changeTime}
  </div>
  
  ${addedHtml}
  ${modifiedHtml}
  ${removedHtml}
  
  <div class="footer">
    <div>ATENÇÃO: VERIFIQUE AS ALTERAÇÕES</div>
    <div>${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</div>
    <div class="footer-site">${footerText || formatPrintFooter(DEFAULT_FOOTER)}</div>
  </div>
  
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;
}

/**
 * Print kitchen ticket via browser
 */
export function printKitchenTicket(
  order: Order,
  companyName?: string,
  sector?: PrintSector | null,
  items?: KitchenOrderItem[]
): void {
  const html = generateKitchenTicketHTML(order, companyName, sector, items);
  const printWindow = window.open('', '_blank', 'width=350,height=700');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/**
 * Print change ticket via browser
 */
export function printChangeTicket(
  order: Order & { edit_version?: number },
  changes: {
    addedItems: KitchenOrderItem[];
    modifiedItems: Array<KitchenOrderItem & { oldQuantity?: number; oldNotes?: string }>;
    removedItems: Array<{ product_name: string; quantity: number }>;
  },
  companyName?: string,
  sector?: PrintSector | null
): void {
  const html = generateChangeTicketHTML(order, changes, companyName, sector);
  const printWindow = window.open('', '_blank', 'width=350,height=700');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
