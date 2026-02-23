import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { PizzaKdsV2Stage } from '@/lib/pizzaKdsV2Stages';

/**
 * Pizza KDS V2 Session Context
 * 
 * Completely independent from the original Pizza KDS.
 * Manages authentication and session state for V2 operators.
 */

interface PizzaKdsV2Operator {
  id: string;
  name: string;
  assigned_stage: PizzaKdsV2Stage | 'admin';
}

interface PizzaKdsV2SessionState {
  isAuthenticated: boolean;
  isLoading: boolean;
  operator: PizzaKdsV2Operator | null;
  companyId: string | null;
  restaurantName: string | null;
  restaurantLogo: string | null;
  restaurantSlug: string | null;
  sessionToken: string | null;
  pizzaKdsV2Enabled: boolean;
}

interface PizzaKdsV2SessionContextValue extends PizzaKdsV2SessionState {
  login: (slug: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  validateSlug: (slug: string) => Promise<{ 
    valid: boolean; 
    companyId?: string; 
    name?: string; 
    logo?: string; 
    pizzaKdsV2Enabled?: boolean; 
    error?: string 
  }>;
  setRestaurantContext: (companyId: string, name: string, logo: string | null, slug: string, pizzaKdsV2Enabled: boolean) => void;
}

const PizzaKdsV2SessionContext = createContext<PizzaKdsV2SessionContextValue | null>(null);

const STORAGE_KEY = 'pizza_kds_v2_session';
const SLUG_STORAGE_KEY = 'pizza_kds_v2_slug';

export function PizzaKdsV2SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PizzaKdsV2SessionState>({
    isAuthenticated: false,
    isLoading: true,
    operator: null,
    companyId: null,
    restaurantName: null,
    restaurantLogo: null,
    restaurantSlug: null,
    sessionToken: null,
    pizzaKdsV2Enabled: false,
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
        const { token, companyId, restaurantName, restaurantLogo, restaurantSlug } = JSON.parse(stored);

        const { data, error } = await supabase.functions.invoke('pizza-kds-v2-auth', {
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
          restaurantSlug,
          sessionToken: token,
          pizzaKdsV2Enabled: true,
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
      const { data, error } = await supabase.functions.invoke('pizza-kds-v2-auth', {
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
        pizzaKdsV2Enabled: data.pizza_kds_v2_enabled,
      };
    } catch {
      return { valid: false, error: 'Erro ao validar restaurante' };
    }
  }, []);

  const setRestaurantContext = useCallback(
    (companyId: string, name: string, logo: string | null, slug: string, pizzaKdsV2Enabled: boolean) => {
      setState((s) => ({
        ...s,
        companyId,
        restaurantName: name,
        restaurantLogo: logo,
        restaurantSlug: slug,
        pizzaKdsV2Enabled,
      }));
      localStorage.setItem(SLUG_STORAGE_KEY, JSON.stringify({ companyId, name, logo, slug, pizzaKdsV2Enabled }));
    },
    []
  );

  const login = useCallback(
    async (slug: string, pin: string) => {
      try {
        const { data, error } = await supabase.functions.invoke('pizza-kds-v2-auth', {
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
          restaurantSlug: state.restaurantSlug,
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
    [state.restaurantName, state.restaurantLogo, state.restaurantSlug]
  );

  const logout = useCallback(async () => {
    if (state.sessionToken) {
      await supabase.functions.invoke('pizza-kds-v2-auth', {
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
      restaurantSlug: null,
      sessionToken: null,
      pizzaKdsV2Enabled: false,
    });
  }, [state.sessionToken]);

  return (
    <PizzaKdsV2SessionContext.Provider
      value={{
        ...state,
        login,
        logout,
        validateSlug,
        setRestaurantContext,
      }}
    >
      {children}
    </PizzaKdsV2SessionContext.Provider>
  );
}

export function usePizzaKdsV2Session() {
  const context = useContext(PizzaKdsV2SessionContext);
  if (!context) {
    throw new Error('usePizzaKdsV2Session must be used within PizzaKdsV2SessionProvider');
  }
  return context;
}
