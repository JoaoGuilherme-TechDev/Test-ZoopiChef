import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api'; // Usando nosso Axios centralizado

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
  sessionToken: string | null;
  sessionData: WaiterSessionData | null;
  isLoading: boolean;
  error: Error | null;
  companyId: string | null;
  companySlug: string | null;
  waiterId: string | null;
  waiterName: string | null;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const WaiterSessionContext = createContext<WaiterSessionContextType | undefined>(undefined);

export function WaiterSessionProvider({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<WaiterSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Validação agora feita no seu backend NestJS
  const validateSession = useCallback(async (token: string): Promise<WaiterSessionData | null> => {
    try {
      // Endpoint sugerido no seu Nest: POST /waiter/auth/validate
      const response = await api.post('/waiter/auth/validate', { session_token: token });
      return response.data; // Espera-se que retorne { waiter, company } ou algo similar
    } catch (err) {
      console.error('[WaiterSession] Validation error:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem(SESSION_KEY);
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      setSessionToken(token);
      const data = await validateSession(token);
      
      if (data) {
        setSessionData(data);
      } else {
        localStorage.removeItem(SESSION_KEY);
        setSessionToken(null);
        setError(new Error('Sessão expirada ou inválida'));
      }
      setIsLoading(false);
    };

    loadSession();
  }, [validateSession]);

  const refresh = useCallback(async () => {
    if (!sessionToken) return;
    setIsLoading(true);
    const data = await validateSession(sessionToken);
    if (data) {
      setSessionData(data);
    } else {
      localStorage.removeItem(SESSION_KEY);
      setSessionToken(null);
      setError(new Error('Sessão expirada'));
    }
    setIsLoading(false);
  }, [sessionToken, validateSession]);

  const logout = useCallback(async () => {
    if (sessionToken) {
      try {
        // Notifica o backend sobre o logout (opcional)
        await api.post('/waiter/auth/logout', { session_token: sessionToken });
      } catch (err) {
        console.warn('[WaiterSession] Logout error:', err);
      }
    }
    
    localStorage.removeItem(SESSION_KEY);
    setSessionToken(null);
    setSessionData(null);
    
    if (slug) {
      navigate(`/${slug}/garcom`, { replace: true });
    }
  }, [sessionToken, slug, navigate]);

  return (
    <WaiterSessionContext.Provider value={{
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
    }}>
      {children}
    </WaiterSessionContext.Provider>
  );
}

export function useWaiterSession() {
  const context = useContext(WaiterSessionContext);
  if (context === undefined) {
    throw new Error('useWaiterSession must be used within a WaiterSessionProvider');
  }
  return context;
}

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