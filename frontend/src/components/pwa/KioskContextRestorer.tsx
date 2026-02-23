/**
 * KioskContextRestorer
 * 
 * Handles automatic restoration of kiosk context when the PWA is reopened.
 * If a persisted device token exists and the current route doesn't have one,
 * this component redirects to the correct kiosk URL.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadKioskContext, getPersistedDeviceToken } from '@/lib/pwa/kioskPersistence';
import { Loader2 } from 'lucide-react';

interface KioskContextRestorerProps {
  children: React.ReactNode;
}

export function KioskContextRestorer({ children }: KioskContextRestorerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    const restoreContext = () => {
      // Only restore if we're on the base kiosk route without a token
      const isBaseKioskRoute = location.pathname === '/kiosk' || location.pathname === '/kiosk/';
      
      if (!isBaseKioskRoute) {
        // We have a token in the URL, no need to restore
        setIsRestoring(false);
        return;
      }

      // Check for persisted token
      const persistedToken = getPersistedDeviceToken();
      
      if (persistedToken) {
        console.log('[KioskContextRestorer] Restoring context, redirecting to:', persistedToken);
        navigate(`/kiosk/${persistedToken}`, { replace: true });
      } else {
        // No persisted context, show error or landing
        console.log('[KioskContextRestorer] No persisted context found');
        setIsRestoring(false);
      }
    };

    restoreContext();
  }, [location.pathname, navigate]);

  if (isRestoring && (location.pathname === '/kiosk' || location.pathname === '/kiosk/')) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-xl text-white">Restaurando sessão...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
