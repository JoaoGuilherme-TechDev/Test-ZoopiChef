/**
 * PWAManifestInitializer
 * 
 * Component that initializes the correct PWA manifest based on the current route.
 * Place this inside BrowserRouter but before Routes for proper routing context.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initializeManifest } from '@/lib/pwa/manifestManager';

export function PWAManifestInitializer(): null {
  const location = useLocation();
  
  useEffect(() => {
    // Initialize manifest on mount and route changes
    initializeManifest();
  }, [location.pathname]);
  
  // This component renders nothing
  return null;
}
