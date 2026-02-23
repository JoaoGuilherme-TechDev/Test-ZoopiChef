// Helper to detect if the local Zoopi Print Agent UI/service is reachable.
// IMPORTANT: the app usually runs over HTTPS, so we must try HTTPS loopback first.

const DEFAULT_PORTS = [3848, 3849, 3850, 3851, 3852, 3847];

// Cache the last known agent status to avoid repeated failed requests
let lastKnownStatus: { running: boolean; port?: number; checkedAt: number } | null = null;
const CACHE_TTL_MS = 30000; // 30 seconds cache - increased to reduce repeated checks

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { 
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
    });
  } finally {
    clearTimeout(id);
  }
}

export interface PrintAgentStatus {
  running: boolean;
  port?: number;
  error?: string;
  diagnostics?: {
    checkedUrls: string[];
    lastError?: string;
    isMixedContent?: boolean;
    isCorsBlocked?: boolean;
  };
}

/**
 * Check if the print agent is running.
 * Returns running: true if the agent responds to health check.
 * 
 * IMPORTANT: Due to browser security restrictions (mixed content, CORS),
 * this check may fail even when the agent is actually running.
 * The diagnostics field provides details about what was attempted.
 */
export async function isPrintAgentRunning(options?: {
  ports?: number[];
  timeoutMs?: number;
  skipCache?: boolean;
}): Promise<PrintAgentStatus> {
  const ports = options?.ports ?? DEFAULT_PORTS;
  const timeoutMs = options?.timeoutMs ?? 800; // Fast timeout to avoid blocking UI
  const skipCache = options?.skipCache ?? false;

  // Check cache first (unless skipping)
  if (!skipCache && lastKnownStatus && Date.now() - lastKnownStatus.checkedAt < CACHE_TTL_MS) {
    return { 
      running: lastKnownStatus.running, 
      port: lastKnownStatus.port,
    };
  }

  const checkedUrls: string[] = [];
  let lastError: string | undefined;
  let isMixedContent = false;
  let isCorsBlocked = false;

  // Detect if we're on HTTPS (which would cause mixed content issues with HTTP agent)
  const isSecureContext = typeof window !== 'undefined' && window.location?.protocol === 'https:';

  // If we're on HTTPS, prefer HTTPS loopback URLs first
  // Note: Most local agents don't support HTTPS, so this is a fallback
  const bases = isSecureContext
    ? [
        'https://127.0.0.1',
        'https://localhost',
        'http://127.0.0.1',  // Will likely fail due to mixed content
        'http://localhost',
      ]
    : [
        'http://127.0.0.1',
        'http://localhost',
        'https://127.0.0.1',
        'https://localhost',
      ];

  for (const port of ports) {
    for (const base of bases) {
      // Prefer the new unified endpoint, but keep legacy /health as fallback
      const healthPaths = ['/agent/health', '/health'];

      for (const path of healthPaths) {
        const url = `${base}:${port}${path}`;
        checkedUrls.push(url);

        try {
          const res = await fetchWithTimeout(url, timeoutMs);
          if (!res.ok) continue;

          // Expect JSON from /agent/health; accept plain text from legacy /health
          try {
            const json = (await res.clone().json()) as any;

            // New endpoint contract
            if (typeof json?.online === 'boolean') {
              lastKnownStatus = { running: json.online, port, checkedAt: Date.now() };
              return {
                running: json.online,
                port,
                diagnostics: {
                  checkedUrls,
                },
              };
            }

            // Legacy: if response is JSON but doesn't contain 'online', treat as reachable.
            lastKnownStatus = { running: true, port, checkedAt: Date.now() };
            return { running: true, port };
          } catch {
            // Plain text healthcheck like "ok".
            lastKnownStatus = { running: true, port, checkedAt: Date.now() };
            return { running: true, port };
          }
        } catch (err: any) {
          const errorMsg = err?.message || String(err);
          lastError = errorMsg;

          // Detect mixed content error
          if (isSecureContext && base.startsWith('http://')) {
            if (
              errorMsg.includes('Mixed Content') ||
              errorMsg.includes('blocked') ||
              errorMsg.includes('insecure')
            ) {
              isMixedContent = true;
            }
          }

          // Detect CORS error
          if (
            errorMsg.includes('CORS') ||
            errorMsg.includes('Failed to fetch') ||
            errorMsg.includes('NetworkError')
          ) {
            isCorsBlocked = true;
          }

          // Continue trying other URLs
        }
      }
    }
  }

  // Cache the negative result but with shorter TTL
  lastKnownStatus = { running: false, checkedAt: Date.now() };

  return { 
    running: false,
    error: buildErrorMessage(isMixedContent, isCorsBlocked, lastError, isSecureContext),
    diagnostics: {
      checkedUrls,
      lastError,
      isMixedContent,
      isCorsBlocked,
    },
  };
}

function buildErrorMessage(
  isMixedContent: boolean,
  isCorsBlocked: boolean,
  lastError: string | undefined,
  isSecureContext: boolean
): string {
  if (isMixedContent && isSecureContext) {
    return 'O site está em HTTPS e não consegue conectar ao agente local (HTTP). Tente acessar via HTTP ou configure o agente com HTTPS.';
  }
  
  if (isCorsBlocked) {
    return 'Erro de conexão com o agente de impressão. Verifique se o agente está rodando e se o CORS está configurado corretamente.';
  }

  if (lastError) {
    return `Não foi possível conectar ao agente de impressão: ${lastError}`;
  }

  return 'Agente de impressão não encontrado nas portas padrão (3847-3852).';
}

/**
 * Clear the cached agent status, forcing a fresh check on the next call.
 */
export function clearPrintAgentCache(): void {
  lastKnownStatus = null;
}

/**
 * Get the last known agent status without making a new request.
 * Returns null if no status is cached or cache is expired.
 */
export function getLastKnownAgentStatus(): PrintAgentStatus | null {
  if (!lastKnownStatus || Date.now() - lastKnownStatus.checkedAt > CACHE_TTL_MS * 2) {
    return null;
  }
  return {
    running: lastKnownStatus.running,
    port: lastKnownStatus.port,
  };
}
