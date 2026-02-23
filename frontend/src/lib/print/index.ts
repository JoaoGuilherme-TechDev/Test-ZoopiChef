/**
 * Print Module
 * 
 * Provides a pluggable architecture for printing orders.
 * 
 * Current Implementation:
 * - BrowserPrintProvider: Uses window.print() for native browser printing
 * 
 * Future Extensions (not yet implemented):
 * - ThermalPrintProvider: Direct USB thermal printer support
 * - NetworkPrintProvider: Network/IP printer support (ESC/POS)
 * - BluetoothPrintProvider: Bluetooth thermal printer support
 * 
 * @example
 * ```typescript
 * import { getPrintService } from '@/lib/print';
 * 
 * const printService = getPrintService();
 * const result = await printService.printOrder(order, 'Company Name');
 * 
 * if (result.success) {
 *   console.log('Printed at:', result.printedAt);
 * } else {
 *   console.error('Print failed:', result.error);
 * }
 * ```
 */

export * from './types';
export * from './PrintService';
export * from './orderOriginLabel';
export * from './providers';
export * from './partialKitchenTicket';
export * from './tableBill';
export * from './productionTicket';
export * from './ticketValidation';
export * from './delivererTicket';
export * from './printQueueHelper';
export * from './sommelierTicket';
export * from './rotisseurTicket';
export * from './browserPrint';

// ESC/POS Driver exports
export * from './escpos';
export { escpos } from './escpos';
export { 
  buildMesaTicketEscPos, 
  createMesaTicketMetadata,
  validateMesaTicket,
  type MesaTicketData,
  type MesaTicketValidation,
} from './escpos/mesaTicketTemplate';
export { 
  isNetworkPrintServiceAvailable,
  testPrinterConnection,
  printToNetwork,
  printTicketToNetwork,
  createTicketFromOrder,
  type NetworkPrintOptions,
  type PrintTicket 
} from './NetworkPrintService';

// Re-export for backward compatibility
import { getPrintService } from './PrintService';
import { Order } from '@/hooks/useOrders';

/**
 * Legacy function for backward compatibility
 * @deprecated Use getPrintService().printOrder() instead
 */
export function printOrder(order: Order, companyName?: string): void {
  getPrintService().printOrder(order, companyName);
}
