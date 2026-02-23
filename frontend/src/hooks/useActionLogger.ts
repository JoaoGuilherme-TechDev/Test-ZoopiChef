/**
 * React hook for action logging
 * 
 * Provides easy integration of action logging in components
 */

import { useCallback } from 'react';
import { logAction, logSilentError, logWarning, logApiCall } from '@/lib/actionLogger';

export interface UseActionLoggerOptions {
  module: string;
}

export function useActionLogger(options: UseActionLoggerOptions) {
  const { module } = options;

  const log = useCallback(
    (action: string, payload?: Record<string, unknown>) => {
      return logAction(module, action, payload);
    },
    [module]
  );

  const logError = useCallback(
    (action: string, error: Error | string, context?: Record<string, unknown>) => {
      logSilentError(module, action, error, context);
    },
    [module]
  );

  const logWarn = useCallback(
    (action: string, message: string, context?: Record<string, unknown>) => {
      logWarning(module, action, message, context);
    },
    [module]
  );

  const logApi = useCallback(
    (endpoint: string, method: string, payload?: Record<string, unknown>) => {
      return logApiCall(endpoint, method, payload);
    },
    []
  );

  return {
    log,
    logError,
    logWarn,
    logApi,
  };
}

export default useActionLogger;
