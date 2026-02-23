/**
 * Ticket Validation System
 * 
 * Validates required data before printing to prevent incomplete tickets.
 * Returns validation result with specific errors for logging and user feedback.
 */

import { Order } from '@/hooks/useOrders';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProductionTicketData {
  orderId: string;
  orderNumber?: string | number | null;
  origin: string;
  createdAt: string;
  items: Array<{
    quantity: number;
    product_name: string;
  }>;
  customerName?: string | null;
  notes?: string | null;
}

export interface CustomerTicketData {
  orderId: string;
  orderNumber?: string | number | null;
  origin: string;
  createdAt: string;
  items: Array<{
    quantity: number;
    product_name: string;
    unit_price: number;
  }>;
  total: number;
  paymentMethod?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  notes?: string | null;
  deliveryFee?: number | null;
  status?: string;
}

/**
 * Validate production ticket data
 * Required: origin, order number, date/time, items (min 1 with qty and name)
 */
export function validateProductionTicket(data: ProductionTicketData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: Order ID
  if (!data.orderId) {
    errors.push('ID do pedido ausente');
  }

  // Required: Origin
  if (!data.origin || data.origin.trim() === '') {
    errors.push('Origem do pedido ausente');
  }

  // Required: Created at (date/time)
  if (!data.createdAt) {
    errors.push('Data/hora do pedido ausente');
  }

  // Required: Items (minimum 1)
  if (!data.items || data.items.length === 0) {
    errors.push('Pedido sem itens');
  } else {
    // Validate each item has quantity and name
    data.items.forEach((item, index) => {
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: quantidade inválida`);
      }
      if (!item.product_name || item.product_name.trim() === '') {
        errors.push(`Item ${index + 1}: nome do produto ausente`);
      }
    });
  }

  // Warnings (non-blocking)
  if (!data.customerName) {
    warnings.push('Nome do cliente não informado');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate customer receipt data
 * Required: order number, date/time, items (min 1), total, payment method (if finalized)
 */
export function validateCustomerTicket(data: CustomerTicketData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: Order ID
  if (!data.orderId) {
    errors.push('ID do pedido ausente');
  }

  // Required: Created at (date/time)
  if (!data.createdAt) {
    errors.push('Data/hora do pedido ausente');
  }

  // Required: Items (minimum 1)
  if (!data.items || data.items.length === 0) {
    errors.push('Pedido sem itens');
  } else {
    // Validate each item
    data.items.forEach((item, index) => {
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: quantidade inválida`);
      }
      if (!item.product_name || item.product_name.trim() === '') {
        errors.push(`Item ${index + 1}: nome do produto ausente`);
      }
      if (item.unit_price === undefined || item.unit_price === null) {
        errors.push(`Item ${index + 1}: preço unitário ausente`);
      }
    });
  }

  // Required: Total
  if (data.total === undefined || data.total === null) {
    errors.push('Total do pedido ausente');
  } else if (data.total < 0) {
    errors.push('Total do pedido inválido (negativo)');
  }

  // Required: Payment method (only if order is paid/finalized)
  const finalizedStatuses = ['paid', 'completed', 'delivered', 'ready', 'entregue', 'pronto', 'finalizado'];
  if (data.status && finalizedStatuses.includes(data.status.toLowerCase())) {
    if (!data.paymentMethod || data.paymentMethod.trim() === '') {
      errors.push('Forma de pagamento ausente (pedido finalizado)');
    }
  }

  // Warnings (non-blocking)
  if (!data.origin || data.origin.trim() === '') {
    warnings.push('Origem do pedido não identificada');
  }
  if (!data.customerName) {
    warnings.push('Nome do cliente não informado');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Extract and normalize order origin label
 * Priority: integration > table > counter > delivery > pickup > fallback
 */
export function extractOrderOrigin(order: Order & { 
  order_type?: string; 
  source?: string | null;
  table_number?: number | null;
  command_number?: number | null;
  eat_here?: boolean | null;
  eat_in?: boolean | null;
  integration_order_id?: string | null;
}): string {
  const source = String(order.source || '').toLowerCase();
  const orderType = String(order.order_type || '').toLowerCase();
  const eatHere = order.eat_here ?? order.eat_in;

  // 1. Integrations (iFood, Rappi, etc.)
  if (source === 'ifood' || order.integration_order_id?.toLowerCase().includes('ifood')) {
    return 'IFOOD';
  }
  if (source === 'rappi') {
    return 'RAPPI';
  }
  if (source === 'uber_eats' || source === 'ubereats') {
    return 'UBER EATS';
  }
  if (source === '99food') {
    return '99 FOOD';
  }
  if (source === 'whatsapp') {
    return 'WHATSAPP';
  }

  // 2. Kiosk / Totem
  if (source === 'kiosk' || source === 'totem') {
    return eatHere ? 'TOTEM - COMER AQUI' : 'TOTEM - LEVAR';
  }

  // 3. Table
  if (orderType === 'table' || order.table_number) {
    const tableNum = order.table_number || 
      order.customer_name?.match(/MESA (\d+)/i)?.[1] || '';
    return tableNum ? `MESA ${tableNum}` : 'MESA';
  }

  // 4. Comanda
  if (orderType === 'dine_in' || order.command_number) {
    const cmdNum = order.command_number || '';
    return cmdNum ? `COMANDA ${cmdNum}` : 'COMANDA';
  }

  // 5. Counter / Balcão
  if (orderType === 'counter') {
    return eatHere ? 'BALCÃO - COMER AQUI' : 'BALCÃO - LEVAR';
  }

  // 6. Phone order
  if (source === 'phone' || orderType === 'phone') {
    return 'TELEFONE';
  }

  // 7. Online / Delivery
  if (orderType === 'delivery') {
    return source === 'phone' ? 'DELIVERY - LIGAÇÃO' : 'ONLINE';
  }

  // 8. Local pickup
  if (orderType === 'local' || orderType === 'pickup') {
    return 'RETIRADA';
  }

  // 9. App / QR Code
  if (source === 'app' || source === 'qrcode' || source === 'qr') {
    return 'APP / QR CODE';
  }

  // Fallback with logging
  console.warn('[TicketValidation] Origem não identificada para pedido:', {
    id: order.id,
    order_type: orderType,
    source,
  });
  
  return 'ORIGEM NÃO IDENTIFICADA';
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.valid) {
    return '';
  }
  
  const errorList = result.errors.map(e => `• ${e}`).join('\n');
  return `Impressão bloqueada: dados obrigatórios faltando\n\n${errorList}`;
}

/**
 * Log validation failure for debugging
 */
export function logValidationFailure(
  ticketType: 'production' | 'customer',
  orderId: string,
  result: ValidationResult
): void {
  console.error(`[TicketValidation] Falha na validação do ticket ${ticketType}:`, {
    orderId,
    errors: result.errors,
    warnings: result.warnings,
    timestamp: new Date().toISOString(),
  });
}
