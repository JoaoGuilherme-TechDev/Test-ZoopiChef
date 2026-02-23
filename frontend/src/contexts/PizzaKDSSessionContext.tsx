import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { PizzaKDSStep } from '@/hooks/usePizzaKDSSettings';

interface PizzaKDSOperator {
  id: string;
  name: string;
  assigned_step: PizzaKDSStep;
}

interface PizzaKDSSessionState {
  isAuthenticated: boolean;
  isLoading: boolean;
  operator: PizzaKDSOperator | null;
  companyId: string | null;
  restaurantName: string | null;
  restaurantLogo: string | null;
  sessionToken: string | null;
  pizzaKdsEnabled: boolean;
}

interface PizzaKDSSessionContextValue extends PizzaKDSSessionState {
  login: (slug: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  validateSlug: (slug: string) => Promise<{ valid: boolean; companyId?: string; name?: string; logo?: string; pizzaKdsEnabled?: boolean; error?: string }>;
  setRestaurantContext: (companyId: string, name: string, logo: string | null, pizzaKdsEnabled: boolean) => void;
}

const PizzaKDSSessionContext = createContext<PizzaKDSSessionContextValue | null>(null);

const STORAGE_KEY = 'pizza_kds_session';
const SLUG_STORAGE_KEY = 'pizza_kds_slug';

export function PizzaKDSSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PizzaKDSSessionState>({
    isAuthenticated: false,
    isLoading: true,
    operator: null,
    companyId: null,
    restaurantName: null,
    restaurantLogo: null,
    sessionToken: null,
    pizzaKdsEnabled: false,
  });

  // Validate existing session on mount
  useEffect(() => {
    const validateSession = async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setState((s) => ({ ...s, isLoading: false }));
        return;
      }

      try {
        const { token, companyId, restaurantName, restaurantLogo } = JSON.parse(stored);

        const { data, error } = await supabase.functions.invoke('pizza-kds-auth', {
          body: { action: 'validate_session', token },
        });

        if (error || !data?.valid) {
          localStorage.removeItem(STORAGE_KEY);
          setState((s) => ({ ...s, isLoading: false }));
          return;
        }

        setState({
          isAuthenticated: true,
          isLoading: false,
          operator: data.operator,
          companyId,
          restaurantName,
          restaurantLogo,
          sessionToken: token,
          pizzaKdsEnabled: true,
        });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setState((s) => ({ ...s, isLoading: false }));
      }
    };

    validateSession();
  }, []);

  const validateSlug = useCallback(async (slug: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('pizza-kds-auth', {
        body: { action: 'validate_slug', slug },
      });

      if (error || !data?.company) {
        return { valid: false, error: data?.error || 'Restaurante não encontrado' };
      }

      return {
        valid: true,
        companyId: data.company.id,
        name: data.company.name,
        logo: data.company.logo_url,
        pizzaKdsEnabled: data.pizza_kds_enabled,
      };
    } catch {
      return { valid: false, error: 'Erro ao validar restaurante' };
    }
  }, []);

  const setRestaurantContext = useCallback(
    (companyId: string, name: string, logo: string | null, pizzaKdsEnabled: boolean) => {
      setState((s) => ({
        ...s,
        companyId,
        restaurantName: name,
        restaurantLogo: logo,
        pizzaKdsEnabled,
      }));
      localStorage.setItem(SLUG_STORAGE_KEY, JSON.stringify({ companyId, name, logo, pizzaKdsEnabled }));
    },
    []
  );

  const login = useCallback(
    async (slug: string, pin: string) => {
      try {
        const { data, error } = await supabase.functions.invoke('pizza-kds-auth', {
          body: { action: 'login_by_pin', slug, pin },
        });

        if (error || !data?.session_token) {
          return { success: false, error: data?.error || 'Erro ao fazer login' };
        }

        const sessionData = {
          token: data.session_token,
          companyId: data.company_id,
          restaurantName: state.restaurantName,
          restaurantLogo: state.restaurantLogo,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));

        setState((s) => ({
          ...s,
          isAuthenticated: true,
          operator: data.operator,
          sessionToken: data.session_token,
          companyId: data.company_id,
        }));

        return { success: true };
      } catch {
        return { success: false, error: 'Erro de conexão' };
      }
    },
    [state.restaurantName, state.restaurantLogo]
  );

  const logout = useCallback(async () => {
    if (state.sessionToken) {
      await supabase.functions.invoke('pizza-kds-auth', {
        body: { action: 'logout', token: state.sessionToken },
      });
    }

    localStorage.removeItem(STORAGE_KEY);
    setState({
      isAuthenticated: false,
      isLoading: false,
      operator: null,
      companyId: null,
      restaurantName: null,
      restaurantLogo: null,
      sessionToken: null,
      pizzaKdsEnabled: false,
    });
  }, [state.sessionToken]);

  return (
    <PizzaKDSSessionContext.Provider
      value={{
        ...state,
        login,
        logout,
        validateSlug,
        setRestaurantContext,
      }}
    >
      {children}
    </PizzaKDSSessionContext.Provider>
  );
}

export function usePizzaKDSSession() {
  const context = useContext(PizzaKDSSessionContext);
  if (!context) {
    throw new Error('usePizzaKDSSession must be used within PizzaKDSSessionProvider');
  }
  return context;
}
