/**
 * usePWAAccessFlow - Unified PWA Access State Machine
 * 
 * This is the SINGLE source of truth for PWA access flow.
 * All PWAs MUST use this hook for consistent behavior.
 * 
 * State Machine:
 * INIT → SLUG_ENTRY (if no slug) → RESTAURANT_RESOLVED → PIN_ENTRY (if auth required) → READY
 * 
 * Features:
 * - Slug validation via QR or manual input
 * - Restaurant context persistence (24h cache)
 * - PIN authentication for staff apps
 * - Role validation
 * - Session management
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase-shim';
import { 
  savePWAContext, 
  loadPWAContext, 
  clearPWAContext,
  PWAContext, 
  PWAFunction 
} from '@/lib/pwa/unifiedPersistence';

// ============================================
// TYPES
// ============================================

export type PWAAccessState = 
  | 'init'
  | 'slug_entry'
  | 'validating_slug'
  | 'restaurant_resolved'
  | 'checking_session'
  | 'pin_entry'
  | 'authenticating'
  | 'ready'
  | 'error';

export type PWARole = 'WAITER' | 'DELIVERY' | 'CASHIER' | 'OPERATOR' | 'PUBLIC';

export interface PWAConfig {
  function: PWAFunction;
  appName: string;
  requiresAuth: boolean;
  role: PWARole;
  authEdgeFunction?: string; // e.g., 'waiter-auth', 'entregador-auth'
  sessionStorageKey?: string;
  accentColor?: string;
}

export interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  whatsapp?: string | null;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: PWARole;
  sessionToken: string;
}

export interface PWAAccessFlowState {
  state: PWAAccessState;
  restaurant: RestaurantData | null;
  user: AuthenticatedUser | null;
  error: string | null;
}

export interface PWAAccessFlowActions {
  validateSlug: (slug: string) => Promise<boolean>;
  authenticate: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  reset: () => void;
  setError: (error: string | null) => void;
}

export interface UsePWAAccessFlowReturn extends PWAAccessFlowState, PWAAccessFlowActions {
  config: PWAConfig;
  isLoading: boolean;
  needsSlugEntry: boolean;
  needsPinEntry: boolean;
  isReady: boolean;
}

// ============================================
// STORAGE KEYS
// ============================================

const SLUG_CACHE_KEY = 'pwa_slug_cache';
const SLUG_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SlugCacheEntry {
  restaurant: RestaurantData;
  cachedAt: number;
}

function getSlugCache(): Record<string, SlugCacheEntry> {
  try {
    const cached = localStorage.getItem(SLUG_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function getCachedRestaurant(slug: string): RestaurantData | null {
  const cache = getSlugCache();
  const entry = cache[slug.toLowerCase()];
  if (!entry) return null;
  
  const isExpired = Date.now() - entry.cachedAt > SLUG_CACHE_TTL_MS;
  if (isExpired) {
    delete cache[slug.toLowerCase()];
    localStorage.setItem(SLUG_CACHE_KEY, JSON.stringify(cache));
    return null;
  }
  
  return entry.restaurant;
}

function cacheRestaurant(restaurant: RestaurantData): void {
  const cache = getSlugCache();
  cache[restaurant.slug.toLowerCase()] = {
    restaurant,
    cachedAt: Date.now(),
  };
  localStorage.setItem(SLUG_CACHE_KEY, JSON.stringify(cache));
}

// ============================================
// HOOK
// ============================================

export function usePWAAccessFlow(config: PWAConfig): UsePWAAccessFlowReturn {
  const { slug: urlSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const sessionKey = config.sessionStorageKey || `${config.function}_session_token`;
  const slugKey = `${config.function}_restaurant_slug`;
  
  const [flowState, setFlowState] = useState<PWAAccessFlowState>({
    state: 'init',
    restaurant: null,
    user: null,
    error: null,
  });

  // ============================================
  // DERIVED STATE
  // ============================================
  
  const isLoading = useMemo(() => {
    return ['init', 'validating_slug', 'checking_session', 'authenticating'].includes(flowState.state);
  }, [flowState.state]);

  const needsSlugEntry = flowState.state === 'slug_entry';
  const needsPinEntry = flowState.state === 'pin_entry';
  const isReady = flowState.state === 'ready';

  // ============================================
  // ACTIONS
  // ============================================
  
  const setError = useCallback((error: string | null) => {
    setFlowState(prev => ({ ...prev, error, state: error ? 'error' : prev.state }));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(slugKey);
    clearPWAContext();
    setFlowState({
      state: 'slug_entry',
      restaurant: null,
      user: null,
      error: null,
    });
  }, [slugKey]);

  const validateSlug = useCallback(async (slug: string): Promise<boolean> => {
    if (!slug?.trim()) {
      setError('Digite o código do restaurante');
      return false;
    }

    const normalizedSlug = slug.trim().toLowerCase();
    setFlowState(prev => ({ ...prev, state: 'validating_slug', error: null }));

    try {
      // Check cache first
      const cached = getCachedRestaurant(normalizedSlug);
      if (cached) {
        console.log(`[PWAAccess] Using cached restaurant: ${normalizedSlug}`);
        localStorage.setItem(slugKey, normalizedSlug);
        
        const ctx: PWAContext = {
          restaurantSlug: cached.slug,
          restaurantId: cached.id,
          restaurantName: cached.name,
          function: config.function,
          lastAccessedAt: new Date().toISOString(),
        };
        savePWAContext(ctx);
        
        setFlowState(prev => ({
          ...prev,
          state: config.requiresAuth ? 'checking_session' : 'ready',
          restaurant: cached,
        }));
        
        navigate(`/${normalizedSlug}/${config.function}`, { replace: true });
        return true;
      }

      // Validate against database
      const { data, error } = await supabase
        .from('public_companies')
        .select('id, name, slug, logo_url, whatsapp, is_active')
        .eq('slug', normalizedSlug)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setFlowState(prev => ({ ...prev, state: 'slug_entry', error: 'Restaurante não encontrado' }));
        return false;
      }

      if (!data.is_active) {
        setFlowState(prev => ({ ...prev, state: 'slug_entry', error: 'Restaurante temporariamente indisponível' }));
        return false;
      }

      const restaurant: RestaurantData = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        logo_url: data.logo_url,
        whatsapp: data.whatsapp,
      };

      cacheRestaurant(restaurant);
      localStorage.setItem(slugKey, normalizedSlug);
      
      const ctx: PWAContext = {
        restaurantSlug: restaurant.slug,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        function: config.function,
        lastAccessedAt: new Date().toISOString(),
      };
      savePWAContext(ctx);

      setFlowState(prev => ({
        ...prev,
        state: config.requiresAuth ? 'checking_session' : 'ready',
        restaurant,
      }));

      navigate(`/${normalizedSlug}/${config.function}`, { replace: true });
      return true;
    } catch (err) {
      console.error('[PWAAccess] Slug validation error:', err);
      setFlowState(prev => ({ ...prev, state: 'slug_entry', error: 'Erro ao validar. Tente novamente.' }));
      return false;
    }
  }, [config.function, config.requiresAuth, navigate, setError, slugKey]);

  const authenticate = useCallback(async (pin: string): Promise<boolean> => {
    if (!config.authEdgeFunction) {
      console.error('[PWAAccess] No auth edge function configured');
      return false;
    }

    if (!pin || pin.length < 4) {
      setError('Digite seu PIN de 4-6 dígitos');
      return false;
    }

    if (!flowState.restaurant) {
      setError('Restaurante não identificado');
      return false;
    }

    setFlowState(prev => ({ ...prev, state: 'authenticating', error: null }));

    try {
      const { data, error } = await supabase.functions.invoke(config.authEdgeFunction, {
        body: {
          action: 'login_by_pin',
          company_slug: flowState.restaurant.slug,
          pin,
        },
      });

      if (error) throw error;

      if (data?.error) {
        setFlowState(prev => ({ ...prev, state: 'pin_entry', error: data.error }));
        return false;
      }

      if (data?.success && data?.session_token) {
        const user: AuthenticatedUser = {
          id: data.waiter?.id || data.deliverer?.id || data.user?.id || '',
          name: data.waiter?.name || data.deliverer?.name || data.user?.name || '',
          role: config.role,
          sessionToken: data.session_token,
        };

        localStorage.setItem(sessionKey, data.session_token);
        
        setFlowState(prev => ({
          ...prev,
          state: 'ready',
          user,
          error: null,
        }));

        return true;
      }

      setFlowState(prev => ({ ...prev, state: 'pin_entry', error: 'Resposta inválida do servidor' }));
      return false;
    } catch (err: any) {
      console.error('[PWAAccess] Authentication error:', err);
      setFlowState(prev => ({ ...prev, state: 'pin_entry', error: 'Erro ao autenticar. Tente novamente.' }));
      return false;
    }
  }, [config.authEdgeFunction, config.role, flowState.restaurant, sessionKey, setError]);

  const logout = useCallback(async (): Promise<void> => {
    const token = localStorage.getItem(sessionKey);
    
    if (token && config.authEdgeFunction) {
      try {
        await supabase.functions.invoke(config.authEdgeFunction, {
          body: { action: 'logout', session_token: token },
        });
      } catch (err) {
        console.error('[PWAAccess] Logout error:', err);
      }
    }

    localStorage.removeItem(sessionKey);
    setFlowState(prev => ({
      ...prev,
      state: 'pin_entry',
      user: null,
    }));
  }, [config.authEdgeFunction, sessionKey]);

  // ============================================
  // INITIALIZATION EFFECT
  // ============================================
  
  useEffect(() => {
    const initialize = async () => {
      // Step 1: Determine slug
      const slug = urlSlug || localStorage.getItem(slugKey);
      
      if (!slug) {
        setFlowState(prev => ({ ...prev, state: 'slug_entry' }));
        return;
      }

      // Step 2: Validate slug
      const cached = getCachedRestaurant(slug);
      if (cached) {
        setFlowState(prev => ({
          ...prev,
          restaurant: cached,
          state: config.requiresAuth ? 'checking_session' : 'ready',
        }));
      } else {
        // Fetch from DB
        try {
          const { data } = await supabase
            .from('public_companies')
            .select('id, name, slug, logo_url, whatsapp, is_active')
            .eq('slug', slug.toLowerCase())
            .maybeSingle();

          if (!data || !data.is_active) {
            localStorage.removeItem(slugKey);
            setFlowState(prev => ({ ...prev, state: 'slug_entry' }));
            return;
          }

          const restaurant: RestaurantData = {
            id: data.id,
            name: data.name,
            slug: data.slug,
            logo_url: data.logo_url,
            whatsapp: data.whatsapp,
          };

          cacheRestaurant(restaurant);
          
          setFlowState(prev => ({
            ...prev,
            restaurant,
            state: config.requiresAuth ? 'checking_session' : 'ready',
          }));
        } catch {
          localStorage.removeItem(slugKey);
          setFlowState(prev => ({ ...prev, state: 'slug_entry' }));
          return;
        }
      }
    };

    initialize();
  }, [urlSlug, slugKey, config.requiresAuth]);

  // ============================================
  // SESSION CHECK EFFECT (for auth-required apps)
  // ============================================
  
  useEffect(() => {
    if (flowState.state !== 'checking_session') return;
    if (!config.requiresAuth || !config.authEdgeFunction) {
      setFlowState(prev => ({ ...prev, state: 'ready' }));
      return;
    }

    const checkSession = async () => {
      const token = localStorage.getItem(sessionKey);
      
      if (!token) {
        setFlowState(prev => ({ ...prev, state: 'pin_entry' }));
        return;
      }

      try {
        const { data } = await supabase.functions.invoke(config.authEdgeFunction!, {
          body: { action: 'validate', session_token: token },
        });

        if (data?.valid) {
          const user: AuthenticatedUser = {
            id: data.waiter?.id || data.deliverer?.id || data.user?.id || '',
            name: data.waiter?.name || data.deliverer?.name || data.user?.name || '',
            role: config.role,
            sessionToken: token,
          };

          setFlowState(prev => ({
            ...prev,
            state: 'ready',
            user,
          }));
        } else {
          localStorage.removeItem(sessionKey);
          setFlowState(prev => ({ ...prev, state: 'pin_entry' }));
        }
      } catch {
        localStorage.removeItem(sessionKey);
        setFlowState(prev => ({ ...prev, state: 'pin_entry' }));
      }
    };

    checkSession();
  }, [flowState.state, config.requiresAuth, config.authEdgeFunction, config.role, sessionKey]);

  return {
    ...flowState,
    config,
    isLoading,
    needsSlugEntry,
    needsPinEntry,
    isReady,
    validateSlug,
    authenticate,
    logout,
    reset,
    setError,
  };
}
