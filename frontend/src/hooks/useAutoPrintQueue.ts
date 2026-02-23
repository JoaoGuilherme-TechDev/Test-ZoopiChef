import { useEffect, useRef, useCallback } from 'react';
import { usePrintJobQueue, PrintJobV3 } from './usePrintJobQueue';
import { useOrders, Order } from './useOrders';
import { useCompany } from './useCompany';
import { supabase } from '@/lib/supabase-shim';
import { groupItemsBySector } from '@/lib/print/sectorPrint';
import { getPrintService } from '@/lib/print/PrintService';
import type { PrintSector } from '@/hooks/usePrintSectors';
import { toast } from 'sonner';

interface UseAutoPrintQueueOptions {
  enabled?: boolean;
  pollInterval?: number;
}

/**
 * Hook that automatically processes print jobs from the queue
 * Uses realtime + polling as fallback
 */
export function useAutoPrintQueue(options: UseAutoPrintQueueOptions = {}) {
  const { enabled = true, pollInterval = 5000 } = options;
  
  const { pendingJobs, markCompleted, markFailed } = usePrintJobQueue();
  const { orders } = useOrders();
  const { data: company } = useCompany();
  
  const processingRef = useRef<Set<string>>(new Set());
  const lastProcessedRef = useRef<string | null>(null);

  const processJob = useCallback(async (job: PrintJobV3) => {
    if (processingRef.current.has(job.id)) return;
    processingRef.current.add(job.id);

    try {
      const order = orders.find(o => o.id === job.order_id);
      if (!order) {
        console.log(`[AutoPrint] Order ${job.order_id} not found, will retry`);
        processingRef.current.delete(job.id);
        return;
      }

      console.log(`[AutoPrint] Printing order ${order.id} (job ${job.id}, sector: ${job.print_sector_id || 'full'})`);

      const printService = getPrintService();

      // Sector job: print only items for that sector
      if (job.print_sector_id) {
        // Fetch sector
        const { data: sector, error: sectorError } = await supabase
          .from('print_sectors')
          .select('*')
          .eq('id', job.print_sector_id)
          .single();

        if (sectorError || !sector) {
          throw new Error('Setor de impressão não encontrado');
        }

        // Build product -> sectors mapping for this order
        const productIds = (order.items || []).map(i => i.product_id).filter(Boolean) as string[];
        const { data: mappings } = await supabase
          .from('product_print_sectors')
          .select('product_id, sector_id')
          .in('product_id', productIds);

        const sectorIds = Array.from(new Set((mappings || []).map(m => m.sector_id).filter(Boolean))) as string[];
        const { data: sectorsData } = await supabase
          .from('print_sectors')
          .select('id,name,color,print_mode,printer_name,printer_host,printer_port,active')
          .in('id', sectorIds);

        const sectorsById = new Map<string, PrintSector>();
        (sectorsData || []).forEach((s: any) => sectorsById.set(s.id, s as PrintSector));

        const productSectorMap = new Map<string, PrintSector[]>();
        (mappings || []).forEach((m: any) => {
          const sec = sectorsById.get(m.sector_id);
          if (!sec) return;
          const list = productSectorMap.get(m.product_id) || [];
          list.push(sec);
          productSectorMap.set(m.product_id, list);
        });

        const sectorGroups = groupItemsBySector(order as Order, productSectorMap);
        const group = sectorGroups.find(g => g.sector.id === job.print_sector_id);

        if (!group) {
          // If mapping missing, fallback to printing the whole order
          await printService.printOrder(order as Order, company?.name);
        } else {
          await printService.printForSector(order as Order, sector as any, group.items as any, company?.name);
        }
      } else {
        // Full job
        await printService.printOrder(order as Order, company?.name);
      }

      await markCompleted.mutateAsync(job.id);

      // Toast notification disabled to reduce spam
      // if (job.source === 'auto_on_create') {
      //   toast.success(`Pedido #${(order as any).order_number ? String((order as any).order_number).padStart(3, '0') : order.id.slice(0, 8)} impresso`);
      // }

      lastProcessedRef.current = job.id;
    } catch (error) {
      console.error(`[AutoPrint] Failed to print job ${job.id}:`, error);
      await markFailed.mutateAsync({
        jobId: job.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      processingRef.current.delete(job.id);
    }
  }, [orders, company, markCompleted, markFailed]);

  useEffect(() => {
    if (!enabled || pendingJobs.length === 0) return;

    const nextJob = pendingJobs.find(j => !processingRef.current.has(j.id));
    if (nextJob) {
      processJob(nextJob);
    }
  }, [enabled, pendingJobs, processJob]);

  return {
    pendingCount: pendingJobs.length,
    isProcessing: processingRef.current.size > 0,
  };
}
