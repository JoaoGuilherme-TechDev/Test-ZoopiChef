/**
 * TenantDelivery - Isolated Delivery PWA
 * 
 * This component provides the Delivery menu for a specific tenant (restaurant).
 * It uses the standard PublicMenuBySlug component which handles:
 * - Loading/error states
 * - Empty product graceful handling
 * - Complete PWA isolation
 * 
 * The route param is :slug which PublicMenuBySlug reads directly.
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PublicMenuBySlug from '@/pages/PublicMenuBySlug';

/**
 * TenantDelivery just sets up the PWA manifest and delegates to PublicMenuBySlug.
 * PublicMenuBySlug handles all loading/error states internally with proper hook ordering.
 */
export default function TenantDelivery() {
  const { slug } = useParams<{ slug: string }>();

  // Set Delivery-specific manifest and theme
  useEffect(() => {
    // Update manifest link for Delivery PWA
    let manifestLink = document.querySelector('link[rel="manifest"]');
    const originalHref = manifestLink?.getAttribute('href');
    
    if (manifestLink) {
      manifestLink.setAttribute('href', '/manifest-delivery.webmanifest');
    } else {
      manifestLink = document.createElement('link');
      manifestLink.setAttribute('rel', 'manifest');
      manifestLink.setAttribute('href', '/manifest-delivery.webmanifest');
      document.head.appendChild(manifestLink);
    }

    // Update theme color for Delivery (purple)
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const originalThemeColor = themeColorMeta?.getAttribute('content');
    
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#8b5cf6');
    } else {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      themeColorMeta.setAttribute('content', '#8b5cf6');
      document.head.appendChild(themeColorMeta);
    }

    // Cleanup: restore original when leaving
    return () => {
      if (manifestLink && originalHref) {
        manifestLink.setAttribute('href', originalHref);
      }
      if (themeColorMeta && originalThemeColor) {
        themeColorMeta.setAttribute('content', originalThemeColor);
      }
    };
  }, []);

  // Render the menu - PublicMenuBySlug handles all states internally
  // with consistent hook ordering (no conditional early returns before hooks)
  return <PublicMenuBySlug />;
}
