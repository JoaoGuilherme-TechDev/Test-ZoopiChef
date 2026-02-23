/**
 * Action Logger - Sistema de instrumentação para auditoria
 * 
 * Registra ações do usuário, chamadas de API e erros silenciosos
 * para facilitar debugging e identificação de "falhas mudas"
 */

export interface ActionLogEntry {
  id: string;
  timestamp: string;
  type: 'action' | 'api_call' | 'api_response' | 'error' | 'warning';
  module: string;
  action: string;
  payload?: Record<string, unknown>;
  duration?: number;
  status?: 'pending' | 'success' | 'error' | 'timeout';
  error?: string;
}

// Configuration
const MAX_LOGS = 200;
const STORAGE_KEY = 'zoopi_action_logs';
const API_TIMEOUT_MS = 10000;

// In-memory buffer for performance
let logBuffer: ActionLogEntry[] = [];

/**
 * Generate unique ID for log entry
 */
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Get all stored action logs
 */
export function getActionLogs(): ActionLogEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedLogs = stored ? JSON.parse(stored) : [];
    return [...logBuffer, ...storedLogs].slice(0, MAX_LOGS);
  } catch {
    return logBuffer;
  }
}

/**
 * Clear all action logs
 */
export function clearActionLogs(): void {
  logBuffer = [];
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Store log entry
 */
function storeLog(entry: ActionLogEntry): void {
  logBuffer.unshift(entry);
  
  // Persist periodically
  if (logBuffer.length >= 20) {
    try {
      const existing = getActionLogs();
      const combined = [...logBuffer, ...existing].slice(0, MAX_LOGS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      logBuffer = [];
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Log a user action
 */
export function logAction(
  module: string,
  action: string,
  payload?: Record<string, unknown>
): string {
  const entry: ActionLogEntry = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    type: 'action',
    module,
    action,
    payload: payload ? sanitizePayload(payload) : undefined,
    status: 'success',
  };

  console.log(`[Action] ${module}:${action}`, payload ? payload : '');
  storeLog(entry);
  return entry.id;
}

/**
 * Log an API call with timeout tracking
 */
export function logApiCall(
  endpoint: string,
  method: string,
  payload?: Record<string, unknown>
): { logId: string; complete: (status: 'success' | 'error', error?: string) => void } {
  const startTime = Date.now();
  
  const entry: ActionLogEntry = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    type: 'api_call',
    module: 'api',
    action: `${method} ${endpoint}`,
    payload: payload ? sanitizePayload(payload) : undefined,
    status: 'pending',
  };

  console.log(`[API] ${method} ${endpoint}`, payload ? payload : '');
  storeLog(entry);

  // Set up timeout warning
  const timeoutId = setTimeout(() => {
    console.warn(`[API Timeout] ${method} ${endpoint} - taking more than ${API_TIMEOUT_MS}ms`);
    entry.status = 'timeout';
  }, API_TIMEOUT_MS);

  return {
    logId: entry.id,
    complete: (status: 'success' | 'error', error?: string) => {
      clearTimeout(timeoutId);
      entry.status = status;
      entry.duration = Date.now() - startTime;
      entry.error = error;

      if (status === 'error') {
        console.error(`[API Error] ${method} ${endpoint}:`, error);
      } else {
        console.log(`[API Complete] ${method} ${endpoint} (${entry.duration}ms)`);
      }
    },
  };
}

/**
 * Log a silent error (no UI feedback)
 */
export function logSilentError(
  module: string,
  action: string,
  error: Error | string,
  context?: Record<string, unknown>
): void {
  const entry: ActionLogEntry = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    type: 'error',
    module,
    action,
    payload: context,
    status: 'error',
    error: error instanceof Error ? error.message : error,
  };

  console.error(`[Silent Error] ${module}:${action}:`, error, context);
  storeLog(entry);
}

/**
 * Log a warning
 */
export function logWarning(
  module: string,
  action: string,
  message: string,
  context?: Record<string, unknown>
): void {
  const entry: ActionLogEntry = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    type: 'warning',
    module,
    action,
    payload: context,
    error: message,
  };

  console.warn(`[Warning] ${module}:${action}:`, message, context);
  storeLog(entry);
}

/**
 * Sanitize payload to remove sensitive data
 */
function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = Array.isArray(value) 
        ? `[Array(${value.length})]`
        : '[Object]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Get action statistics
 */
export function getActionStats(): {
  total: number;
  errors: number;
  warnings: number;
  apiCalls: number;
  avgApiTime: number;
  timeouts: number;
} {
  const logs = getActionLogs();
  const apiLogs = logs.filter(l => l.type === 'api_call' && l.duration);

  return {
    total: logs.length,
    errors: logs.filter(l => l.status === 'error').length,
    warnings: logs.filter(l => l.type === 'warning').length,
    apiCalls: logs.filter(l => l.type === 'api_call').length,
    avgApiTime: apiLogs.length > 0
      ? Math.round(apiLogs.reduce((sum, l) => sum + (l.duration || 0), 0) / apiLogs.length)
      : 0,
    timeouts: logs.filter(l => l.status === 'timeout').length,
  };
}

/**
 * Wrapper for async functions with automatic error logging
 */
export function withActionLogging<T extends (...args: any[]) => Promise<any>>(
  module: string,
  action: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    logAction(module, action, { argsCount: args.length });
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      logSilentError(module, action, error as Error);
      throw error;
    }
  }) as T;
}

/**
 * Initialize action logging
 */
export function initActionLogging(): void {
  console.log('[ActionLogger] Initialized');
  
  // Flush buffer on page unload
  window.addEventListener('beforeunload', () => {
    if (logBuffer.length > 0) {
      try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const combined = [...logBuffer, ...existing].slice(0, MAX_LOGS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      } catch {
        // Ignore
      }
    }
  });
}
