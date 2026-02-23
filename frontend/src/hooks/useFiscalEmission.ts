import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface FiscalError {
  code: string;
  message: string;
  details?: string;
  suggestion?: string;
}

export interface FiscalEmissionResult {
  success: boolean;
  documentId?: string;
  accessKey?: string;
  protocol?: string;
  pdfUrl?: string;
  error?: FiscalError;
}

interface EmitDocumentParams {
  orderId?: string;
  documentType: 'nfe' | 'nfce' | 'cupom_controle';
  customer?: {
    id?: string;
    name: string;
    cpf_cnpj?: string | null;
    email?: string | null;
    address?: string | null;
    whatsapp?: string | null;
  } | null;
  items: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    ncm?: string;
    cfop?: string;
  }>;
  totalCents: number;
  sendWhatsApp?: boolean;
}

export function useFiscalEmission() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const emitDocument = useMutation({
    mutationFn: async (params: EmitDocumentParams): Promise<FiscalEmissionResult> => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // For cupom_controle, we don't need SEFAZ
      if (params.documentType === 'cupom_controle') {
        // Just create a local control coupon
        const { data: doc, error } = await supabase
          .from('fiscal_documents')
          .insert({
            company_id: company.id,
            order_id: params.orderId,
            document_type: 'cupom_controle',
            status: 'authorized',
            number: Date.now(),
            series: 0,
            recipient_name: params.customer?.name || 'Consumidor Final',
            recipient_document: params.customer?.cpf_cnpj,
            recipient_email: params.customer?.email,
            total_cents: params.totalCents,
            authorization_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        // Send via WhatsApp if requested and customer has phone
        if (params.sendWhatsApp && params.customer?.whatsapp) {
          await sendFiscalDocumentWhatsApp(company.id, doc.id, params.customer.whatsapp, 'cupom_controle');
        }

        return {
          success: true,
          documentId: doc.id,
        };
      }

      // For NFC-e and NF-e, call the fiscal-emit edge function
      const { data: result, error } = await supabase.functions.invoke('fiscal-emit', {
        body: {
          companyId: company.id,
          orderId: params.orderId,
          documentType: params.documentType,
          customer: params.customer,
          items: params.items,
          totalCents: params.totalCents,
        },
      });

      if (error) {
        // Parse error from edge function
        const fiscalError: FiscalError = {
          code: 'EDGE_ERROR',
          message: error.message || 'Erro ao processar emissão fiscal',
        };
        return { success: false, error: fiscalError };
      }

      if (!result.success) {
        // Parse SEFAZ error
        const fiscalError: FiscalError = {
          code: result.errorCode || 'UNKNOWN',
          message: result.errorMessage || result.error || 'Erro desconhecido',
          details: result.errorDetails,
          suggestion: result.suggestion,
        };
        return { success: false, error: fiscalError };
      }

      // Success! Send via WhatsApp if requested
      if (params.sendWhatsApp && params.customer?.whatsapp && result.documentId) {
        await sendFiscalDocumentWhatsApp(
          company.id, 
          result.documentId, 
          params.customer.whatsapp, 
          params.documentType
        );
      }

      return {
        success: true,
        documentId: result.documentId,
        accessKey: result.accessKey,
        protocol: result.protocol,
        pdfUrl: result.pdfUrl,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      if (result.success) {
        toast.success('Documento fiscal emitido com sucesso!');
      }
    },
    onError: (error: any) => {
      toast.error('Erro na emissão: ' + error.message);
    },
  });

  return {
    emitDocument,
    isEmitting: emitDocument.isPending,
  };
}

// Helper function to send fiscal document via WhatsApp
async function sendFiscalDocumentWhatsApp(
  companyId: string,
  documentId: string,
  phone: string,
  documentType: 'nfe' | 'nfce' | 'cupom_controle'
) {
  try {
    // Build message based on document type
    let docTypeName = 'Cupom Fiscal';
    if (documentType === 'nfe') docTypeName = 'Nota Fiscal Eletrônica (NF-e)';
    if (documentType === 'nfce') docTypeName = 'Cupom Fiscal Eletrônico (NFC-e)';

    // Get document details
    const { data: doc } = await supabase
      .from('fiscal_documents')
      .select('*, company:companies(name)')
      .eq('id', documentId)
      .single();

    if (!doc) return;

    const message = `🧾 *${docTypeName}*\n\n` +
      `Estabelecimento: ${doc.company?.name || 'Não informado'}\n` +
      `Número: ${doc.number}\n` +
      `Valor: R$ ${((doc.total_cents || 0) / 100).toFixed(2)}\n` +
      (doc.access_key ? `\nChave de Acesso: ${doc.access_key}\n` : '') +
      `\nObrigado pela preferência! 🙏`;

    // Record message as pending
    const { data: outbound, error: insertError } = await supabase
      .from('whatsapp_outbound_messages')
      .insert({
        company_id: companyId,
        to_phone: phone,
        message_text: message,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error recording WhatsApp message:', insertError);
      return;
    }

    // Send via edge function
    const { error } = await supabase.functions.invoke('send-whatsapp-direct', {
      body: {
        company_id: companyId,
        outbound_id: outbound.id,
        phone,
        message,
      },
    });

    if (error) {
      console.error('Error sending WhatsApp:', error);
      await supabase
        .from('whatsapp_outbound_messages')
        .update({ status: 'failed', error_message: error.message })
        .eq('id', outbound.id);
    }
  } catch (err) {
    console.error('Error in sendFiscalDocumentWhatsApp:', err);
  }
}
