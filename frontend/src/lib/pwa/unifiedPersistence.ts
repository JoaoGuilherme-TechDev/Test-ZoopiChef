/**
 * Unified PWA Persistence Layer
 * 
 * Stores both restaurant (slug) AND function (role) to ensure
 * each PWA is permanently tied to ONE restaurant + ONE function.
 * 
 * This is the single source of truth for PWA identity.
 */

export type PWAFunction = 
  | 'totem'
  | 'tablet'
  | 'garcom'
  | 'pdv'
  | 'terminal'
  | 'entregador';

export interface PWAContext {
  // Restaurant identification
  restaurantSlug: string;
  restaurantId: string;
  restaurantName: string;
  
  // Function identification
  function: PWAFunction;
  
  // Optional device/user context
  deviceToken?: string;
  deviceName?: string;
  userId?: string;
  tableNumber?: string;
  
  // Metadata
  lastAccessedAt: string;
  installedAt?: string;
}

const STORAGE_KEY = 'pwa_unified_context';

/**
 * Build the canonical URL for a PWA based on its context
 */
export function buildPWAUrl(context: Pick<PWAContext, 'restaurantSlug' | 'function' | 'deviceToken'>): string {
  const { restaurantSlug, function: fn, deviceToken } = context;
  
  switch (fn) {
    case 'totem':
      // Totem uses slug-only access (device selection handled internally)
      return `/${restaurantSlug}/totem`;
    case 'tablet':
      return `/${restaurantSlug}/tablet`;
    case 'garcom':
      return `/${restaurantSlug}/garcom`;
    case 'pdv':
      return `/${restaurantSlug}/pdv`;
    case 'terminal':
      return `/${restaurantSlug}/terminal`;
    case 'entregador':
      return `/${restaurantSlug}/entregador`;
    default:
      return `/${restaurantSlug}/${fn}`;
  }
}

/**
 * Save PWA context to localStorage
 */
export function savePWAContext(context: PWAContext): void {
  try {
    const existing = loadPWAContext();
    const data: PWAContext = {
      ...context,
      lastAccessedAt: new Date().toISOString(),
      installedAt: existing?.installedAt || new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log(`[PWA] Context saved: ${context.restaurantSlug}/${context.function}`);
  } catch (error) {
    console.error('[PWA] Failed to save context:', error);
  }
}

/**
 * Load PWA context from localStorage
 */
export function loadPWAContext(): PWAContext | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const context = JSON.parse(stored) as PWAContext;
    
    // Validate required fields
    if (!context.restaurantSlug || !context.function || !context.restaurantId) {
      console.warn('[PWA] Invalid stored context, clearing...');
      clearPWAContext();
      return null;
    }
    
    return context;
  } catch (error) {
    console.error('[PWA] Failed to load context:', error);
    return null;
  }
}

/**
 * Clear PWA context
 */
export function clearPWAContext(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[PWA] Context cleared');
  } catch (error) {
    console.error('[PWA] Failed to clear context:', error);
  }
}

/**
 * Touch context to update last accessed timestamp
 */
export function touchPWAContext(): void {
  try {
    const context = loadPWAContext();
    if (context) {
      context.lastAccessedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
    }
  } catch (error) {
    console.error('[PWA] Failed to touch context:', error);
  }
}

/**
 * Update specific fields in context
 */
export function updatePWAContext(updates: Partial<PWAContext>): void {
  try {
    const context = loadPWAContext();
    if (context) {
      const updated = { ...context, ...updates, lastAccessedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.error('[PWA] Failed to update context:', error);
  }
}

/**
 * Check if context matches expected function
 */
export function validatePWAFunction(expectedFunction: PWAFunction): boolean {
  const context = loadPWAContext();
  if (!context) return true; // No context = first load, allow
  return context.function === expectedFunction;
}

/**
 * Check if context matches expected restaurant
 */
export function validatePWARestaurant(expectedSlug: string): boolean {
  const context = loadPWAContext();
  if (!context) return true; // No context = first load, allow
  return context.restaurantSlug === expectedSlug;
}

/**
 * Get the redirect URL for PWA restoration
 * Returns null if no context exists
 */
export function getPWARestoreUrl(): string | null {
  const context = loadPWAContext();
  if (!context) return null;
  return buildPWAUrl(context);
}

/**
 * Check if we have a valid persisted context
 */
export function hasPersistedPWAContext(): boolean {
  return loadPWAContext() !== null;
}

/**
 * Parse URL to extract restaurant slug and function
 */
export function parseURLContext(pathname: string): { slug: string; function: PWAFunction } | null {
  // Pattern: /:slug/:function or /:slug/:function/:extra
  const patterns: { pattern: RegExp; fn: PWAFunction }[] = [
    { pattern: /^\/([^/]+)\/totem(?:\/|$)/, fn: 'totem' },
    { pattern: /^\/([^/]+)\/tablet(?:\/|$)/, fn: 'tablet' },
    { pattern: /^\/([^/]+)\/garcom(?:\/|$)/, fn: 'garcom' },
    { pattern: /^\/([^/]+)\/pdv(?:\/|$)/, fn: 'pdv' },
    { pattern: /^\/([^/]+)\/terminal(?:\/|$)/, fn: 'terminal' },
    { pattern: /^\/([^/]+)\/entregador(?:\/|$)/, fn: 'entregador' },
  ];
  
  for (const { pattern, fn } of patterns) {
    const match = pathname.match(pattern);
    if (match) {
      return { slug: match[1], function: fn };
    }
  }
  
  return null;
}
