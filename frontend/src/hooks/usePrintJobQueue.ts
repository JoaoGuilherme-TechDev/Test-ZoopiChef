import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useEffect } from 'react';
import { createPrintJobV3, orderToTicketData, type TicketData } from '@/lib/print/v3';
import { buildMainOrderTicketEscPos, orderToMainTicketData } from '@/lib/print/escpos/mainOrderTicket';
import { generateOrderTrackingSection, uint8ArrayToBase64 } from '@/lib/print/bitmapEscPos';

export type PrintJobType =
  | 'order_ticket'
  | 'production_ticket'
  | 'deliverer_ticket'
  | 'table_bill'
  | 'comanda_bill'
  | 'cash_opening'
  | 'cash_sangria'
  | 'cash_closing'
  | 'credit_statement'
  | 'sommelier_ticket'
  | 'rotisseur_ticket'
  | 'test_print';

export interface PrintJobV3 {
  id: string;
  company_id: string;
  job_type: string;
  order_id: string | null;
  comanda_id: string | null;
  printer_id: string | null;
  printer_category: string | null;
  print_sector_id: string | null;
  ticket_data: any;
  raw_escpos: string | null;
  status: string;
  priority: number;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// Alias for backwards compatibility
export type PrintJob = PrintJobV3;

export function usePrintJobQueue() {
  const queryClient = useQueryClient();

  // Fetch pending print jobs from v3 queue
  const { data: pendingJobs = [], isLoading, refetch } = useQuery({
    queryKey: ['print-jobs-v3', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_job_queue_v3')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('[usePrintJobQueue] Error fetching jobs:', error);
        return [];
      }
      return (data || []) as PrintJobV3[];
    },
    refetchInterval: 30000, // Fallback polling every 30s
  });

