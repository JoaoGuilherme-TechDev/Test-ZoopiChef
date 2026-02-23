/**
 * Label Code Generator
 * Generates ZPL (Zebra), TSPL (Aogox/Elgin), and EPL code for thermal labels
 */

import { LabelData, LabelLanguage, LabelTemplate } from './types';

/**
 * Replace placeholders in template with actual data
 */
export function generateLabelCode(template: LabelTemplate, data: LabelData): string {
  let code = template.template_code;
  
  // Replace all placeholders
  code = code.replace(/\{\{company_name\}\}/g, sanitizeText(data.company_name, template.language));
  code = code.replace(/\{\{order_number\}\}/g, String(data.order_number));
  code = code.replace(/\{\{customer_name\}\}/g, sanitizeText(data.customer_name, template.language));
  code = code.replace(/\{\{box_number\}\}/g, String(data.box_number));
  code = code.replace(/\{\{total_boxes\}\}/g, String(data.total_boxes));
  code = code.replace(/\{\{date\}\}/g, data.date || new Date().toLocaleDateString('pt-BR'));
  code = code.replace(/\{\{items_summary\}\}/g, sanitizeText(data.items_summary || '', template.language));
  
  return code;
}

/**
 * Sanitize text for label printing (remove special chars that cause issues)
 */
function sanitizeText(text: string, language: LabelLanguage): string {
  if (!text) return '';
  
  // Remove or replace problematic characters
  let sanitized = text
    .replace(/[áàâãä]/gi, 'a')
    .replace(/[éèêë]/gi, 'e')
    .replace(/[íìîï]/gi, 'i')
    .replace(/[óòôõö]/gi, 'o')
    .replace(/[úùûü]/gi, 'u')
    .replace(/[ç]/gi, 'c')
    .replace(/[ñ]/gi, 'n')
    .replace(/[^\x20-\x7E]/g, ''); // Remove non-ASCII
  
  // Truncate based on language limitations
  const maxLength = language === 'zpl' ? 50 : 30;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + '...';
  }
  
  return sanitized;
}

/**
 * Generate default ZPL template for Zebra printers
 */
export function generateDefaultZPL(data: LabelData, widthMm: number = 50, heightMm: number = 30): string {
  // Convert mm to dots (assuming 203 DPI: 1mm = 8 dots)
  const dotsPerMm = 8;
  const width = widthMm * dotsPerMm;
  const height = heightMm * dotsPerMm;
  
  return `^XA
^PW${width}
^LL${height}
^FO20,10^A0N,24,24^FD${sanitizeText(data.company_name, 'zpl')}^FS
^FO20,40^A0N,32,32^FDPedido: ${data.order_number}^FS
^FO20,80^A0N,20,20^FD${sanitizeText(data.customer_name, 'zpl')}^FS
^FO20,110^A0N,48,48^FDCaixa ${data.box_number}/${data.total_boxes}^FS
^FO20,170^BY2^BCN,50,Y,N,N^FD${data.order_number}^FS
^XZ`;
}

/**
 * Generate default TSPL template for Aogox/Elgin printers
 */
export function generateDefaultTSPL(data: LabelData, widthMm: number = 50, heightMm: number = 30): string {
  return `SIZE ${widthMm} mm, ${heightMm} mm
GAP 2 mm, 0 mm
DIRECTION 1
CLS
TEXT 20,10,"2",0,1,1,"${sanitizeText(data.company_name, 'tspl')}"
TEXT 20,40,"3",0,1,1,"Pedido: ${data.order_number}"
TEXT 20,70,"1",0,1,1,"${sanitizeText(data.customer_name, 'tspl')}"
TEXT 20,100,"4",0,1,1,"Caixa ${data.box_number}/${data.total_boxes}"
BARCODE 20,140,"128",50,1,0,2,2,"${data.order_number}"
PRINT 1`;
}

/**
 * Generate default EPL template
 */
export function generateDefaultEPL(data: LabelData, widthMm: number = 50, heightMm: number = 30): string {
  const dotsPerMm = 8;
  const width = widthMm * dotsPerMm;
  
  return `N
q${width}
Q${heightMm * dotsPerMm},24
A20,10,0,2,1,1,N,"${sanitizeText(data.company_name, 'epl')}"
A20,40,0,3,1,1,N,"Pedido: ${data.order_number}"
A20,70,0,1,1,1,N,"${sanitizeText(data.customer_name, 'epl')}"
A20,100,0,4,1,1,N,"Caixa ${data.box_number}/${data.total_boxes}"
B20,140,0,1,2,2,50,N,"${data.order_number}"
P1`;
}

/**
 * Generate label code based on language
 */
export function generateLabelByLanguage(
  language: LabelLanguage,
  data: LabelData,
  widthMm: number = 50,
  heightMm: number = 30
): string {
  switch (language) {
    case 'zpl':
      return generateDefaultZPL(data, widthMm, heightMm);
    case 'tspl':
      return generateDefaultTSPL(data, widthMm, heightMm);
    case 'epl':
      return generateDefaultEPL(data, widthMm, heightMm);
    default:
      return generateDefaultZPL(data, widthMm, heightMm);
  }
}

/**
 * Generate multiple labels for all boxes in an order
 */
export function generateLabelsForOrder(
  template: LabelTemplate,
  baseData: Omit<LabelData, 'box_number'>,
  totalBoxes: number
): string[] {
  const labels: string[] = [];
  
  for (let i = 1; i <= totalBoxes; i++) {
    const data: LabelData = {
      ...baseData,
      box_number: i,
      total_boxes: totalBoxes,
    };
    labels.push(generateLabelCode(template, data));
  }
  
  return labels;
}
