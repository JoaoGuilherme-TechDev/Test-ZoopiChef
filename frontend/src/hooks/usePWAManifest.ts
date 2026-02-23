/**
 * usePWAManifest Hook
 * 
 * React hook to manage PWA manifest switching based on route changes.
 * Ensures each isolated PWA (Tablet, Totem, etc.) uses its own manifest.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initializeManifest } from '@/lib/pwa/manifestManager';

export function usePWAManifest(): void {
  const location = useLocation();
  
  useEffect(() => {
    // Update manifest whenever route changes
    initializeManifest();
  }, [location.pathname]);
}