  // Mark job as completed
  const markCompleted = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('print_job_queue_v3')
        .update({ 
          status: 'completed', 
          printed_at: new Date().toISOString() 
        })
        .eq('id', jobId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-jobs-v3'] });
    },
  });

  // Mark job as failed
  const markFailed = useMutation({
    mutationFn: async ({ jobId, errorMessage }: { jobId: string; errorMessage: string }) => {
      const { data: job } = await supabase
        .from('print_job_queue_v3')
        .select('retry_count, max_retries')
        .eq('id', jobId)
        .single();

      const retryCount = (job?.retry_count || 0) + 1;
      const maxRetries = job?.max_retries || 3;
      const status = retryCount >= maxRetries ? 'failed' : 'pending';

      const { error } = await supabase
        .from('print_job_queue_v3')
        .update({ 
          status, 
          retry_count: retryCount, 
          error_message: errorMessage 
        })
        .eq('id', jobId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-jobs-v3'] });
    },
  });

  // Create a print job for orders
  const createPrintJob = useMutation({
    mutationFn: async ({ 
      orderId, 
      printSectorId,
      companyId,
      source = 'manual',
      ticketType = 'production',
    }: { 
      orderId: string; 
      printSectorId?: string | null;
      companyId: string;
      source?: string;
      ticketType?: 'production' | 'full';
    }) => {
      // Fetch order with items
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`*, items:order_items(*)`)
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        throw new Error('Pedido não encontrado');
      }

      // Fetch company info
      const { data: company } = await supabase
        .from('companies')
        .select('name, phone')
        .eq('id', companyId)
        .single();

      const companyName = company?.name || 'Empresa';
      
      // Para ticket principal (full), gera ESC/POS pré-formatado
      if (ticketType === 'full') {
        try {
          const mainTicketData = orderToMainTicketData(
            order as any,
            companyName,
            company?.phone || undefined,
            undefined // website
          );

          // 1) Texto ESC/POS (sem CUT) em Latin1-safe bytes
          const rawEscPosText = buildMainOrderTicketEscPos(mainTicketData, { omitCut: true });
          const textBytes = new Uint8Array(rawEscPosText.length);
          for (let i = 0; i < rawEscPosText.length; i++) {
            textBytes[i] = rawEscPosText.charCodeAt(i) & 0xff;
          }

          // 2) Bitmap tracking (QR + barcode) + avanço + corte
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          const trackingUrl = baseUrl ? `${baseUrl}/acompanhar/${order.id}` : null;
          const barcodeText = order.order_number
            ? String(order.order_number).padStart(3, '0')
            : order.id.slice(0, 8).toUpperCase();

          const trackingBytes = await generateOrderTrackingSection(trackingUrl, barcodeText);
          const feedAfterBitmap = new Uint8Array([0x0a, 0x0a, 0x0a, 0x0a, 0x0a]); // 5x LF
          const cutBytes = new Uint8Array([0x1d, 0x56, 0x00]); // GS V 0

          const combined = new Uint8Array(
            textBytes.length + trackingBytes.length + feedAfterBitmap.length + cutBytes.length
          );
          combined.set(textBytes, 0);
          combined.set(trackingBytes, textBytes.length);
          combined.set(feedAfterBitmap, textBytes.length + trackingBytes.length);
          combined.set(cutBytes, textBytes.length + trackingBytes.length + feedAfterBitmap.length);

          const rawEscPos = uint8ArrayToBase64(combined);
          
          console.log('[usePrintJobQueue] Creating formatted ticket:', {
            orderId,
            orderNumber: order.order_number,
            textBytes: textBytes.length,
            trackingBytes: trackingBytes.length,
            totalBytes: combined.length,
            base64Length: rawEscPos.length,
          });
          
          const result = await createPrintJobV3({
            companyId,
            jobType: 'order_ticket',
            printerCategory: 'principal',
            orderId,
            rawEscPos,
            priority: 3,
            metadata: { 
              source,
              orderNumber: order.order_number,
              tableNumber: order.table_number,
            },
          });

          if (!result.success) {
            throw new Error(result.error || 'Erro ao criar job');
          }

          return result;
        } catch (escPosError) {
          console.error('[usePrintJobQueue] ESC/POS generation failed, using fallback:', escPosError);
          // Fallback para ticketData simples
        }
      }
      
      // Para produção ou fallback: usa ticketData simples
      const showPrices = ticketType === 'full';
      const ticketData = orderToTicketData(order as any, companyName, showPrices);

      const result = await createPrintJobV3({
        companyId,
        jobType: ticketType === 'production' ? 'production_ticket' : 'order_ticket',
        printSectorId: printSectorId || undefined,
        printerCategory: printSectorId ? undefined : 'principal',
        orderId,
        ticketData,
        priority: 3,
        metadata: { source },
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar job');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-jobs-v3'] });
    },
  });

  // Create a cash operation print job
  const createCashPrintJob = useMutation({
    mutationFn: async ({ 
      companyId,
      cashSessionId,
      jobType,
      metadata = {},
    }: { 
      companyId: string;
      cashSessionId: string;
      jobType: 'cash_opening' | 'cash_sangria' | 'cash_closing';
      metadata?: Record<string, unknown>;
    }) => {
      const ticketData: TicketData = {
        companyName: metadata.companyName as string || 'Empresa',
        orderNumber: cashSessionId.slice(0, 8),
        origin: jobType === 'cash_opening' ? 'SUPRIMENTO' : 
                jobType === 'cash_sangria' ? 'SANGRIA' : 'FECHAMENTO',
        datetime: new Date().toLocaleString('pt-BR'),
        items: [],
        showPrices: true,
        total: metadata.amount as number || 0,
        notes: metadata.notes as string || undefined,
        beep: true,
        cut: true,
      };

      const result = await createPrintJobV3({
        companyId,
        jobType,
        printerCategory: 'caixa',
        ticketData,
        priority: 2,
        metadata: { cashSessionId, ...metadata },
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar job');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-jobs-v3'] });
    },
  });

  // Create a credit statement print job
  const createCreditPrintJob = useMutation({
    mutationFn: async ({ 
      companyId,
      customerId,
      customerName,
    }: { 
      companyId: string;
      customerId: string;
      customerName: string;
    }) => {
      const ticketData: TicketData = {
        companyName: 'EXTRATO DE CRÉDITO',
        orderNumber: customerId.slice(0, 8),
        origin: 'CRÉDITO',
        customerName,
        datetime: new Date().toLocaleString('pt-BR'),
        items: [],
        showPrices: true,
        beep: true,
        cut: true,
      };

      const result = await createPrintJobV3({
        companyId,
        jobType: 'credit_statement',
        printerCategory: 'caixa',
        ticketData,
        priority: 3,
        metadata: { customerId, customerName },
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar job');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-jobs-v3'] });
    },
  });

  // Realtime subscription for print job updates
  useEffect(() => {
    const channel = supabase
      .channel('print-jobs-v3-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'print_job_queue_v3',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['print-jobs-v3'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    pendingJobs,
    isLoading,
    refetch,
    markCompleted,
    markFailed,
    createPrintJob,
    createCashPrintJob,
    createCreditPrintJob,
  };
}
