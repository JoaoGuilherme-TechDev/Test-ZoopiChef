/**
 * Label Printing Types
 * Support for thermal transfer printers: Zebra, Elgin, Aogox
 */

export type LabelPrinterType = 'zebra' | 'elgin' | 'aogox';
export type LabelLanguage = 'zpl' | 'tspl' | 'epl';
export type LabelConnectionType = 'network' | 'usb';

export interface LabelPrinter {
  id: string;
  company_id: string;
  name: string;
  printer_type: LabelPrinterType;
  connection_type: LabelConnectionType;
  printer_host: string | null;
  printer_port: number;
  printer_name: string | null;
  label_width_mm: number;
  label_height_mm: number;
  dpi: number;
  language: LabelLanguage;
  is_active: boolean;
  is_default: boolean;
  auto_print_orders: boolean;
  copies_per_box: number;
  created_at: string;
  updated_at: string;
}

export interface LabelTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  template_code: string;
  language: LabelLanguage;
  label_width_mm: number;
  label_height_mm: number;
  is_default: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface LabelData {
  company_name: string;
  order_number: string | number;
  customer_name: string;
  box_number: number;
  total_boxes: number;
  order_id?: string;
  items_summary?: string;
  date?: string;
}

export interface LabelPrintJob {
  printer: LabelPrinter;
  template: LabelTemplate;
  data: LabelData;
  copies?: number;
}

export interface LabelPrintResult {
  success: boolean;
  error?: string;
  printed_at?: Date;
  box_number?: number;
  total_boxes?: number;
}
