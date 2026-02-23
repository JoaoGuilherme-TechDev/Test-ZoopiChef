/**
 * EntregadorLayout - Isolated layout wrapper for Entregador PWA
 * 
 * This layout ensures complete isolation from the main app:
 * - Uses its own manifest link
 * - Does NOT include AuthProvider (uses PIN-based auth)
 * - Does NOT include CompanyProvider
 * - Does NOT include any shared navigation
 */

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

export function EntregadorLayout() {
  // Set the correct manifest for this PWA
  useEffect(() => {
    // Find existing manifest link or create one
    let manifestLink = document.querySelector('link[rel="manifest"]');
    const originalHref = manifestLink?.getAttribute('href');
    
    if (manifestLink) {
      manifestLink.setAttribute('href', '/manifest-entregador.webmanifest');
    } else {
      manifestLink = document.createElement('link');
      manifestLink.setAttribute('rel', 'manifest');
      manifestLink.setAttribute('href', '/manifest-entregador.webmanifest');
      document.head.appendChild(manifestLink);
    }

    // Update theme color for entregador (green)
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const originalThemeColor = themeColorMeta?.getAttribute('content');
    
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#22c55e');
    } else {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      themeColorMeta.setAttribute('content', '#22c55e');
      document.head.appendChild(themeColorMeta);
    }

    // Cleanup: restore original manifest when leaving
    return () => {
      if (manifestLink && originalHref) {
        manifestLink.setAttribute('href', originalHref);
      }
      if (themeColorMeta && originalThemeColor) {
        themeColorMeta.setAttribute('content', originalThemeColor);
      }
    };
  }, []);

  return <Outlet />;
}

export default EntregadorLayout;
