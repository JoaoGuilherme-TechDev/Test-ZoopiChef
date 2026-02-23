/**
 * EntregadorContextRestorer
 * 
 * Handles automatic restoration of entregador context when the PWA is reopened.
 * If a persisted company slug and token exist and the current route doesn't have them,
 * this component redirects to the correct entregador app URL.
 * 
 * CRITICAL: Entregador PWA must NEVER open without restaurant context.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  loadEntregadorContext, 
  getPersistedCompanySlug,
  getPersistedToken,
  hasPersistedEntregadorContext
} from '@/lib/pwa/entregadorPersistence';
import { Loader2 } from 'lucide-react';

interface EntregadorContextRestorerProps {
  children: React.ReactNode;
}

export function EntregadorContextRestorer({ children }: EntregadorContextRestorerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    const restoreContext = () => {
      // Only restore if we're on the base entregador route without a slug
      const isBaseRoute = location.pathname === '/entregador' || 
                          location.pathname === '/entregador/';
      
      if (!isBaseRoute) {
        // We have a slug in the URL, no need to restore
        setIsRestoring(false);
        return;
      }

      // Check for persisted context
      if (hasPersistedEntregadorContext()) {
        const slug = getPersistedCompanySlug();
        const token = getPersistedToken();
        
        if (slug && token) {
          console.log('[EntregadorContextRestorer] Restoring context, redirecting to:', slug);
          navigate(`/entregador/${slug}/app/${token}`, { replace: true });
          return;
        }
      }
      
      // No persisted context - will show the slug entry screen
      console.log('[EntregadorContextRestorer] No persisted context found');
      setIsRestoring(false);
    };

    restoreContext();
  }, [location.pathname, navigate]);

  if (isRestoring && (location.pathname === '/entregador' || location.pathname === '/entregador/')) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-green-950 to-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-xl text-white">Restaurando sessão...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
