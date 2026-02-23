/**
 * PWA Version Manager
 * 
 * Manages build versioning and cache invalidation to ensure the preview
 * always loads the most recent build without requiring manual refresh.
 */

// Build timestamp is injected at build time via Vite
const BUILD_TIMESTAMP = import.meta.env.VITE_BUILD_TIMESTAMP || Date.now().toString();
const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION || 'dev';

const VERSION_STORAGE_KEY = 'zoopi-app-version';
const TIMESTAMP_STORAGE_KEY = 'zoopi-build-timestamp';

interface VersionInfo {
  version: string;
  timestamp: string;
  checkedAt: number;
}

/**
 * Get stored version info from localStorage
 */
function getStoredVersion(): VersionInfo | null {
  try {
    const stored = localStorage.getItem(VERSION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Store current version info
 */
function storeVersion(info: VersionInfo): void {
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(info));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear all application caches
 */
async function clearAllCaches(): Promise<void> {
  try {
    // Clear Cache Storage (Service Worker caches)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('[VersionManager] Cleared', cacheNames.length, 'cache(s)');
    }
  } catch (error) {
    console.error('[VersionManager] Error clearing caches:', error);
  }
}

/**
 * Force Service Worker to update immediately
 */
async function forceServiceWorkerUpdate(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (registration) {
      // Force update check
      await registration.update();
      
      // If there's a waiting worker, activate it immediately
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        console.log('[VersionManager] Activated waiting Service Worker');
        return true;
      }
      
      // If there's an installing worker, wait for it
      if (registration.installing) {
        return new Promise((resolve) => {
          registration.installing!.addEventListener('statechange', (e) => {
            const sw = e.target as ServiceWorker;
            if (sw.state === 'installed') {
              sw.postMessage({ type: 'SKIP_WAITING' });
              console.log('[VersionManager] New Service Worker installed and activated');
              resolve(true);
            }
          });
          
          // Timeout after 5 seconds
          setTimeout(() => resolve(false), 5000);
        });
      }
    }
    
    return false;
  } catch (error) {
    console.error('[VersionManager] Error updating Service Worker:', error);
    return false;
  }
}

/**
 * Check if app needs to be refreshed due to version change
 */
export async function checkForUpdates(): Promise<{ needsRefresh: boolean; isNewVersion: boolean }> {
  const currentVersion: VersionInfo = {
    version: BUILD_VERSION,
    timestamp: BUILD_TIMESTAMP,
    checkedAt: Date.now(),
  };

  const storedVersion = getStoredVersion();

  // First load - just store the version
  if (!storedVersion) {
    storeVersion(currentVersion);
    console.log('[VersionManager] Initial version stored:', currentVersion.timestamp);
    return { needsRefresh: false, isNewVersion: false };
  }

  // Check if timestamp changed (new build deployed)
  if (storedVersion.timestamp !== BUILD_TIMESTAMP) {
    console.log('[VersionManager] New build detected!');
    console.log('[VersionManager] Old:', storedVersion.timestamp, '→ New:', BUILD_TIMESTAMP);
    
    // Clear caches and update Service Worker
    await clearAllCaches();
    const swUpdated = await forceServiceWorkerUpdate();
    
    // Store new version
    storeVersion(currentVersion);
    
    return { needsRefresh: true, isNewVersion: true };
  }

  return { needsRefresh: false, isNewVersion: false };
}

/**
 * Force a complete cache refresh and reload
 */
export async function forceRefresh(): Promise<void> {
  console.log('[VersionManager] Force refresh initiated');
  
  // Clear all caches
  await clearAllCaches();
  
  // Update Service Worker
  await forceServiceWorkerUpdate();
  
  // Clear stored version to force fresh check on reload
  localStorage.removeItem(VERSION_STORAGE_KEY);
  
  // Reload the page bypassing cache
  window.location.reload();
}

/**
 * Initialize version checking on app startup
 */
export async function initializeVersionCheck(): Promise<void> {
  console.log('[VersionManager] Initializing... Build:', BUILD_TIMESTAMP);
  
  const { needsRefresh, isNewVersion } = await checkForUpdates();
  
  if (needsRefresh && isNewVersion) {
    console.log('[VersionManager] New version detected, reloading...');
    // Small delay to ensure caches are cleared
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }
}

/**
 * Listen for Service Worker updates and handle them
 */
export function setupServiceWorkerListener(): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[VersionManager] Service Worker controller changed, reloading...');
    window.location.reload();
  });

  // Listen for messages from Service Worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'NEW_VERSION_AVAILABLE') {
      console.log('[VersionManager] New version available notification received');
      forceRefresh();
    }
  });
}

/**
 * Get current build info for debugging
 */
export function getBuildInfo(): { version: string; timestamp: string; stored: VersionInfo | null } {
  return {
    version: BUILD_VERSION,
    timestamp: BUILD_TIMESTAMP,
    stored: getStoredVersion(),
  };
}
