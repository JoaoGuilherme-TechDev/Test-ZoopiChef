/**
 * KioskShell - Main container for the kiosk experience
 * 
 * Manages:
 * - State machine transitions
 * - Inactivity timeout
 * - Device configuration loading
 * - Fullscreen mode
 * 
 * Supports two modes:
 * 1. deviceToken: Legacy token-based access
 * 2. deviceId + companyId: Slug-based access (new)
 */

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useKioskByToken, useKioskDevice, useKioskSession } from '@/hooks/useKiosk';
import { useKioskState, kioskActions } from '@/stores/kioskStore';
import { usePublicKioskSettings } from '@/hooks/useKioskSettings';
import { AttractScreen } from './screens/AttractScreen';
import { IdentifyScreen } from './screens/IdentifyScreen';
import { MenuScreen } from './screens/MenuScreen';
import { CartScreen } from './screens/CartScreen';
import { DineModeScreen } from './screens/DineModeScreen';
import { PaymentScreen } from './screens/PaymentScreen';
import { SuccessScreen } from './screens/SuccessScreen';
import { KioskComandaScreen } from './screens/KioskComandaScreen';
import { cn } from '@/lib/utils';
import { clearKioskContext } from '@/lib/pwa/kioskPersistence';

interface KioskShellProps {
  /** Legacy: device access token */
  deviceToken?: string;
  /** New: device ID for slug-based access */
  deviceId?: string;
  /** New: company ID for slug-based access */
  companyId?: string;
}

