import { Order } from '@/hooks/useOrders';
import { PrintSector } from '@/hooks/usePrintSectors';
import { getOrderTypePrintLabel } from '@/lib/orderTypeLabel';

export interface SectorOrderItems {
  sector: PrintSector;
  items: Order['items'];
}

/**
 * Group order items by their print sectors
 */
export function groupItemsBySector(
  order: Order,
  productSectorMap: Map<string, PrintSector[]>
): SectorOrderItems[] {
  const sectorGroups = new Map<string, SectorOrderItems>();

  order.items?.forEach((item) => {
    const sectors = productSectorMap.get(item.product_id) || [];
    
    // If product has no sector assigned, it goes to a "default" sector
    if (sectors.length === 0) {
      const defaultKey = '__default__';
      if (!sectorGroups.has(defaultKey)) {
        sectorGroups.set(defaultKey, {
          sector: { id: defaultKey, name: 'Geral', color: '#6b7280' } as PrintSector,
          items: [],
        });
      }
      sectorGroups.get(defaultKey)!.items!.push(item);
    } else {
      // Item goes to each assigned sector
      sectors.forEach((sector) => {
        if (!sectorGroups.has(sector.id)) {
          sectorGroups.set(sector.id, {
            sector,
            items: [],
          });
        }
        sectorGroups.get(sector.id)!.items!.push(item);
      });
    }
  });

  return Array.from(sectorGroups.values());
}

/**
 * Generate print HTML for a specific sector
 */
export function generateSectorPrintHTML(
  order: Order,
  sector: PrintSector,
  items: Order['items'],
  companyName?: string
): string {
  const now = new Date();
  const formattedDate = now.toLocaleDateString('pt-BR');
  const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Extract command info if available
  const commandNumber = (order as any).command_number ?? null;
  const commandName = (order as any).command_name ?? null;
  const hasCommandInfo = commandNumber !== null || commandName !== null;

  const itemsHTML = items?.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px dotted #000; font-weight: bold; color: #000;">
        <div style="font-size: 18px; font-weight: 900;">
          <span style="background: #000; color: #fff; padding: 2px 6px; margin-right: 6px;">${item.quantity}x</span>
          ${item.product_name.toUpperCase()}
        </div>
        ${item.notes ? `<div style="margin-top: 4px; font-weight: bold; color: #000; background: #eee; padding: 4px;">📝 OBS: ${item.notes.toUpperCase()}</div>` : ''}
      </td>
    </tr>
  `).join('') || '';

  // Use order_number if available, otherwise fallback to ID
  const orderDisplayNum = (order as any).order_number 
    ? String((order as any).order_number).padStart(3, '0')
    : order.id.slice(0, 8);

  const orderType = String((order as any).order_type || (order as any).orderType || order.order_type || 'sistema');
  const source = (order as any).source || null;
  const eatHere = (order as any).eat_here ?? (order as any).eat_in;
  const originLabel = getOrderTypePrintLabel(orderType, source, eatHere).toUpperCase();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Pedido - ${sector.name}</title>
      <style>
        @media print {
          body { margin: 0; padding: 10px; font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold; color: #000; }
          .no-print { display: none !important; }
        }
        body { max-width: 300px; margin: 0 auto; font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold; color: #000; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
        .origin-badge {
          background: #000;
          color: #fff;
          padding: 8px 10px;
          border-radius: 4px;
          display: inline-block;
          font-size: 14px;
          font-weight: 900;
          margin-bottom: 10px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .sector-badge { 
          background: ${sector.color || '#3b82f6'}; 
          color: #fff; 
          padding: 8px 16px; 
          border-radius: 4px; 
          display: inline-block;
          font-size: 16px;
          font-weight: 900;
          margin-bottom: 10px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .info { margin: 10px 0; font-weight: bold; color: #000; }
        .items { width: 100%; }
        .footer { margin-top: 20px; text-align: center; border-top: 2px dashed #000; padding-top: 10px; font-weight: bold; color: #000; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="origin-badge">${originLabel}</div>
        ${companyName ? `<h2 style="margin: 0;">${companyName}</h2>` : ''}
        <div class="sector-badge">${sector.name.toUpperCase()}</div>
        <p style="margin: 5px 0;">Pedido #${orderDisplayNum}</p>
        ${hasCommandInfo ? `<p style="margin: 5px 0; background: #f59e0b; padding: 4px;">🏷️ Comanda ${commandNumber ? `#${commandNumber}` : ''}${commandName ? ` - ${commandName}` : ''}</p>` : ''}
        <p style="margin: 5px 0;">${formattedDate} - ${formattedTime}</p>
      </div>
      
      ${order.customer_name ? `<div class="info"><strong>Cliente:</strong> ${order.customer_name}</div>` : ''}
      ${order.notes ? `<div class="info" style="background: #fff3cd; padding: 5px;"><strong>OBS:</strong> ${order.notes}</div>` : ''}
      
      <table class="items">
        ${itemsHTML}
      </table>
      
      <div class="footer">
        <p>--- ${sector.name} ---</p>
      </div>
      
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;
}

/**
 * Print order items for a specific sector
 */
export function printSector(
  order: Order,
  sector: PrintSector,
  items: Order['items'],
  companyName?: string
): void {
  const html = generateSectorPrintHTML(order, sector, items, companyName);
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
