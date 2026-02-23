/**
 * Fiscal Service Abstraction Layer
 * 
 * This service provides a unified interface for fiscal document operations.
 * Providers like Integra Notas implement the FiscalProvider interface.
 * 
 * IMPORTANT: Actual API calls are NOT implemented yet.
 * This is a preparation layer for future integration.
 */

import { supabase } from '@/lib/supabase-shim';
import type {
  FiscalProviderConfig,
  FiscalDocument,
  FiscalDocumentLog,
  EmitInvoiceRequest,
  EmitInvoiceResponse,
  CancelInvoiceRequest,
  CancelInvoiceResponse,
  GetInvoiceStatusRequest,
  GetInvoiceStatusResponse,
  FiscalOrderEvent,
  FiscalProviderType,
  FiscalDocumentStatus,
} from './types';

/**
 * Interface that fiscal providers must implement
 */
export interface FiscalProvider {
  readonly providerType: FiscalProviderType;
  
  emitInvoice(request: EmitInvoiceRequest): Promise<EmitInvoiceResponse>;
  cancelInvoice(request: CancelInvoiceRequest): Promise<CancelInvoiceResponse>;
  getInvoiceStatus(request: GetInvoiceStatusRequest): Promise<GetInvoiceStatusResponse>;
  
  // Webhook handling
  handleWebhook?(payload: unknown): Promise<void>;
}

/**
 * Main Fiscal Service - orchestrates fiscal operations
 */
export class FiscalService {
  private companyId: string;
  private config: FiscalProviderConfig | null = null;
  private provider: FiscalProvider | null = null;

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  /**
   * Initialize the service by loading configuration
   */
  async initialize(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('fiscal_config')
        .select('*')
        .eq('company_id', this.companyId)
        .maybeSingle();

      if (error) {
        console.error('[FiscalService] Error loading config:', error);
        return false;
      }

      if (!data) {
        console.log('[FiscalService] No fiscal config found for company');
        return false;
      }

      // Cast to access new columns that may not be in generated types yet
      const configData = data as Record<string, unknown>;

      this.config = {
        id: data.id,
        company_id: data.company_id,
        provider: (data.provider || 'integra_notas') as FiscalProviderType,
        environment: (data.environment || 'sandbox') as 'sandbox' | 'production',
        is_enabled: (configData.is_enabled as boolean) ?? false,
        api_token: data.api_token ?? undefined,
        api_secret: (configData.api_secret as string) ?? undefined,
        webhook_secret: (configData.webhook_secret as string) ?? undefined,
        settings: ((configData.provider_settings ?? {}) as Record<string, unknown>),
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      // TODO: Initialize provider based on config.provider
      // this.provider = this.createProvider(this.config);

      return true;
    } catch (err) {
      console.error('[FiscalService] Initialization error:', err);
      return false;
    }
  }

  /**
   * Check if fiscal integration is enabled and configured
   */
  isEnabled(): boolean {
    return this.config?.is_enabled ?? false;
  }

  /**
   * Get current provider configuration
   */
  getConfig(): FiscalProviderConfig | null {
    return this.config;
  }

