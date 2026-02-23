/**
 * PWA Manifest Manager
 * 
 * Dynamically switches the manifest link based on the current route
 * to ensure each PWA (Tablet, Totem, Garçom, Entregador, PDV) has its own isolated manifest.
 * 
 * NEW PATTERN: /:slug/:function for restaurant-scoped PWAs
 */

type ManifestConfig = {
  pathPattern: RegExp;
  manifestUrl: string;
  themeColor: string;
  name: string;
  requiresAuth: boolean;
};

const MANIFEST_CONFIGS: ManifestConfig[] = [
  // ========================================
  // PWA Entry routes - Universal entry points for installed PWAs
  // ========================================
  {
    pathPattern: /^\/pwa\/totem(?:\/|$)/,
    manifestUrl: '/manifest-totem.webmanifest',
    themeColor: '#f97316',
    name: 'Totem',
    requiresAuth: false,
  },
  {
    pathPattern: /^\/pwa\/tablet(?:\/|$)/,
    manifestUrl: '/manifest-tablet.webmanifest',
    themeColor: '#8b5cf6',
    name: 'Tablet',
    requiresAuth: false,
  },
  {
    pathPattern: /^\/pwa\/garcom(?:\/|$)/,
    manifestUrl: '/manifest-waiter.webmanifest',
    themeColor: '#3b82f6',
    name: 'Garçom',
    requiresAuth: true,
  },
  {
    pathPattern: /^\/pwa\/pdv(?:\/|$)/,
    manifestUrl: '/manifest-pdv.webmanifest',
    themeColor: '#10b981',
    name: 'PDV',
    requiresAuth: true,
  },
  {
    pathPattern: /^\/pwa\/terminal(?:\/|$)/,
    manifestUrl: '/manifest-terminal.webmanifest',
    themeColor: '#6366f1',
    name: 'Terminal',
    requiresAuth: true,
  },
  {
    pathPattern: /^\/pwa\/entregador(?:\/|$)/,
    manifestUrl: '/manifest-entregador.webmanifest',
    themeColor: '#22c55e',
    name: 'Entregador',
    requiresAuth: true,
  },
  {
    pathPattern: /^\/pwa\/delivery(?:\/|$)/,
    manifestUrl: '/manifest-delivery.webmanifest',
    themeColor: '#8b5cf6',
    name: 'Delivery',
    requiresAuth: false,
  },
  {
    pathPattern: /^\/pwa\/kds(?:\/|$)/,
    manifestUrl: '/manifest-kds.webmanifest',
    themeColor: '#ef4444',
    name: 'KDS',
    requiresAuth: true,
  },
  {
    pathPattern: /^\/pwa\/pizza-kds(?:\/|$)/,
    manifestUrl: '/pwa/pizza-kds.webmanifest',
    themeColor: '#EA580C',
    name: 'Pizza KDS',
    requiresAuth: true,
  },
  {
    pathPattern: /^\/pwa\/scheduled-orders(?:\/|$)/,
    manifestUrl: '/manifest-scheduled-orders.webmanifest',
    themeColor: '#059669',
    name: 'Pedidos Agendados',
    requiresAuth: false,
  },
  {
    // Primary route: /scheduled-orders and /scheduled-orders/:companySlug
    pathPattern: /^\/scheduled-orders(?:\/|$)/,
    manifestUrl: '/manifest-scheduled-orders.webmanifest',
    themeColor: '#059669',
    name: 'Pedidos Agendados',
    requiresAuth: false,
  },
  // ========================================
  // Restaurant-scoped routes: /:slug/:function
  // ========================================
  {
    pathPattern: /^\/[^/]+\/totem(?:\/|$)/,
    manifestUrl: '/manifest-totem.webmanifest',
    themeColor: '#f97316',
    name: 'Totem',
    requiresAuth: false,
  },
  {
    pathPattern: /^\/[^/]+\/tablet(?:\/|$)/,
    manifestUrl: '/manifest-tablet.webmanifest',
    themeColor: '#8b5cf6',
    name: 'Tablet',
    requiresAuth: false,
  },
  {
    pathPattern: /^\/[^/]+\/garcom(?:\/|$)/,
    manifestUrl: '/manifest-waiter.webmanifest',
    themeColor: '#3b82f6',
    name: 'Garçom',
    requiresAuth: true,
  },
  {
    pathPattern: /^\/[^/]+\/pdv(?:\/|$)/,
    manifestUrl: '/manifest-pdv.webmanifest',
    themeColor: '#10b981',
    name: 'PDV',
    requiresAuth: true,
  },
  {
    pathPattern: /^\/[^/]+\/terminal(?:\/|$)/,
    manifestUrl: '/manifest-terminal.webmanifest',
    themeColor: '#6366f1',
    name: 'Terminal',
    requiresAuth: true,
  },
  {
    pathPattern: /^\/[^/]+\/entregador(?:\/|$)/,
    manifestUrl: '/manifest-entregador.webmanifest',
    themeColor: '#22c55e',
    name: 'Entregador',
    requiresAuth: true,
  },
  {
    pathPattern: /^\/[^/]+\/delivery(?:\/|$)/,
    manifestUrl: '/manifest-delivery.webmanifest',
    themeColor: '#8b5cf6',
    name: 'Delivery',
    requiresAuth: false,
  },
  {
    pathPattern: /^\/[^/]+\/kds(?:\/|$)/,
    manifestUrl: '/manifest-kds.webmanifest',
    themeColor: '#ef4444',
    name: 'KDS',
    requiresAuth: true,
  },
  {
    pathPattern: /^\/[^/]+\/scheduled-orders(?:\/|$)/,
    manifestUrl: '/manifest-scheduled-orders.webmanifest',
    themeColor: '#059669',
    name: 'Pedidos Agendados',
    requiresAuth: false,
  },
  // ========================================
  // Fallback: PWA entry pages - for first-time slug selection
  // ========================================
  {
    pathPattern: /^\/pwa\//,
    manifestUrl: '/manifest-default.webmanifest',
    themeColor: '#6366f1',
    name: 'Zoopi',
    requiresAuth: false,
  },
];

