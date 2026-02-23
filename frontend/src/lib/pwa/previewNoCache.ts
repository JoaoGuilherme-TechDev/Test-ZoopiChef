/**
 * Preview No-Cache Guard
 *
 * The Lovable preview runs on a dedicated subdomain and is meant to always
 * reflect the latest build. A previously installed Service Worker can cause
 * stale HTML/assets to be served even after new deployments.
 *
 * This module disables Service Workers and clears Cache Storage ONLY in preview.
 */

function isLovablePreviewHost(hostname: string): boolean {
  // Typical preview hostname pattern: id-preview--<uuid>.lovable.app
  return hostname.includes('id-preview--');
}

export function isPreviewEnvironment(): boolean {
  try {
    return isLovablePreviewHost(window.location.hostname);
  } catch {
    return false;
  }
}

export async function disablePreviewCaching(): Promise<void> {
  if (!isPreviewEnvironment()) return;

  // 1) Unregister any active Service Workers
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // Ignore
  }

  // 2) Clear Cache Storage
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // Ignore
  }
}