export function KioskShell({ deviceToken, deviceId, companyId }: KioskShellProps) {
  const navigate = useNavigate();
  const { kioskId } = useParams<{ kioskId: string }>();
  const [searchParams] = useSearchParams();
  
  // Determine which mode we're using
  const legacyToken = deviceToken || searchParams.get('token') || kioskId;
  const useSlugMode = !!deviceId && !!companyId;

  const [showExit, setShowExit] = useState(false);
  const exitLongPressTimerRef = useRef<number | null>(null);

  const startExitLongPress = useCallback(() => {
    if (exitLongPressTimerRef.current) return;
    exitLongPressTimerRef.current = window.setTimeout(() => {
      exitLongPressTimerRef.current = null;
      setShowExit(true);
    }, 1500);
  }, []);

  const cancelExitLongPress = useCallback(() => {
    if (exitLongPressTimerRef.current) {
      window.clearTimeout(exitLongPressTimerRef.current);
      exitLongPressTimerRef.current = null;
    }
  }, []);

  const handleActivity = useCallback(() => {
    kioskActions.touchActivity();
  }, []);

  // Load device config - either by token (legacy) or by ID (slug mode)
  const { data: deviceByToken, isLoading: tokenLoading } = useKioskByToken(useSlugMode ? null : legacyToken);
  const { data: deviceById, isLoading: idLoading } = useKioskDevice(useSlugMode ? deviceId : null);
  
  // Use the appropriate device based on mode
  const device = useSlugMode ? deviceById : deviceByToken;
  const deviceLoading = useSlugMode ? idLoading : tokenLoading;

  // Get current state from store
  const currentState = useKioskState((s) => s.state);
  const storeDevice = useKioskState((s) => s.device);

  // Load branding settings - MUST be called before any conditional returns
  const { data: brandingSettings } = usePublicKioskSettings(device?.company_id || companyId || null);

  // Session management - MUST be called before any conditional returns
  const { session, resetSession } = useKioskSession(device?.id || null, device?.company_id || companyId || null);

  const brandingStyles = useMemo(() => {
    if (!brandingSettings?.enabled) return {};
    return {
      '--kiosk-primary': brandingSettings.primary_color,
      '--kiosk-secondary': brandingSettings.secondary_color,
      '--kiosk-background': brandingSettings.background_color,
      '--kiosk-accent': brandingSettings.accent_color,
      '--kiosk-text': brandingSettings.text_color,
      '--kiosk-font': brandingSettings.font_family,
      '--kiosk-radius': brandingSettings.button_radius === 'pill' ? '9999px' : brandingSettings.button_radius === 'square' ? '0px' : '0.5rem',
      backgroundColor: brandingSettings.background_color,
      color: brandingSettings.text_color,
      fontFamily: brandingSettings.font_family,
    } as React.CSSProperties;
  }, [brandingSettings]);

  // Exit functions - MUST be before conditional returns
  const exitFullscreenIfNeeded = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  }, []);

  const handleExitKiosk = useCallback(async () => {
    await exitFullscreenIfNeeded();
    // Clear persisted context when explicitly exiting kiosk mode
    clearKioskContext();
    window.location.href = '/';
  }, [exitFullscreenIfNeeded]);

  const handleCloseExitMenu = useCallback(() => {
    setShowExit(false);
  }, []);

  // Update store when device loads
  useEffect(() => {
    if (device && !storeDevice) {
      kioskActions.setDevice(device);
    }
  }, [device, storeDevice]);

  // Update store when session loads
  useEffect(() => {
    if (session) {
      kioskActions.setSessionId(session.id);
    }
  }, [session]);

  // Inactivity timeout handler
  useEffect(() => {
    if (!device || currentState === 'ATTRACT') return;

    const checkInactivity = () => {
      const idleSeconds = kioskActions.getIdleSeconds();
      const timeoutSeconds = device.idle_timeout_seconds || 60;

      if (idleSeconds >= timeoutSeconds) {
        console.log('[Kiosk] Inactivity timeout, returning to ATTRACT');
        kioskActions.reset();
        resetSession.mutate();
      }
    };

    const interval = setInterval(checkInactivity, 1000);
    return () => clearInterval(interval);
  }, [device, currentState, resetSession]);

  // Attach activity listener
  useEffect(() => {
    const events = ['touchstart', 'mousedown', 'mousemove', 'keydown'];
    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));
    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [handleActivity]);

  // Emergency exit: ESC opens menu (useful on desktops)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowExit(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Request fullscreen on mount
  useEffect(() => {
    const requestFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.log('[Kiosk] Fullscreen not available:', e);
      }
    };
    
    // Only request on user interaction
    const handler = () => {
      requestFullscreen();
      window.removeEventListener('click', handler);
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  // Loading state - ALL HOOKS MUST BE ABOVE THIS LINE
  if (deviceLoading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Carregando...</div>
      </div>
    );
  }

  // Device not found
  if (!device) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-3xl font-bold mb-4">Totem não encontrado</h1>
          <p className="text-lg opacity-70">Verifique a configuração do totem</p>
        </div>
      </div>
    );
  }

  const orientation = device.orientation || 'portrait';
  const isLandscape = orientation === 'landscape';

  // Handle comanda selection
  const handleComandaSelect = (comandaId: string, mode: 'add' | 'pay') => {
    console.log('[Kiosk] Comanda selected:', comandaId, mode);
    kioskActions.setState('MENU');
  };

  // Render current screen based on state
  const renderScreen = () => {
    switch (currentState) {
      case 'ATTRACT':
        return <AttractScreen />;
      case 'IDENTIFY':
        return <IdentifyScreen />;
      case 'COMANDA':
        return (
          <KioskComandaScreen 
            companyId={device.company_id}
            onSelectComanda={handleComandaSelect}
            onBack={() => kioskActions.setState('IDENTIFY')}
          />
        );
      case 'MENU':
        return <MenuScreen />;
      case 'CART':
        return <CartScreen />;
      case 'DINE_MODE':
        return <DineModeScreen />;
      case 'PAYMENT':
        return <PaymentScreen />;
      case 'SUCCESS':
        return <SuccessScreen />;
      default:
        return <AttractScreen />;
    }
  };


  return (
    <div
      className={cn(
        'h-screen w-screen overflow-hidden bg-black text-white',
        'select-none touch-none',
        isLandscape ? 'kiosk-landscape' : 'kiosk-portrait'
      )}
      style={{
        overscrollBehavior: 'none',
        touchAction: 'none',
        ...brandingStyles,
      }}
    >
      {/* Hotspot oculto: pressione e segure (1.5s) para abrir o menu de saída */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 z-50 h-12 w-12 opacity-0"
        onPointerDown={startExitLongPress}
        onPointerUp={cancelExitLongPress}
        onPointerCancel={cancelExitLongPress}
        onPointerLeave={cancelExitLongPress}
      />

      {renderScreen()}

      {showExit ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-[min(520px,92vw)] rounded-xl border border-border bg-background p-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">Sair do Totem</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Para manutenção/retorno ao painel.
            </p>

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleCloseExitMenu}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground"
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={handleExitKiosk}
                className="inline-flex items-center justify-center rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
