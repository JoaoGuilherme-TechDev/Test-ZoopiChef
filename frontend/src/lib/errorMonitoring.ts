/**
 * Sistema de Monitoramento de Erros
 * 
 * Este módulo fornece funcionalidades para capturar, registrar e monitorar erros
 * em produção. Pode ser integrado com Sentry ou outros serviços de monitoramento.
 * 
 * Por enquanto, usa localStorage + console para tracking local.
 * Para produção, integrar com Sentry ou similar.
 */

export interface ErrorLog {
  id: string;
  timestamp: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  url?: string;
  userAgent?: string;
  userId?: string;
  companyId?: string;
}

const MAX_STORED_ERRORS = 100;
const STORAGE_KEY = 'zoopi_error_logs';

/**
 * Gera um ID único para o erro
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Obtém os logs de erro armazenados
 */
export function getStoredErrors(): ErrorLog[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Armazena um erro no localStorage
 */
function storeError(error: ErrorLog): void {
  try {
    const errors = getStoredErrors();
    errors.unshift(error);
    
    // Manter apenas os últimos N erros
    if (errors.length > MAX_STORED_ERRORS) {
      errors.splice(MAX_STORED_ERRORS);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
  } catch {
    // Falha silenciosa se localStorage estiver cheio
  }
}

/**
 * Limpa os logs de erro armazenados
 */
export function clearErrorLogs(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Captura e registra um erro
 */
export function captureError(
  error: Error | string,
  context?: Record<string, unknown>
): string {
  const errorLog: ErrorLog = {
    id: generateErrorId(),
    timestamp: new Date().toISOString(),
    type: 'error',
    message: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  // Log no console em desenvolvimento
  if (import.meta.env.DEV) {
    console.error('[ErrorMonitor]', errorLog);
  }

  // Armazenar localmente
  storeError(errorLog);

  // TODO: Enviar para Sentry/serviço externo em produção
  // if (import.meta.env.PROD) {
  //   Sentry.captureException(error, { extra: context });
  // }

  return errorLog.id;
}

/**
 * Captura um warning
 */
export function captureWarning(
  message: string,
  context?: Record<string, unknown>
): string {
  const warningLog: ErrorLog = {
    id: generateErrorId(),
    timestamp: new Date().toISOString(),
    type: 'warning',
    message,
    context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  };

  if (import.meta.env.DEV) {
    console.warn('[ErrorMonitor]', warningLog);
  }

  storeError(warningLog);
  return warningLog.id;
}

/**
 * Captura uma mensagem informativa
 */
export function captureInfo(
  message: string,
  context?: Record<string, unknown>
): string {
  const infoLog: ErrorLog = {
    id: generateErrorId(),
    timestamp: new Date().toISOString(),
    type: 'info',
    message,
    context,
  };

  if (import.meta.env.DEV) {
    console.info('[ErrorMonitor]', infoLog);
  }

  storeError(infoLog);
  return infoLog.id;
}

/**
 * Define contexto do usuário para os logs
 */
let userContext: { userId?: string; companyId?: string } = {};

export function setUserContext(userId?: string, companyId?: string): void {
  userContext = { userId, companyId };
}

/**
 * Wrapper para funções async que captura erros automaticamente
 */
export function withErrorCapture<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: Record<string, unknown>
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error as Error, { ...context, args });
      throw error;
    }
  }) as T;
}

/**
 * Inicializa handlers globais de erro
 */
export function initErrorMonitoring(): void {
  // Capturar erros não tratados
  window.addEventListener('error', (event) => {
    captureError(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      ...userContext,
    });
  });

  // Capturar rejeições de Promise não tratadas
  window.addEventListener('unhandledrejection', (event) => {
    captureError(
      event.reason instanceof Error ? event.reason : String(event.reason),
      {
        type: 'unhandledRejection',
        ...userContext,
      }
    );
  });

  // Log de inicialização
  if (import.meta.env.DEV) {
    console.log('[ErrorMonitor] Initialized');
  }
}

/**
 * Obtém estatísticas dos erros
 */
export function getErrorStats(): {
  total: number;
  errors: number;
  warnings: number;
  last24h: number;
} {
  const errors = getStoredErrors();
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  return {
    total: errors.length,
    errors: errors.filter((e) => e.type === 'error').length,
    warnings: errors.filter((e) => e.type === 'warning').length,
    last24h: errors.filter((e) => new Date(e.timestamp).getTime() > oneDayAgo).length,
  };
}
