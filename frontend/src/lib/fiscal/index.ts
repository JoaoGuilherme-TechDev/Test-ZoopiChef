/**
 * Fiscal Integration Module
 * 
 * Prepared for Integra Notas and future fiscal providers.
 * 
 * Usage:
 * ```typescript
 * import { FiscalService, createFiscalService, emitFiscalEvent } from '@/lib/fiscal';
 * 
 * // Create service for a company
 * const fiscalService = await createFiscalService(companyId);
 * 
 * // Check if enabled
 * if (fiscalService.isEnabled()) {
 *   // Emit invoice
 *   const result = await fiscalService.emitInvoice({ orderId: '...' });
 * }
 * 
 * // Trigger event
 * await emitFiscalEvent({
 *   type: 'order_paid',
 *   orderId: '...',
 *   companyId: '...',
 *   total: 100,
 *   timestamp: new Date(),
 * });
 * ```
 */

export { FiscalService, createFiscalService } from './FiscalService';
export type { FiscalProvider } from './FiscalService';

export {
  onFiscalEvent,
  emitFiscalEvent,
  handleOrderPaid,
  handleOrderCancelled,
  handleOrderRefunded,
  handleOrderUpdated,
  initializeFiscalHooks,
  getFiscalEventFromOrderStatus,
} from './fiscalEventHooks';

export type {
  FiscalProviderType,
  FiscalEnvironment,
  FiscalDocumentType,
  FiscalDocumentStatus,
  FiscalProviderConfig,
  FiscalDocument,
  FiscalDocumentLog,
  EmitInvoiceRequest,
  EmitInvoiceResponse,
  CancelInvoiceRequest,
  CancelInvoiceResponse,
  GetInvoiceStatusRequest,
  GetInvoiceStatusResponse,
  FiscalEventType,
  FiscalOrderEvent,
} from './types';
