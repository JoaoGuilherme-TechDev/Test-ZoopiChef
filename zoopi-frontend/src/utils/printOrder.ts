/**
 * @deprecated This file is deprecated. Use the new print module instead:
 * 
 * ```typescript
 * import { getPrintService } from '@/lib/print';
 * 
 * const printService = getPrintService();
 * await printService.printOrder(order, 'Company Name');
 * ```
 */

import { Order } from '@/hooks/useOrders';
import { getPrintService } from '@/lib/print';

/**
 * @deprecated Use getPrintService().printOrder() instead
 */
export function printOrder(order: Order, companyName?: string): void {
  getPrintService().printOrder(order, companyName);
}
