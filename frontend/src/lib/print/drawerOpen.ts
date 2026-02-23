/**
 * Cash Drawer Open via ESC/POS RAW command
 * 
 * IMPORTANT: This module sends RAW ESC/POS commands to the print agent.
 * It does NOT use window.print() or browser preview.
 * 
 * The drawer command is sent via the print job queue to the desktop agent.
 */

import { supabase } from '@/lib/supabase-shim';
import { isPrintAgentRunning } from './PrintAgentHealth';

// ESC/POS drawer kick command: ESC p m t1 t2
// ESC = 0x1B, p = 0x70, m = pin (0 = pin 2, 1 = pin 5), t1 = pulse on time, t2 = pulse off time
const DRAWER_COMMAND = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]); // ESC p 0 25 250

export interface OpenDrawerResult {
  success: boolean;
  error?: string;
  warning?: string;
  jobId?: string;
}

/**
 * Opens the cash drawer by sending an ESC/POS command via the print agent.
 * 
 * This function:
 * 1. Checks agent health (optional - proceeds anyway if check fails)
 * 2. Creates a print job of type 'cash_operation' with drawer command
 * 3. Returns result immediately (job is processed by agent)
 * 
 * @param printerHost - Optional printer IP:port (e.g., "192.168.0.50:9100")
 * @param companyId - Required company ID for the print queue
 * @param timeout - Timeout in ms (default: 5000)
 */
export async function openCashDrawer(
  printerHost?: string | null,
  companyId?: string | null,
  timeout: number = 5000
): Promise<OpenDrawerResult> {
  const startTime = Date.now();
  
  console.log('[drawerOpen] Opening cash drawer', {
    printerHost,
    companyId: companyId?.slice(0, 8),
    timeout,
  });

  // Validate company ID
  if (!companyId) {
    console.error('[drawerOpen] No company ID provided');
    return {
      success: false,
      error: 'Empresa não identificada. Configure a empresa antes de abrir a gaveta.',
    };
  }

  // Check agent health (but don't block - enqueue anyway)
  let warning: string | undefined;
  try {
    const agentStatus = await isPrintAgentRunning();
    if (!agentStatus.running) {
      console.warn('[drawerOpen] Agent health check failed:', agentStatus);
      warning = agentStatus.error || 'Não foi possível verificar o agente de impressão.';
    }
  } catch (healthError) {
    console.warn('[drawerOpen] Health check error:', healthError);
    warning = 'Verificação do agente falhou, mas comando será enviado.';
  }

  try {
    // Build metadata for the drawer command
    const metadata: Record<string, any> = {
      command: 'open_drawer',
      rawData: Array.from(DRAWER_COMMAND),
    };

    // Parse printer address if provided
    if (printerHost) {
      const parsed = parsePrinterAddress(printerHost);
      if (parsed) {
        if (parsed.kind === 'tcp') {
          metadata.printerHost = parsed.host;
          metadata.printerPort = parsed.port;
        } else {
          metadata.printerName = parsed.name;
        }
      }
    }

    console.log('[drawerOpen] Enqueueing drawer command with metadata:', metadata);

    // Insert job into print queue
    const { data, error } = await supabase
      .from('print_job_queue')
      .insert([
        {
          company_id: companyId,
          job_type: 'cash_operation',
          source: 'manual',
          status: 'pending',
          metadata,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.error('[drawerOpen] Failed to queue drawer command:', error);
      return {
        success: false,
        error: `Falha ao enviar comando para gaveta: ${error.message}`,
      };
    }

    const elapsed = Date.now() - startTime;
    console.log('[drawerOpen] Drawer command queued successfully', {
      jobId: data?.id,
      elapsed,
    });

    return {
      success: true,
      jobId: data?.id,
      warning,
    };
  } catch (err: any) {
    console.error('[drawerOpen] Unexpected error:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao abrir gaveta',
    };
  }
}

/**
 * Parse printer address into TCP or USB format
 */
type ParsedPrinterAddress =
  | { kind: 'tcp'; host: string; port: number }
  | { kind: 'usb'; name: string };

function parsePrinterAddress(printer: string): ParsedPrinterAddress | null {
  const trimmed = printer.trim();
  if (!trimmed) return null;

  // If contains ":" assume TCP (host:port)
  const hasColon = trimmed.includes(':');
  const [hostRaw, portRaw] = hasColon ? trimmed.split(':') : [trimmed, undefined];

  const host = String(hostRaw || '').trim();
  const port = portRaw ? Number(portRaw) : 9100;

  if (!host) return null;

  // Validate port when TCP
  if (hasColon && (Number.isNaN(port) || port <= 0)) return null;

  // Valid TCP host: IPv4, localhost, or hostname with dot
  const isValidTcpHost =
    /^(\d{1,3}\.){3}\d{1,3}$/.test(host) ||
    host === 'localhost' ||
    host.includes('.');

  if (isValidTcpHost) {
    return { kind: 'tcp', host, port };
  }

  // Otherwise, treat as USB/Windows printer name
  return { kind: 'usb', name: trimmed };
}
