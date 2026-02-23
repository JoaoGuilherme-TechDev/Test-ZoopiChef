/**
 * Tablet PWA Persistence Layer
 * 
 * Persists restaurant context to localStorage so the Tablet PWA
 * can automatically restore the session after reopening.
 * 
 * Tablet uses company slug (not device token) for identification.
 */

const STORAGE_PREFIX = 'tablet_pwa_';

export interface TabletPersistedContext {
  companyId: string;
  companySlug: string;
  companyName: string;
  tableNumber?: string;
  lastAccessedAt: string;
}

const STORAGE_KEYS = {
  CONTEXT: `${STORAGE_PREFIX}context`,
  COMPANY_SLUG: `${STORAGE_PREFIX}company_slug`,
};

/**
 * Save tablet context to localStorage
 * Called when the tablet is first opened via its link
 */
export function saveTabletContext(context: TabletPersistedContext): void {
  try {
    const data = {
      ...context,
      lastAccessedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.CONTEXT, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEYS.COMPANY_SLUG, context.companySlug);
    console.log('[TabletPersistence] Context saved:', context.companyName, context.companySlug);
  } catch (error) {
    console.error('[TabletPersistence] Failed to save context:', error);
  }
}

/**
 * Load persisted tablet context from localStorage
 * Returns null if no context is saved
 */
export function loadTabletContext(): TabletPersistedContext | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONTEXT);
    if (!stored) return null;
    
    const context = JSON.parse(stored) as TabletPersistedContext;
    
    // Validate required fields
    if (!context.companySlug || !context.companyId) {
      console.warn('[TabletPersistence] Invalid stored context, clearing...');
      clearTabletContext();
      return null;
    }
    
    console.log('[TabletPersistence] Context loaded:', context.companyName);
    return context;
  } catch (error) {
    console.error('[TabletPersistence] Failed to load context:', error);
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
 * Clear all tablet persistence data
 * Used when exiting tablet mode or resetting
 */
export function clearTabletContext(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CONTEXT);
    localStorage.removeItem(STORAGE_KEYS.COMPANY_SLUG);
    console.log('[TabletPersistence] Context cleared');
  } catch (error) {
    console.error('[TabletPersistence] Failed to clear context:', error);
  }
}

/**
 * Update the last accessed timestamp
 */
export function touchTabletContext(): void {
  try {
    const context = loadTabletContext();
    if (context) {
      context.lastAccessedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.CONTEXT, JSON.stringify(context));
    }
  } catch (error) {
    console.error('[TabletPersistence] Failed to touch context:', error);
  }
}

/**
 * Update table number in persisted context
 */
export function updatePersistedTableNumber(tableNumber: string): void {
  try {
    const context = loadTabletContext();
    if (context) {
      context.tableNumber = tableNumber;
      context.lastAccessedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.CONTEXT, JSON.stringify(context));
    }
  } catch (error) {
    console.error('[TabletPersistence] Failed to update table number:', error);
  }
}

/**
 * Check if we have a persisted tablet context
 */
export function hasPersistedTabletContext(): boolean {
  return !!getPersistedCompanySlug();
}
