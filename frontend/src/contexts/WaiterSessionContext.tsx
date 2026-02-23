/**
 * WaiterSessionContext
 * 
 * Provides waiter session state for PIN-authenticated waiter PWA.
 * This replaces the need for Supabase Auth in the waiter app.
 * 
 * The session token is stored in localStorage and validated against
 * the waiter_sessions table via the waiter-auth edge function.
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase-shim';

const SESSION_KEY = 'garcom_session_token';

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

interface WaiterSessionContextType {
  // Session state
  sessionToken: string | null;
  sessionData: WaiterSessionData | null;
  isLoading: boolean;
  error: Error | null;
  
  // Derived data for hooks
  companyId: string | null;
  companySlug: string | null;
  waiterId: string | null;
  waiterName: string | null;
  
  // Actions
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const WaiterSessionContext = createContext<WaiterSessionContextType | undefined>(undefined);

interface WaiterSessionProviderProps {
  children: ReactNode;
}

export function WaiterSessionProvider({ children }: WaiterSessionProviderProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<WaiterSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Validate session token
  const validateSession = useCallback(async (token: string): Promise<WaiterSessionData | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('waiter-auth', {
        body: { action: 'validate', session_token: token }
      });

      if (fnError) {
        console.error('[WaiterSession] Validation error:', fnError);
        return null;
      }

      if (!data?.valid) {
        console.warn('[WaiterSession] Session invalid:', data?.error);
        return null;
      }

      return {
        waiter: data.waiter,
        company: data.company,
      };
    } catch (err) {
      console.error('[WaiterSession] Validation exception:', err);
      return null;
    }
  }, []);

  // Load and validate session on mount
  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem(SESSION_KEY);
      
      if (!token) {
        console.log('[WaiterSession] No token found');
        setSessionToken(null);
        setSessionData(null);
        setIsLoading(false);
        return;
      }

      setSessionToken(token);
      
      const data = await validateSession(token);
      
      if (data) {
        setSessionData(data);
        setError(null);
      } else {
        // Invalid session - clear it
        localStorage.removeItem(SESSION_KEY);
        setSessionToken(null);
        setSessionData(null);
        setError(new Error('Sessão expirada ou inválida'));
      }
      
      setIsLoading(false);
    };

    loadSession();
  }, [validateSession]);

  // Refresh session
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
        console.warn('[WaiterSession] Logout error:', err);
      }
    }
    
    localStorage.removeItem(SESSION_KEY);
    setSessionToken(null);
    setSessionData(null);
    
    // Navigate to login
    if (slug) {
      navigate(`/${slug}/garcom`, { replace: true });
    }
  }, [sessionToken, slug, navigate]);

  const value: WaiterSessionContextType = {
    sessionToken,
    sessionData,
    isLoading,
    error,
    companyId: sessionData?.company.id ?? null,
    companySlug: sessionData?.company.slug ?? null,
    waiterId: sessionData?.waiter.id ?? null,
    waiterName: sessionData?.waiter.name ?? null,
    logout,
    refresh,
  };

  return (
    <WaiterSessionContext.Provider value={value}>
      {children}
    </WaiterSessionContext.Provider>
  );
}

/**
 * Hook to access waiter session context
 */
export function useWaiterSession() {
  const context = useContext(WaiterSessionContext);
  if (context === undefined) {
    throw new Error('useWaiterSession must be used within a WaiterSessionProvider');
  }
  return context;
}

/**
 * Hook that returns company data in the same format as useCompany()
 * but for PIN-authenticated waiters
 */
export function useWaiterCompany() {
  const { sessionData, isLoading, companyId } = useWaiterSession();
  
  return {
    data: sessionData ? {
      id: sessionData.company.id,
      name: sessionData.company.name,
      slug: sessionData.company.slug,
      logo_url: sessionData.company.logo_url,
    } : null,
    isLoading,
    companyId,
  };
}
