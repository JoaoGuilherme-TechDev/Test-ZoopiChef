/**
 * Entregador (Deliverer) PWA Persistence Layer
 * 
 * Persists restaurant context to localStorage so the Entregador PWA
 * can automatically restore the session after reopening.
 * 
 * Entregador uses company slug + entregador token for identification.
 * This is CRITICAL - an entregador must NEVER access another restaurant's data.
 */

const STORAGE_PREFIX = 'entregador_pwa_';

export interface EntregadorPersistedContext {
  companyId: string;
  companySlug: string;
  companyName: string;
  entregadorToken: string;
  entregadorName?: string;
  lastAccessedAt: string;
}

const STORAGE_KEYS = {
  CONTEXT: `${STORAGE_PREFIX}context`,
  COMPANY_SLUG: `${STORAGE_PREFIX}company_slug`,
  TOKEN: `${STORAGE_PREFIX}token`,
};

/**
 * Save entregador context to localStorage
 * Called when the entregador app is first opened via its link
 */
export function saveEntregadorContext(context: EntregadorPersistedContext): void {
  try {
    const data = {
      ...context,
      lastAccessedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.CONTEXT, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEYS.COMPANY_SLUG, context.companySlug);
    localStorage.setItem(STORAGE_KEYS.TOKEN, context.entregadorToken);
    console.log('[EntregadorPersistence] Context saved:', context.companyName, context.companySlug);
  } catch (error) {
    console.error('[EntregadorPersistence] Failed to save context:', error);
  }
}

/**
 * Load persisted entregador context from localStorage
 * Returns null if no context is saved
 */
export function loadEntregadorContext(): EntregadorPersistedContext | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONTEXT);
    if (!stored) return null;
    
    const context = JSON.parse(stored) as EntregadorPersistedContext;
    
    // Validate required fields
    if (!context.companySlug || !context.companyId || !context.entregadorToken) {
      console.warn('[EntregadorPersistence] Invalid stored context, clearing...');
      clearEntregadorContext();
      return null;
    }
    
    console.log('[EntregadorPersistence] Context loaded:', context.companyName);
    return context;
  } catch (error) {
    console.error('[EntregadorPersistence] Failed to load context:', error);
    return null;
  }
}

/**
 * Get only the company slug (faster than loading full context)
 */
export function getPersistedCompanySlug(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.COMPANY_SLUG);
  } catch {
    return null;
  }
}

/**
 * Get only the entregador token (faster than loading full context)
 */
export function getPersistedToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
}

/**
 * Clear all entregador persistence data
 * Used when logging out or resetting
 */
export function clearEntregadorContext(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CONTEXT);
    localStorage.removeItem(STORAGE_KEYS.COMPANY_SLUG);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    console.log('[EntregadorPersistence] Context cleared');
  } catch (error) {
    console.error('[EntregadorPersistence] Failed to clear context:', error);
  }
}

/**
 * Update the last accessed timestamp
 */
export function touchEntregadorContext(): void {
  try {
    const context = loadEntregadorContext();
    if (context) {
      context.lastAccessedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.CONTEXT, JSON.stringify(context));
    }
  } catch (error) {
    console.error('[EntregadorPersistence] Failed to touch context:', error);
  }
}

/**
 * Check if we have a persisted entregador context
 */
export function hasPersistedEntregadorContext(): boolean {
  return !!getPersistedToken() && !!getPersistedCompanySlug();
}