/**
 * Get the appropriate manifest config for the current path
 */
function getManifestForPath(pathname: string): ManifestConfig | null {
  return MANIFEST_CONFIGS.find(config => config.pathPattern.test(pathname)) || null;
}

/**
 * Update the manifest link element in the document head
 */
function updateManifestLink(manifestUrl: string): void {
  let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
  
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  
  // Only update if different to avoid unnecessary reloads
  if (link.href !== new URL(manifestUrl, window.location.origin).href) {
    link.href = manifestUrl;
  }
}

/**
 * Update the theme-color meta tag
 */
function updateThemeColor(color: string): void {
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  
  if (meta.content !== color) {
    meta.content = color;
  }
}

/**
 * Initialize manifest based on current route
 * Call this on app startup and on route changes
 */
export function initializeManifest(): void {
  const pathname = window.location.pathname;
  const config = getManifestForPath(pathname);
  
  if (config) {
    updateManifestLink(config.manifestUrl);
    updateThemeColor(config.themeColor);
  } else {
    // Default manifest for main app
    updateManifestLink('/manifest.webmanifest');
    updateThemeColor('#6366f1');
  }
}

/**
 * Check if the current route belongs to an isolated PWA
 */
export function isIsolatedPWARoute(pathname: string): boolean {
  return MANIFEST_CONFIGS.some(config => config.pathPattern.test(pathname));
}

/**
 * Get PWA info for the current route
 */
export function getCurrentPWAInfo(pathname: string): { name: string; requiresAuth: boolean } | null {
  const config = getManifestForPath(pathname);
  if (!config) return null;
  return { name: config.name, requiresAuth: config.requiresAuth };
}

/**
 * Extract restaurant slug from PWA URL pattern
 */
export function extractRestaurantSlug(pathname: string): string | null {
  // Pattern: /:slug/:function
  const match = pathname.match(/^\/([^/]+)\/(totem|tablet|garcom|pdv|entregador)(?:\/|$)/);
  return match ? match[1] : null;
}

/**
 * Extract function type from PWA URL pattern
 */
export function extractPWAFunction(pathname: string): string | null {
  const match = pathname.match(/^\/[^/]+\/(totem|tablet|garcom|pdv|entregador)(?:\/|$)/);
  return match ? match[1] : null;
}