  /**
   * Emit an invoice for an order
   * 
   * NOTE: Actual API integration not implemented yet.
   * This creates a pending document record for future processing.
   */
  async emitInvoice(request: EmitInvoiceRequest): Promise<EmitInvoiceResponse> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'Fiscal integration is not enabled',
      };
    }

    try {
      // Create pending fiscal document
      // Use 'as any' to allow new columns not yet in generated types
      const insertData = {
        company_id: this.companyId,
        order_id: request.orderId,
        document_type: request.documentType || 'nfce',
        status: 'pending',
        provider_type: this.config?.provider || 'integra_notas',
        recipient_name: request.recipientName,
        recipient_document: request.recipientDocument,
        recipient_email: request.recipientEmail,
        total_cents: 0,
        retry_count: 0,
        max_retries: 3,
        can_retry: true,
      };

      const { data: doc, error } = await supabase
        .from('fiscal_documents')
        .insert(insertData as any)
        .select()
        .single();

      if (error) {
        console.error('[FiscalService] Error creating document:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Log the creation
      await this.logEvent(doc.id, 'document_created', undefined, 'pending', 'Documento fiscal criado');

      // TODO: When provider is implemented, call:
      // return this.provider.emitInvoice(request);

      return {
        success: true,
        documentId: doc.id,
        status: 'pending',
      };
    } catch (err) {
      console.error('[FiscalService] emitInvoice error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel an existing invoice
   */
  async cancelInvoice(request: CancelInvoiceRequest): Promise<CancelInvoiceResponse> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'Fiscal integration is not enabled',
      };
    }

    try {
      // Get current document
      const { data: doc, error: fetchError } = await supabase
        .from('fiscal_documents')
        .select('*')
        .eq('id', request.documentId)
        .eq('company_id', this.companyId)
        .single();

      if (fetchError || !doc) {
        return {
          success: false,
          error: 'Document not found',
        };
      }

      // Only authorized documents can be cancelled
      if (doc.status !== 'authorized') {
        return {
          success: false,
          error: `Cannot cancel document with status: ${doc.status}`,
        };
      }

      // Update to processing (cancellation in progress)
      const { error: updateError } = await supabase
        .from('fiscal_documents')
        .update({
          status: 'processing',
          cancellation_reason: request.reason,
        })
        .eq('id', request.documentId);

      if (updateError) {
        return {
          success: false,
          error: updateError.message,
        };
      }

      await this.logEvent(
        request.documentId,
        'cancellation_requested',
        'authorized',
        'processing',
        `Cancelamento solicitado: ${request.reason}`
      );

      // TODO: When provider is implemented, call:
      // return this.provider.cancelInvoice(request);

      return {
        success: true,
        status: 'processing',
      };
    } catch (err) {
      console.error('[FiscalService] cancelInvoice error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the status of an invoice
   */
  async getInvoiceStatus(request: GetInvoiceStatusRequest): Promise<GetInvoiceStatusResponse> {
    try {
      const { data: doc, error } = await supabase
        .from('fiscal_documents')
        .select('*')
        .eq('id', request.documentId)
        .eq('company_id', this.companyId)
        .single();

      if (error || !doc) {
        return {
          success: false,
          error: 'Document not found',
        };
      }

      return {
        success: true,
        status: doc.status as FiscalDocumentStatus,
        accessKey: doc.access_key ?? undefined,
        pdfUrl: doc.pdf_url ?? undefined,
      };
    } catch (err) {
      console.error('[FiscalService] getInvoiceStatus error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Get fiscal document by order ID
   */
  async getDocumentByOrderId(orderId: string): Promise<FiscalDocument | null> {
    try {
      const { data, error } = await supabase
        .from('fiscal_documents')
        .select('*')
        .eq('order_id', orderId)
        .eq('company_id', this.companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[FiscalService] Error fetching document:', error);
        return null;
      }

      return data as unknown as FiscalDocument | null;
    } catch (err) {
      console.error('[FiscalService] getDocumentByOrderId error:', err);
      return null;
    }
  }

  /**
   * Get document history/logs
   */
  async getDocumentLogs(documentId: string): Promise<FiscalDocumentLog[]> {
    try {
      const { data, error } = await supabase
        .from('fiscal_document_logs')
        .select('*')
        .eq('fiscal_document_id', documentId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[FiscalService] Error fetching logs:', error);
        return [];
      }

      return (data || []) as unknown as FiscalDocumentLog[];
    } catch (err) {
      console.error('[FiscalService] getDocumentLogs error:', err);
      return [];
    }
  }

  /**
   * Log a fiscal event
   */
  private async logEvent(
    documentId: string,
    eventType: string,
    statusFrom?: string,
    statusTo?: string,
    message?: string,
    providerResponse?: Record<string, unknown>
  ): Promise<void> {
    try {
      const logData = {
        fiscal_document_id: documentId,
        event_type: eventType,
        status_from: statusFrom,
        status_to: statusTo,
        message,
        provider_response: providerResponse,
      };
      await supabase.from('fiscal_document_logs').insert(logData as any);
    } catch (err) {
      console.error('[FiscalService] Error logging event:', err);
    }
  }

  /**
   * Generate webhook URL for this company
   */
  getWebhookUrl(): string {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://your-domain.com';
    
    return `${baseUrl}/api/webhooks/fiscal/${this.companyId}`;
  }
}

/**
 * Create a fiscal service instance for a company
 */
export async function createFiscalService(companyId: string): Promise<FiscalService> {
  const service = new FiscalService(companyId);
  await service.initialize();
  return service;
}
