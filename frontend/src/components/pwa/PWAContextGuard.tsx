/**
 * PWAContextGuard
 * 
 * Guards a PWA route to ensure it's running under the correct
 * restaurant + function context. Handles restoration and validation.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  PWAFunction,
  loadPWAContext,
  savePWAContext,
  buildPWAUrl,
  parseURLContext,
  touchPWAContext,
} from '@/lib/pwa/unifiedPersistence';

interface PWAContextGuardProps {
  /** The function this guard is protecting */
  expectedFunction: PWAFunction;
  /** Children to render when context is valid */
  children: React.ReactNode;
  /** Optional: Restaurant data loader component */
  restaurantResolver?: React.ComponentType<{ slug: string; children: (data: RestaurantData) => React.ReactNode }>;
}

interface RestaurantData {
  id: string;
  name: string;
  slug: string;
}

type GuardState = 
  | { status: 'loading' }
  | { status: 'valid' }
  | { status: 'restoring'; targetUrl: string }
  | { status: 'error'; message: string };

export function PWAContextGuard({ expectedFunction, children }: PWAContextGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ slug?: string; token?: string }>();
  const [state, setState] = useState<GuardState>({ status: 'loading' });

  useEffect(() => {
    const validateContext = () => {
      const urlContext = parseURLContext(location.pathname);
      const storedContext = loadPWAContext();
      
      // Case 1: URL has full context (/:slug/:function)
      if (urlContext) {
        // Validate function matches
        if (urlContext.function !== expectedFunction) {
          console.error(`[PWAGuard] Function mismatch: expected ${expectedFunction}, got ${urlContext.function}`);
          setState({
            status: 'error',
            message: `Este aplicativo é para ${expectedFunction}, mas você está acessando ${urlContext.function}`,
          });
          return;
        }
        
        // If we have stored context for different restaurant, warn but allow
        if (storedContext && storedContext.restaurantSlug !== urlContext.slug) {
          console.warn(`[PWAGuard] Restaurant mismatch: stored ${storedContext.restaurantSlug}, URL ${urlContext.slug}`);
        }
        
        // Valid URL context
        setState({ status: 'valid' });
        touchPWAContext();
        return;
      }
      
      // Case 2: URL has only slug (from params)
      if (params.slug) {
        // We have a slug but need to verify function
        setState({ status: 'valid' });
        return;
      }
      
      // Case 3: No URL context, try to restore from storage
      if (storedContext) {
        // Validate stored function matches expected
        if (storedContext.function !== expectedFunction) {
          console.error(`[PWAGuard] Stored function mismatch: expected ${expectedFunction}, got ${storedContext.function}`);
          setState({
            status: 'error',
            message: 'Este dispositivo está configurado para outro aplicativo',
          });
          return;
        }
        
        // Redirect to the correct URL
        const targetUrl = buildPWAUrl(storedContext);
        console.log(`[PWAGuard] Restoring context, redirecting to: ${targetUrl}`);
        setState({ status: 'restoring', targetUrl });
        navigate(targetUrl, { replace: true });
        return;
      }
      
      // Case 4: No context at all - error
      setState({
        status: 'error',
        message: 'Nenhum restaurante configurado. Acesse através do link correto.',
      });
    };

    validateContext();
  }, [location.pathname, params.slug, expectedFunction, navigate]);

  // Touch context periodically
  useEffect(() => {
    if (state.status === 'valid') {
      const interval = setInterval(() => touchPWAContext(), 60000);
      return () => clearInterval(interval);
    }
  }, [state.status]);

  if (state.status === 'loading' || state.status === 'restoring') {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
          <p className="text-xl text-foreground">
            {state.status === 'restoring' ? 'Restaurando sessão...' : 'Carregando...'}
          </p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground mb-4">{state.message}</p>
          <p className="text-sm text-muted-foreground">
            Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
