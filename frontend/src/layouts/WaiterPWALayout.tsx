/**
 * WaiterPWALayout - Shared layout wrapper for all Garçom PWA routes
 * 
 * This layout provides:
 * 1. A SINGLE WaiterSessionProvider that persists across all waiter routes
 * 2. Session validation on initial load only (not on every navigation)
 * 3. Automatic redirect to login if session is invalid
 * 
 * This prevents the "session expired" issue that occurred when each screen
 * had its own WaiterSessionProvider that re-validated on every navigation.
 */

import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SESSION_KEY = 'garcom_session_token';
const SLUG_KEY = 'garcom_restaurant_slug';

export interface WaiterSessionData {
  waiter: {
    id: string;
    name: string;
  };
  company: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
  };
}

interface WaiterLayoutContextType {
  // Session state
  sessionToken: string | null;
  sessionData: WaiterSessionData | null;
  isLoading: boolean;
  error: Error | null;
  
  // Derived data
  companyId: string | null;
  companySlug: string | null;
  waiterId: string | null;
  waiterName: string | null;
  slug: string;
  
  // Actions
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const WaiterLayoutContext = createContext<WaiterLayoutContextType | undefined>(undefined);

/**
 * Hook to access waiter session from the layout context
 * This replaces the old useWaiterSession hook for screens within the layout
 */
export function useWaiterLayoutSession() {
  const context = useContext(WaiterLayoutContext);
  if (context === undefined) {
    throw new Error('useWaiterLayoutSession must be used within WaiterPWALayout');
  }
  return context;
}

export default function WaiterPWALayout() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<WaiterSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isValidated, setIsValidated] = useState(false);

  // Get the effective slug (from URL or localStorage)
  const effectiveSlug = slug || localStorage.getItem(SLUG_KEY) || '';

  // Validate session token once
  const validateSession = useCallback(async (token: string): Promise<WaiterSessionData | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('waiter-auth', {
        body: { action: 'validate', session_token: token }
      });

      if (fnError) {
        console.error('[WaiterLayout] Validation error:', fnError);
        return null;
      }

      if (!data?.valid) {
        console.warn('[WaiterLayout] Session invalid:', data?.error);
        return null;
      }

      return {
        waiter: data.waiter,
        company: data.company,
      };
    } catch (err) {
      console.error('[WaiterLayout] Validation exception:', err);
      return null;
    }
  }, []);

  // Load and validate session on mount ONLY
  useEffect(() => {
    // Skip if already validated
    if (isValidated) return;

    const loadSession = async () => {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem(SESSION_KEY);
      
      if (!token) {
        console.log('[WaiterLayout] No token found');
        setSessionToken(null);
        setSessionData(null);
        setIsLoading(false);
        setIsValidated(true);
        return;
      }

      setSessionToken(token);
      
      const data = await validateSession(token);
      
      if (data) {
        setSessionData(data);
        setError(null);
        // Update stored slug if company slug is different
        if (data.company.slug) {
          localStorage.setItem(SLUG_KEY, data.company.slug);
        }
      } else {
        // Invalid session - clear it
        localStorage.removeItem(SESSION_KEY);
        setSessionToken(null);
        setSessionData(null);
        setError(new Error('Sessão expirada ou inválida'));
      }
      
      setIsLoading(false);
      setIsValidated(true);
    };

    loadSession();
  }, [validateSession, isValidated]);

  // Refresh session (manual trigger)
  const refresh = useCallback(async () => {
    if (!sessionToken) return;
    
    setIsLoading(true);
    const data = await validateSession(sessionToken);
    
    if (data) {
      setSessionData(data);
      setError(null);
    } else {
      localStorage.removeItem(SESSION_KEY);
      setSessionToken(null);
      setSessionData(null);
      setError(new Error('Sessão expirada'));
    }
    
    setIsLoading(false);
  }, [sessionToken, validateSession]);

  // Logout
  const logout = useCallback(async () => {
    if (sessionToken) {
      try {
        await supabase.functions.invoke('waiter-auth', {
          body: { action: 'logout', session_token: sessionToken }
        });
      } catch (err) {
        console.warn('[WaiterLayout] Logout error:', err);
      }
    }
    
    localStorage.removeItem(SESSION_KEY);
    setSessionToken(null);
    setSessionData(null);
    setIsValidated(false);
    
    // Navigate to login
    if (effectiveSlug) {
      navigate(`/${effectiveSlug}/garcom`, { replace: true });
    }
  }, [sessionToken, effectiveSlug, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validando sessão...</p>
        </div>
      </div>
    );
  }

  // No session - show expired message
  if (!sessionData || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/30">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Sessão expirada</h2>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'Sua sessão expirou ou é inválida. Faça login novamente.'}
            </p>
            <Button onClick={() => navigate(`/${effectiveSlug}/garcom`, { replace: true })}>
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const contextValue: WaiterLayoutContextType = {
    sessionToken,
    sessionData,
    isLoading,
    error,
    companyId: sessionData.company.id,
    companySlug: sessionData.company.slug,
    waiterId: sessionData.waiter.id,
    waiterName: sessionData.waiter.name,
    slug: effectiveSlug,
    logout,
    refresh,
  };

  return (
    <WaiterLayoutContext.Provider value={contextValue}>
      <Outlet />
    </WaiterLayoutContext.Provider>
  );
}
