import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

// Track already-alerted job IDs to prevent spam
const alertedJobs = new Set<string>();
const globalInitialized = new Set<string>();

/**
 * PrintFailureAlert
 * 
 * Componente que monitora falhas de impressão e alerta o operador.
 * 
 * REGRAS:
 * - Monitora jobs com status 'failed' na print_job_queue
 * - Exibe alerta sonner imediatamente ao operador
 * - NÃO duplica alertas para o mesmo job
 * - NÃO reenvia automaticamente (requer ação manual)
 */
export function PrintFailureAlert() {
  const { data: company } = useCompany();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Show alert to operator
  const showFailureAlert = useCallback((job: any) => {
    const jobId = job.id;
    
    // Skip if already alerted
    if (alertedJobs.has(jobId)) return;
    alertedJobs.add(jobId);

    const jobType = job.job_type;
    const errorMessage = job.error_message || 'Erro desconhecido';
    const orderId = job.order_id;

    // Determine ticket type for user-friendly message
    let ticketTypeLabel = 'Ticket';
    if (job.print_sector_id) {
      ticketTypeLabel = 'Ticket de Produção';
    } else if (jobType === 'full_order') {
      ticketTypeLabel = 'Via do Entregador';
    } else if (jobType === 'order') {
      ticketTypeLabel = 'Ticket Gerencial';
    } else if (jobType === 'table_bill') {
      ticketTypeLabel = 'Conta da Mesa';
    }

    toast.error(`⚠️ Falha de Impressão`, {
      description: `${ticketTypeLabel}${orderId ? ` (Pedido ${orderId.slice(0, 8)})` : ''}: ${errorMessage}`,
      duration: 15000, // 15 seconds - persistent for operator attention
      action: {
        label: 'Ver Fila',
        onClick: () => {
          // Navigate to print queue if exists
          window.location.href = '/admin/configuracoes?tab=impressao';
        },
      },
    });

    console.warn('[PrintFailureAlert] Alert shown to operator:', {
      jobId,
      jobType,
      errorMessage,
      orderId,
    });
  }, []);

  // Check for failed jobs
  const checkFailedJobs = useCallback(async () => {
    if (!company?.id) return;

    try {
      const { data: failedJobs, error } = await supabase
        .from('print_job_queue')
        .select('id, job_type, order_id, print_sector_id, error_message, created_at')
        .eq('company_id', company.id)
        .eq('status', 'failed')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // últimos 30 min
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[PrintFailureAlert] Error checking failed jobs:', error);
        return;
      }

      // Alert for each unalerted failure
      (failedJobs || []).forEach((job: any) => {
        showFailureAlert(job);
      });
    } catch (err) {
      console.error('[PrintFailureAlert] Check error:', err);
    }
  }, [company?.id, showFailureAlert]);

  // Subscribe to realtime updates for immediate alerts
  useEffect(() => {
    if (!company?.id) return;

    const initKey = `print-failure-${company.id}`;
    if (globalInitialized.has(initKey)) return;
    globalInitialized.add(initKey);

    console.log('[PrintFailureAlert] Starting failure monitor for company:', company.id);

    // Initial check for existing failures
    checkFailedJobs();

    // Poll every 30 seconds as backup
    checkIntervalRef.current = setInterval(checkFailedJobs, 30000);

    // Realtime subscription for immediate alerts
    const channel = supabase
      .channel(`print-failures-${company.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'print_job_queue',
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          const job = payload.new as any;
          if (job.status === 'failed') {
            showFailureAlert(job);
          }
        }
      )
      .subscribe((status) => {
        console.log('[PrintFailureAlert] Channel status:', status);
      });

    return () => {
      console.log('[PrintFailureAlert] Cleaning up failure monitor');
      globalInitialized.delete(initKey);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [company?.id, checkFailedJobs, showFailureAlert]);

  return null;
}
