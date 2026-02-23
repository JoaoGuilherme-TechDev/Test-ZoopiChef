/**
 * ESC/POS Driver Module
 * 
 * Complete ESC/POS driver for 80mm thermal printers with:
 * - H2/H3/H4 semantic text styles
 * - CODE128 barcode generation
 * - Text wrapping and formatting utilities
 * 
 * Profile: 80mm / 48 columns / Font A
 * 
 * @example
 * ```typescript
 * import { escpos } from '@/lib/print/escpos';
 * 
 * let ticket = escpos.reset();
 * ticket += escpos.h2('MESA 1', { center: true });
 * ticket += escpos.separator();
 * ticket += escpos.h2('PEDIDO N° 108');
 * ticket += escpos.separator();
 * ticket += escpos.h3('CLIENTE');
 * ticket += escpos.h4('Nome: João Silva');
 * ticket += escpos.separator();
 * ticket += escpos.lineKeyValue('TOTAL:', 'R$ 50,00');
 * 
 * const barcode = escpos.printCode128('ORDER:ABCD1234');
 * if (barcode.success) {
 *   ticket += barcode.data;
 * }
 * 
 * ticket += escpos.reset(); // Final reset
 * ```
 */

// Export all commands
export { ESCPOS, PRINTER_PROFILE, LINE } from './commands';

// Export all style functions
export {
  reset,
  h2,
  h3,
  h4,
  separator,
  separatorDashed,
  wrapText,
  lineKeyValue,
  formatCurrency,
  getColumns,
  type StyleOptions,
} from './styles';

// Export barcode functions
export {
  printCode128,
  getOrderBarcodePayload,
  getOrderNumberBarcodePayload,
  logBarcodeGeneration,
  type BarcodeOptions,
  type BarcodeResult,
} from './barcode';

// Export main order ticket template
export {
  buildMainOrderTicketEscPos,
  orderToMainTicketData,
  type MainOrderTicketData,
} from './mainOrderTicket';

// Export kiosk receipt template
export {
  buildKioskReceiptEscPos,
  type KioskReceiptData,
  type KioskReceiptItem,
} from './kioskReceipt';

// Convenience namespace export
import * as commands from './commands';
import * as styles from './styles';
import * as barcode from './barcode';

export const escpos = {
  // Commands
  ...commands.ESCPOS,
  PROFILE: commands.PRINTER_PROFILE,
  LINE: commands.LINE,
  
  // Style functions
  reset: styles.reset,
  h2: styles.h2,
  h3: styles.h3,
  h4: styles.h4,
  separator: styles.separator,
  separatorDashed: styles.separatorDashed,
  wrapText: styles.wrapText,
  lineKeyValue: styles.lineKeyValue,
  formatCurrency: styles.formatCurrency,
  getColumns: styles.getColumns,
  
  // Barcode functions
  printCode128: barcode.printCode128,
  getOrderBarcodePayload: barcode.getOrderBarcodePayload,
  getOrderNumberBarcodePayload: barcode.getOrderNumberBarcodePayload,
  logBarcodeGeneration: barcode.logBarcodeGeneration,
};

export default escpos;
