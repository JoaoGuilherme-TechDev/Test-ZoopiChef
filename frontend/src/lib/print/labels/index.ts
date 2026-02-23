/**
 * Label Printing Module
 * 
 * Provides support for thermal transfer label printers:
 * - Zebra (ZPL language)
 * - Elgin (TSPL language)
 * - Aogox (TSPL language)
 * 
 * @example
 * ```typescript
 * import { generateLabelCode, LabelData } from '@/lib/print/labels';
 * 
 * const data: LabelData = {
 *   company_name: 'Pizzaria Exemplo',
 *   order_number: '123',
 *   customer_name: 'João Silva',
 *   box_number: 1,
 *   total_boxes: 3,
 * };
 * 
 * const zplCode = generateLabelByLanguage('zpl', data, 50, 30);
 * ```
 */

export * from './types';
export * from './generator';
