import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { usePrintSectors } from '@/hooks/usePrintSectors';
import { toast } from 'sonner';
import { generateKitchenTicketHTML } from '@/lib/print/kitchenTicket';
import { generateProductionTicketHTML } from '@/lib/print/productionTicket';

// Global tracker to prevent re-processing on remounts
const globalProcessedJobs = new Set<string>();
const globalInitialized = new Set<string>();

/**
 * KitchenPrintListener
 *
 * IMPORTANTE:
 * - Para NÃO abrir a tela de impressão do Windows (diálogo do browser),
 *   este listener NÃO imprime via iframe/window.print.
 * - Ele apenas observa jobs e deixa o processamento para o agente desktop.
 */
export function KitchenPrintListener() {
  const { data: company } = useCompany();
  const { sectors } = usePrintSectors();
  const processingRef = useRef<Set<string>>(new Set());

  // Process a print job from the queue
  const processPrintJob = useCallback(async (job: any) => {
    const jobId: string = job?.id;
    const orderId: string | null = job?.order_id ?? null;
    const sectorId: string | null = job?.print_sector_id ?? null;
    const metadata: any = job?.metadata ?? {};

    if (!jobId) return;

    // Skip if already processed globally or locally
    if (globalProcessedJobs.has(jobId) || processingRef.current.has(jobId)) {
      console.log('[KitchenPrint] Job already processed, skipping:', jobId);
      return;
    }

    processingRef.current.add(jobId);
    globalProcessedJobs.add(jobId);

    try {
      // If job already contains RAW payload, never try to fetch/render anything here.
      // The desktop agent should consume it.
      if (metadata?.rawEscPos || metadata?.rawData) {
        console.log('[KitchenPrint] RAW job detected - leaving in queue for desktop agent:', {
          jobId,
          jobType: job?.job_type,
          source: job?.source,
          hasRawEscPos: Boolean(metadata?.rawEscPos),
          hasRawData: Boolean(metadata?.rawData),
          bytes: metadata?.rawEscPos ? String(metadata.rawEscPos).length : (Array.isArray(metadata?.rawData) ? metadata.rawData.length : 0),
        });
        return;
      }

      // Table-bill jobs can have no order_id. Do not mark failed; just leave for agent.
      if (!orderId) {
        console.log('[KitchenPrint] Job without order_id - leaving in queue for desktop agent:', {
          jobId,
          jobType: job?.job_type,
          source: job?.source,
        });
        return;
      }

      console.log('[KitchenPrint] Processing job:', { jobId, orderId, sectorId });

      // Fetch order with items (only for jobs that rely on order_id)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('[KitchenPrint] Order not found:', orderError);
        await markJobFailed(jobId, 'Pedido não encontrado');
        return;
      }

      // ==========================
      // JOB GERAL (SEM SETOR)
      // ==========================
      // Sempre deixa para o agente desktop.
      if (!sectorId) {
        console.log('[KitchenPrint] General job detected - leaving in queue for desktop agent:', {
          jobId,
          orderId,
        });
        return;
      }

      // Find sector if specified
      const sector = sectors.find((s) => s.id === sectorId) || null;

      // Para evitar abrir diálogo do Windows, NUNCA imprime via browser aqui.
      // O agente desktop é quem deve processar.
      console.log('[KitchenPrint] Sector job detected - leaving in queue for desktop agent:', {
        jobId,
        orderId,
        sectorId,
        printMode: sector?.print_mode,
      });
      return;
    } catch (error) {
      console.error('[KitchenPrint] Processing error:', error);
      await markJobFailed(jobId, error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setTimeout(() => processingRef.current.delete(jobId), 3000);
    }
  }, [sectors]);


  // Mark job as completed
  const markJobComplete = async (jobId: string) => {
    const { error } = await supabase
      .from('print_job_queue')
      .update({ 
        status: 'completed', 
        printed_at: new Date().toISOString() 
      })
      .eq('id', jobId);

    if (error) console.error('[KitchenPrint] Failed to mark complete:', error);
  };

  // Mark job as failed
  const markJobFailed = async (jobId: string, errorMessage: string) => {
    const { data: job } = await supabase
      .from('print_job_queue')
      .select('attempts')
      .eq('id', jobId)
      .single();

    const attempts = (job?.attempts || 0) + 1;
    const status = attempts >= 3 ? 'failed' : 'pending';

    await supabase
      .from('print_job_queue')
      .update({ 
        status, 
        attempts, 
        error_message: errorMessage 
      })
      .eq('id', jobId);
  };

  // Listen for new print jobs via realtime ONLY (no initial fetch)
  useEffect(() => {
    if (!company?.id || !company?.auto_print_enabled) {
      console.log('[KitchenPrint] Disabled or no company');
      return;
    }

    // Prevent duplicate initialization per company
    const initKey = `kitchen-${company.id}`;
    if (globalInitialized.has(initKey)) {
      console.log('[KitchenPrint] Already initialized for this company');
      return;
    }
    globalInitialized.add(initKey);

    console.log('[KitchenPrint] Starting listener for company:', company.id);

    // ONLY listen for NEW jobs via realtime - do NOT fetch pending on mount
    const channel = supabase
      .channel(`kitchen-print-jobs-${company.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'print_job_queue',
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          const job = payload.new as any;
          console.log('[KitchenPrint] New print job via realtime:', job);

          if (job.status === 'pending') {
            processPrintJob(job);
          }
        }
      )
      .subscribe((status) => {
        console.log('[KitchenPrint] Channel status:', status);
      });

    return () => {
      console.log('[KitchenPrint] Removing listener');
      globalInitialized.delete(initKey);
      supabase.removeChannel(channel);
    };
  }, [company?.id, company?.auto_print_enabled, processPrintJob]);

  return null;
}
