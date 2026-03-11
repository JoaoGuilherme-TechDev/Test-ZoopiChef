import { TaxRegime } from '../dto/upsert-fiscal-config.dto';
import { InvoiceType } from '../dto/emit-invoice.dto';

export interface InvoiceItem {
  name: string;
  ncm: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  cfop: string;
  icms_cst: string;
  icms_orig: number;
  icms_rate: number;
}

export interface InvoiceData {
  invoice_id: string;
  order_number: number;
  type: InvoiceType;
  company: {
    cnpj: string;
    ie: string;
    tax_regime: TaxRegime;
    is_sandbox: boolean;
  };
  certificate: {
    base64: string;
    password: string;
  };
  customer: {
    tax_id: string; // CPF ou CNPJ
    name?: string;
  };
  items: InvoiceItem[];
  total_amount: number;
}

export interface ProviderResponse {
  success: boolean;
  access_key?: string;
  invoice_number?: number;
  series?: number;
  protocol?: string;
  xml_url?: string;
  pdf_url?: string;
  error_message?: string;
  raw_response?: any;
}

/**
 * Interface Abstrata para Provedores Fiscais
 * Qualquer novo fornecedor (Focus, TecnoSpeed, etc) deve implementar esta classe
 */
export abstract class FiscalProvider {
  abstract emit(data: InvoiceData): Promise<ProviderResponse>;
  abstract cancel(invoiceId: string, reason: string): Promise<ProviderResponse>;
  abstract getStatus(invoiceId: string): Promise<ProviderResponse>;
}
