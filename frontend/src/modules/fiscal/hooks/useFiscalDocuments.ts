import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { FiscalDocument, FiscalFormData, FiscalConfig } from '../types';

export function useFiscalDocuments() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Fetch fiscal configuration
  const configQuery = useQuery({
    queryKey: ['fiscal-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await (supabase as any)
        .from('fiscal_config')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data as FiscalConfig | null;
    },
    enabled: !!company?.id,
  });

  // Fetch fiscal documents
  const documentsQuery = useQuery({
    queryKey: ['fiscal-documents', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('fiscal_documents')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as FiscalDocument[];
    },
    enabled: !!company?.id,
  });

  // Create fiscal document
  const createDocument = useMutation({
    mutationFn: async (data: FiscalFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      if (!configQuery.data) throw new Error('Configuração fiscal não encontrada');

      const config = configQuery.data;
      let nextNumber: number;
      let series: number;

      switch (data.document_type) {
        case 'nfe':
          nextNumber = config.next_nfe_number;
          series = config.nfe_series;
          break;
        case 'nfce':
          nextNumber = config.next_nfce_number;
          series = config.nfce_series;
          break;
        case 'nfse':
          nextNumber = config.next_nfse_number;
          series = config.nfse_series;
          break;
      }

      // Calculate totals
      const totalCents = data.items.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price_cents), 0);

      // Create document
      const { data: document, error } = await (supabase as any)
        .from('fiscal_documents')
        .insert({
          company_id: company.id,
          order_id: data.order_id || null,
          document_type: data.document_type,
          status: 'draft',
          number: nextNumber,
          series: series,
          recipient_name: data.recipient_name,
          recipient_document: data.recipient_document,
          recipient_email: data.recipient_email,
          total_cents: totalCents,
          icms_cents: 0,
          ipi_cents: 0,
          pis_cents: 0,
          cofins_cents: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Create document items
      const items = data.items.map(item => ({
        document_id: document.id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        ncm: item.ncm,
        cfop: item.cfop,
        unit: item.unit,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        total_cents: item.quantity * item.unit_price_cents,
        icms_rate: 0,
        ipi_rate: 0,
        pis_rate: 0,
        cofins_rate: 0,
      }));

      await (supabase as any)
        .from('fiscal_document_items')
        .insert(items);

      return document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      toast.success('Documento fiscal criado');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar documento: ' + error.message);
    },
  });

  // Send document for authorization
  const authorizeDocument = useMutation({
    mutationFn: async (documentId: string) => {
      // Update status to processing
      const { error: updateError } = await (supabase as any)
        .from('fiscal_documents')
        .update({ status: 'processing' })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Call edge function to process with fiscal API
      const { data, error } = await supabase.functions.invoke('fiscal-emit', {
        body: { documentId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      toast.success('Documento enviado para autorização');
    },
    onError: (error: any) => {
      toast.error('Erro ao autorizar: ' + error.message);
    },
  });

  // Cancel document
  const cancelDocument = useMutation({
    mutationFn: async ({ documentId, reason }: { documentId: string; reason: string }) => {
      const { error } = await supabase.functions.invoke('fiscal-cancel', {
        body: { documentId, reason },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      toast.success('Documento cancelado');
    },
    onError: (error: any) => {
      toast.error('Erro ao cancelar: ' + error.message);
    },
  });

  // Download PDF
  const downloadPdf = async (document: FiscalDocument) => {
    if (!document.pdf_url) {
      toast.error('PDF não disponível');
      return;
    }
    window.open(document.pdf_url, '_blank');
  };

  // Download XML
  const downloadXml = async (document: FiscalDocument) => {
    if (!document.xml_content) {
      toast.error('XML não disponível');
      return;
    }
    
    const blob = new Blob([document.xml_content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.document_type}_${document.number}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    config: configQuery.data,
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading || configQuery.isLoading,
    createDocument,
    authorizeDocument,
    cancelDocument,
    downloadPdf,
    downloadXml,
  };
}
