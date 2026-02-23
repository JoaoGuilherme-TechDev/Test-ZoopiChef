/**
 * Centralized function to get the ORDER ORIGIN label for printing
 * 
 * This label represents WHERE the order came from (the module/channel):
 * - MESA X (table order)
 * - QRCODE (digital menu)
 * - PEDIDO ONLINE (delivery)
 * - LIGAÇÃO (phone order)
 * - BALCÃO (counter)
 * - TOTEM (kiosk)
 * - IFOOD / WHATSAPP (integrations)
 * 
 * IMPORTANT: This is NOT the sector (BAR, COZINHA) - sectors are for production routing only.
 * The origin label is used for:
 * - Complete ticket header
 * - Bill/account header
 * - Expeditor ticket header
 * 
 * Production tickets (sent to sectors) may show the sector name, but complete/bill tickets MUST show origin.
 */

export interface OrderForOrigin {
  order_type?: string | null;
  source?: string | null;
  table_number?: string | number | null;
  table_name?: string | null;
  eat_here?: boolean | null;
  eat_in?: boolean | null;
}

/**
 * Get the origin label for an order
 * Used in ticket headers for complete/bill prints
 * 
 * @param order - Order object with order_type, source, and optional table info
 * @returns Origin label string (e.g., "MESA 1", "QRCODE", "PEDIDO ONLINE")
 */
export function getOrderOriginLabel(order: OrderForOrigin): string {
  const orderType = String(order?.order_type || '').toLowerCase();
  const source = String(order?.source || '').toLowerCase();
  
  // TOTEM / Kiosk
  if (source === 'kiosk' || source === 'totem') {
    return 'TOTEM';
  }
  
  // QRCode - digital menu orders
  if (source === 'qrcode' || source === 'menu' || source === 'digital_menu') {
    return 'QRCODE';
  }
  
  // Integration sources (iFood, WhatsApp, etc.)
  if (source === 'ifood') return 'IFOOD';
  if (source === 'whatsapp') return 'WHATSAPP';
  if (source === 'rappi') return 'RAPPI';
  if (source === 'uber_eats') return 'UBER EATS';
  if (source === 'aiqfome') return 'AIQFOME';
  
  // Mesa (table order)
  if (orderType === 'table' || orderType === 'dine_in') {
    const tableNumber = order?.table_number || order?.table_name || '';
    if (tableNumber) return `MESA ${tableNumber}`;
    return 'MESA';
  }
  
  // Ligação (phone order)
  if (source === 'phone' || orderType === 'phone') {
    return 'LIGAÇÃO';
  }
  
  // Delivery (online order)
  if (orderType === 'delivery') {
    return 'PEDIDO ONLINE';
  }
  
  // Balcão (counter order)
  if (orderType === 'counter' || orderType === 'local') {
    const eatHere = order?.eat_here ?? order?.eat_in ?? null;
    if (eatHere === true) return 'COMER AQUI';
    if (orderType === 'local') return 'RETIRADA';
    return 'BALCÃO';
  }
  
  // Fallback
  return 'PEDIDO';
}

/**
 * Get the fulfillment type label (how the order will be delivered/received)
 * 
 * @param order - Order object
 * @returns Fulfillment label (e.g., "DELIVERY", "MESA", "BALCÃO", "RETIRADA")
 */
export function getFulfillmentTypeLabel(order: OrderForOrigin): string {
  const orderType = String(order?.order_type || '').toLowerCase();
  const eatHere = order?.eat_here ?? order?.eat_in ?? null;
  
  if (orderType === 'delivery') return 'DELIVERY';
  if (orderType === 'table' || orderType === 'dine_in') return 'MESA';
  if (orderType === 'local') return 'RETIRADA';
  if (orderType === 'counter' && eatHere === true) return 'COMER AQUI';
  if (orderType === 'counter') return 'BALCÃO';
  
  return 'BALCÃO';
}
