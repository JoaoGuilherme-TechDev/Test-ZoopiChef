/**
 * Fiscal Event Hooks
 * 
 * These hooks are called when order events occur that may trigger fiscal emission.
 * They are PREPARED for Integra Notas integration but do not make API calls yet.
 * 
 * Event Types:
 * - order_paid: Order payment confirmed
 * - order_cancelled: Order was cancelled
 * - order_refunded: Order was refunded
 * - order_updated: Order details were updated
 */

import { createFiscalService } from './FiscalService';
import type { FiscalOrderEvent, FiscalEventType } from './types';

/**
 * Handler registry for fiscal events
 */
type FiscalEventHandler = (event: FiscalOrderEvent) => Promise<void>;
const eventHandlers: Map<FiscalEventType, FiscalEventHandler[]> = new Map();

/**
 * Register a handler for a fiscal event type
 */
export function onFiscalEvent(type: FiscalEventType, handler: FiscalEventHandler): void {
  const handlers = eventHandlers.get(type) || [];
  handlers.push(handler);
  eventHandlers.set(type, handlers);
}

/**
 * Emit a fiscal event
 */
export async function emitFiscalEvent(event: FiscalOrderEvent): Promise<void> {
  console.log('[FiscalHooks] Event received:', event.type, event.orderId);
  
  const handlers = eventHandlers.get(event.type) || [];
  
  for (const handler of handlers) {
    try {
      await handler(event);
    } catch (err) {
      console.error('[FiscalHooks] Handler error:', err);
      // Continue processing other handlers
    }
  }
}

/**
 * Handle order paid event
 * This may trigger invoice emission if fiscal is enabled
 */
export async function handleOrderPaid(event: FiscalOrderEvent): Promise<void> {
  console.log('[FiscalHooks] Processing order_paid:', event.orderId);

  try {
    const fiscalService = await createFiscalService(event.companyId);
    
    if (!fiscalService.isEnabled()) {
      console.log('[FiscalHooks] Fiscal not enabled, skipping');
      return;
    }

    // Check if document already exists
    const existingDoc = await fiscalService.getDocumentByOrderId(event.orderId);
    
    if (existingDoc) {
      console.log('[FiscalHooks] Document already exists:', existingDoc.id);
      return;
    }

    // Create pending invoice
    const result = await fiscalService.emitInvoice({
      orderId: event.orderId,
      documentType: 'nfce',
      recipientName: event.customerName,
      recipientDocument: event.customerDocument,
    });

    if (result.success) {
      console.log('[FiscalHooks] Document created:', result.documentId);
    } else {
      console.error('[FiscalHooks] Failed to create document:', result.error);
    }
  } catch (err) {
    console.error('[FiscalHooks] handleOrderPaid error:', err);
  }
}

/**
 * Handle order cancelled event
 * This may trigger invoice cancellation if one exists
 */
export async function handleOrderCancelled(event: FiscalOrderEvent): Promise<void> {
  console.log('[FiscalHooks] Processing order_cancelled:', event.orderId);

  try {
    const fiscalService = await createFiscalService(event.companyId);
    
    if (!fiscalService.isEnabled()) {
      return;
    }

    const existingDoc = await fiscalService.getDocumentByOrderId(event.orderId);
    
    if (!existingDoc) {
      console.log('[FiscalHooks] No document to cancel');
      return;
    }

    if (existingDoc.status === 'authorized') {
      const result = await fiscalService.cancelInvoice({
        documentId: existingDoc.id,
        reason: 'Pedido cancelado pelo estabelecimento',
      });

      if (result.success) {
        console.log('[FiscalHooks] Cancellation requested');
      } else {
        console.error('[FiscalHooks] Cancellation failed:', result.error);
      }
    }
  } catch (err) {
    console.error('[FiscalHooks] handleOrderCancelled error:', err);
  }
}

/**
 * Handle order refunded event
 */
export async function handleOrderRefunded(event: FiscalOrderEvent): Promise<void> {
  console.log('[FiscalHooks] Processing order_refunded:', event.orderId);
  
  // Refunds may require NF-e de devolução or cancellation
  // Implementation depends on business rules and provider capabilities
  
  try {
    const fiscalService = await createFiscalService(event.companyId);
    
    if (!fiscalService.isEnabled()) {
      return;
    }

    const existingDoc = await fiscalService.getDocumentByOrderId(event.orderId);
    
    if (existingDoc && existingDoc.status === 'authorized') {
      // Log for future processing
      console.log('[FiscalHooks] Refund detected for authorized document:', existingDoc.id);
      // TODO: Implement refund handling based on provider capabilities
    }
  } catch (err) {
    console.error('[FiscalHooks] handleOrderRefunded error:', err);
  }
}

/**
 * Handle order updated event
 */
export async function handleOrderUpdated(event: FiscalOrderEvent): Promise<void> {
  console.log('[FiscalHooks] Processing order_updated:', event.orderId);
  
  // Order updates after invoice emission may require corrections
  // Implementation depends on what changed and when
  
  try {
    const fiscalService = await createFiscalService(event.companyId);
    
    if (!fiscalService.isEnabled()) {
      return;
    }

    const existingDoc = await fiscalService.getDocumentByOrderId(event.orderId);
    
    if (existingDoc) {
      console.log('[FiscalHooks] Order updated with existing document:', existingDoc.status);
      // TODO: Handle updates based on document status
    }
  } catch (err) {
    console.error('[FiscalHooks] handleOrderUpdated error:', err);
  }
}

/**
 * Initialize default event handlers
 */
export function initializeFiscalHooks(): void {
  console.log('[FiscalHooks] Initializing hooks');
  
  onFiscalEvent('order_paid', handleOrderPaid);
  onFiscalEvent('order_cancelled', handleOrderCancelled);
  onFiscalEvent('order_refunded', handleOrderRefunded);
  onFiscalEvent('order_updated', handleOrderUpdated);
}

/**
 * Utility to trigger fiscal event from order status change
 */
export function getFiscalEventFromOrderStatus(
  oldStatus: string | null,
  newStatus: string
): FiscalEventType | null {
  // Map order status transitions to fiscal events
  if (newStatus === 'pago' && oldStatus !== 'pago') {
    return 'order_paid';
  }
  
  if (newStatus === 'cancelado' && oldStatus !== 'cancelado') {
    return 'order_cancelled';
  }
  
  if (newStatus === 'reembolsado' && oldStatus !== 'reembolsado') {
    return 'order_refunded';
  }
  
  return null;
}
