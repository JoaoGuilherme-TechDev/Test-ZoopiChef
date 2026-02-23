/**
 * TabletContextRestorer
 * 
 * Handles automatic restoration of tablet context when the PWA is reopened.
 * If a persisted company slug exists and the current route doesn't have one,
 * this component redirects to the correct tablet URL.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadTabletContext, getPersistedCompanySlug } from '@/lib/pwa/tabletPersistence';
import { Loader2 } from 'lucide-react';

interface TabletContextRestorerProps {
  children: React.ReactNode;
}

export function TabletContextRestorer({ children }: TabletContextRestorerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    const restoreContext = () => {
      // Only restore if we're on the base tablet route without a slug
      const isBaseTabletRoute = location.pathname === '/tablet-autoatendimento' || 
                                 location.pathname === '/tablet-autoatendimento/';
      
      if (!isBaseTabletRoute) {
        // We have a slug in the URL, no need to restore
        setIsRestoring(false);
        return;
      }

      // Check for persisted slug
      const persistedSlug = getPersistedCompanySlug();
      
      if (persistedSlug) {
        console.log('[TabletContextRestorer] Restoring context, redirecting to:', persistedSlug);
        navigate(`/${persistedSlug}/autoatendimento`, { replace: true });
      } else {
        // No persisted context, show error or landing
        console.log('[TabletContextRestorer] No persisted context found');
        setIsRestoring(false);
      }
    };

    restoreContext();
  }, [location.pathname, navigate]);

  if (isRestoring && (location.pathname === '/tablet-autoatendimento' || location.pathname === '/tablet-autoatendimento/')) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-xl text-white">Restaurando sessão...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
