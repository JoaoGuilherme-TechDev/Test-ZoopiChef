/**
 * Print Queue Helper
 * 
 * Provides a centralized function to enqueue print jobs with proper error handling,
 * logging, and fallback mechanisms.
 */

import { supabase } from '@/lib/supabase-shim';
import { isPrintAgentRunning, PrintAgentStatus } from './PrintAgentHealth';

export interface EnqueuePrintJobOptions {
  companyId: string;
  jobType: 'table_bill' | 'comanda_bill' | 'order' | 'production' | 'cash_operation';
  source: string;
  metadata: Record<string, any>;
  /** If true, will enqueue even if agent health check fails (with warning) */
  forceEnqueue?: boolean;
  /** If true, skips the agent health check entirely */
  skipAgentCheck?: boolean;
}

export interface EnqueuePrintJobResult {
  success: boolean;
  error?: string;
  jobId?: string;
  agentStatus?: PrintAgentStatus;
  /** True if job was enqueued despite agent check failing */
  enqueuedWithWarning?: boolean;
}

/**
 * Enqueue a print job to the print_job_queue table.
 * 
 * This function:
 * 1. Optionally checks if the print agent is running
 * 2. Logs detailed information for debugging
 * 3. Provides clear error messages
 * 4. Supports force-enqueue for when agent check fails but user wants to proceed
 */
export async function enqueuePrintJob(options: EnqueuePrintJobOptions): Promise<EnqueuePrintJobResult> {
  const { companyId, jobType, source, metadata, forceEnqueue = false, skipAgentCheck = false } = options;

  console.log(`[printQueue] Enqueueing job:`, {
    jobType,
    source,
    companyId,
    forceEnqueue,
    skipAgentCheck,
    metadataKeys: Object.keys(metadata),
  });

  // Check agent status unless skipped
  let agentStatus: PrintAgentStatus | undefined;
  if (!skipAgentCheck) {
    agentStatus = await isPrintAgentRunning();
    
    if (!agentStatus.running) {
      console.warn('[printQueue] Agent not running:', agentStatus);
      
      if (!forceEnqueue) {
        return {
          success: false,
          error: agentStatus.error || 'Agente de impressão não está aberto. Verifique se o agente está rodando.',
          agentStatus,
        };
      }
      
      console.log('[printQueue] Force enqueueing despite agent check failure');
    }
  }

  try {
    const { data, error: insertError } = await supabase
      .from('print_job_queue')
      .insert([
        {
          company_id: companyId,
          job_type: jobType,
          source,
          status: 'pending',
          metadata: JSON.parse(JSON.stringify(metadata)),
        },
      ])
      .select('id')
      .single();

    if (insertError) {
      console.error('[printQueue] Failed to enqueue job:', insertError);
      return {
        success: false,
        error: `Erro ao enviar para fila de impressão: ${insertError.message}`,
        agentStatus,
      };
    }

    console.log('[printQueue] Job enqueued successfully:', data?.id);

    return {
      success: true,
      jobId: data?.id,
      agentStatus,
      enqueuedWithWarning: agentStatus && !agentStatus.running,
    };
  } catch (err: any) {
    console.error('[printQueue] Unexpected error:', err);
    return {
      success: false,
      error: `Erro inesperado ao enfileirar impressão: ${err.message || String(err)}`,
      agentStatus,
    };
  }
}

/**
 * Log a print action for debugging purposes.
 * This creates a detailed log entry that can be used to diagnose print issues.
 */
export function logPrintAction(
  action: string,
  details: Record<string, any>,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    ...details,
  };

  switch (level) {
    case 'warn':
      console.warn(`[print:${action}]`, logEntry);
      break;
    case 'error':
      console.error(`[print:${action}]`, logEntry);
      break;
    default:
      console.log(`[print:${action}]`, logEntry);
  }
}
