/**
 * Fiscal Service Types
 * 
 * Types for fiscal document integration (NF-e, NFC-e, etc.)
 * Prepared for Integra Notas and future providers.
 */

export type FiscalProviderType = 'integra_notas' | 'focus_nfe' | 'nfse_sp' | 'manual';

export type FiscalEnvironment = 'sandbox' | 'production';

export type FiscalDocumentType = 'nfce' | 'nfe' | 'nfse' | 'sat';

export type FiscalDocumentStatus = 
  | 'pending'      // Aguardando emissão
  | 'processing'   // Em processamento no provedor
  | 'sent'         // Enviado para SEFAZ
  | 'authorized'   // Autorizado
  | 'rejected'     // Rejeitado
  | 'cancelled'    // Cancelado
  | 'error';       // Erro no processamento

export interface FiscalProviderConfig {
  id: string;
  company_id: string;
  provider: FiscalProviderType;
  environment: FiscalEnvironment;
  is_enabled: boolean;
  api_token?: string;
  api_secret?: string;
  webhook_secret?: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FiscalDocument {
  id: string;
  company_id: string;
  order_id?: string;
  provider_type: FiscalProviderType;
  document_type: FiscalDocumentType;
  status: FiscalDocumentStatus;
  external_id?: string;
  number?: number;
  series?: number;
  access_key?: string;
  protocol_number?: string;
  authorization_date?: string;
  xml_content?: string;
  pdf_url?: string;
  recipient_name?: string;
  recipient_document?: string;
  recipient_email?: string;
  total_cents: number;
  error_message?: string;
  error_code?: string;
  retry_count: number;
  max_retries: number;
  last_retry_at?: string;
  next_retry_at?: string;
  can_retry: boolean;
  provider_response?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FiscalDocumentLog {
  id: string;
  fiscal_document_id: string;
  event_type: string;
  status_from?: string;
  status_to?: string;
  message?: string;
  provider_response?: Record<string, unknown>;
  created_at: string;
}

// Emission Request Types
export interface EmitInvoiceRequest {
  orderId: string;
  documentType?: FiscalDocumentType;
  recipientName?: string;
  recipientDocument?: string;
  recipientEmail?: string;
}

export interface EmitInvoiceResponse {
  success: boolean;
  documentId?: string;
  externalId?: string;
  status?: FiscalDocumentStatus;
  error?: string;
  errorCode?: string;
}

export interface CancelInvoiceRequest {
  documentId: string;
  reason: string;
}

export interface CancelInvoiceResponse {
  success: boolean;
  status?: FiscalDocumentStatus;
  error?: string;
}

export interface GetInvoiceStatusRequest {
  documentId: string;
}

export interface GetInvoiceStatusResponse {
  success: boolean;
  status?: FiscalDocumentStatus;
  accessKey?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  error?: string;
}

// Order Event Types for Fiscal Hooks
export type FiscalEventType = 
  | 'order_paid'
  | 'order_cancelled'
  | 'order_refunded'
  | 'order_updated';

export interface FiscalOrderEvent {
  type: FiscalEventType;
  orderId: string;
  companyId: string;
  total: number;
  paymentMethod?: string;
  customerName?: string;
  customerDocument?: string;
  timestamp: Date;
}
