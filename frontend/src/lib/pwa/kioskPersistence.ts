/**
 * Kiosk/Totem PWA Persistence Layer
 * 
 * Persists restaurant context to localStorage so the PWA
 * can automatically restore the session after reopening.
 * 
 * This is critical for kiosk-style devices that must
 * NEVER forget their restaurant context.
 */

const STORAGE_PREFIX = 'kiosk_pwa_';

export interface KioskPersistedContext {
  deviceToken: string;
  companyId: string;
  companySlug: string;
  companyName: string;
  deviceName?: string;
  lastAccessedAt: string;
}

const STORAGE_KEYS = {
  CONTEXT: `${STORAGE_PREFIX}context`,
  DEVICE_TOKEN: `${STORAGE_PREFIX}device_token`,
};

/**
 * Save kiosk context to localStorage
 * Called when the kiosk is first opened via its link
 */
export function saveKioskContext(context: KioskPersistedContext): void {
  try {
    const data = {
      ...context,
      lastAccessedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.CONTEXT, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEYS.DEVICE_TOKEN, context.deviceToken);
    console.log('[KioskPersistence] Context saved:', context.companyName, context.deviceToken);
  } catch (error) {
    console.error('[KioskPersistence] Failed to save context:', error);
  }
}

/**
 * Load persisted kiosk context from localStorage
 * Returns null if no context is saved
 */
export function loadKioskContext(): KioskPersistedContext | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONTEXT);
    if (!stored) return null;
    
    const context = JSON.parse(stored) as KioskPersistedContext;
    
    // Validate required fields
    if (!context.deviceToken || !context.companyId) {
      console.warn('[KioskPersistence] Invalid stored context, clearing...');
      clearKioskContext();
      return null;
    }
    
    console.log('[KioskPersistence] Context loaded:', context.companyName);
    return context;
  } catch (error) {
    console.error('[KioskPersistence] Failed to load context:', error);
    return null;
  }
}

/**
 * Get only the device token (faster than loading full context)
 */
export function getPersistedDeviceToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.DEVICE_TOKEN);
  } catch {
    return null;
  }
}

/**
 * Clear all kiosk persistence data
 * Used when exiting kiosk mode or resetting
 */
export function clearKioskContext(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CONTEXT);
    localStorage.removeItem(STORAGE_KEYS.DEVICE_TOKEN);
    console.log('[KioskPersistence] Context cleared');
  } catch (error) {
    console.error('[KioskPersistence] Failed to clear context:', error);
  }
}

/**
 * Update the last accessed timestamp
 * Call this periodically to track kiosk activity
 */
export function touchKioskContext(): void {
  try {
    const context = loadKioskContext();
    if (context) {
      context.lastAccessedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.CONTEXT, JSON.stringify(context));
    }
  } catch (error) {
    console.error('[KioskPersistence] Failed to touch context:', error);
  }
}

/**
 * Check if we have a persisted kiosk context
 */
export function hasPersistedContext(): boolean {
  return !!getPersistedDeviceToken();
}
