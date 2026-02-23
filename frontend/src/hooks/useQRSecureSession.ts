import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-shim';

// Session storage keys
const QR_SESSION_TOKEN_KEY = 'qr_secure_session_token';
const QR_DEVICE_FINGERPRINT_KEY = 'qr_device_fingerprint';
const QR_SESSION_DATA_KEY = 'qr_session_data';

// Inactivity timeout (60 seconds)
const INACTIVITY_TIMEOUT_MS = 60 * 1000;
// Activity refresh interval (every 30 seconds)
const ACTIVITY_REFRESH_INTERVAL_MS = 30 * 1000;

export type QRSessionType = 'table' | 'comanda';

export interface QRSessionData {
  sessionToken: string;
  companyId: string;
  companyName: string;
  qrType: QRSessionType;
  tableId?: string;
  comandaId?: string;
  expiresAt: string;
  validatedAt: string;
}

export interface QRSecureSessionState {
  isLoading: boolean;
  isValidating: boolean;
  isAuthenticated: boolean;
  session: QRSessionData | null;
  error: string | null;
  errorCode: string | null;
}

/**
 * Generate a unique device fingerprint
 */
function generateDeviceFingerprint(): string {
  // Check if we already have one stored
  const existing = localStorage.getItem(QR_DEVICE_FINGERPRINT_KEY);
  if (existing) return existing;

  // Generate new fingerprint based on device characteristics
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.maxTouchPoints || 0,
  ];

  // Create hash
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Add random component for uniqueness
  const random = Math.random().toString(36).substring(2, 15);
  const fingerprint = `${Math.abs(hash).toString(36)}-${random}-${Date.now().toString(36)}`;

  localStorage.setItem(QR_DEVICE_FINGERPRINT_KEY, fingerprint);
  return fingerprint;
}

/**
 * Hook for managing QR secure sessions with geolocation validation and auto-logout
 */
export function useQRSecureSession() {
  const [state, setState] = useState<QRSecureSessionState>({
    isLoading: true,
    isValidating: false,
    isAuthenticated: false,
    session: null,
    error: null,
    errorCode: null,
  });

  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deviceFingerprint = useRef<string>(generateDeviceFingerprint());

  /**
   * Clear session and redirect to scan screen
   */
  const clearSession = useCallback((reason: string = 'manual_logout') => {
    // Call logout endpoint
    const sessionToken = localStorage.getItem(QR_SESSION_TOKEN_KEY);
    if (sessionToken) {
      supabase.functions.invoke('qr-secure-session', {
        body: {
          action: 'logout',
          sessionToken,
          reason,
        },
        headers: {
          'x-device-fingerprint': deviceFingerprint.current,
          'x-qr-session-token': sessionToken,
        },
      }).catch(console.error);
    }

    // Clear local storage
    localStorage.removeItem(QR_SESSION_TOKEN_KEY);
    localStorage.removeItem(QR_SESSION_DATA_KEY);

    // Clear timers
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);

    setState({
      isLoading: false,
      isValidating: false,
      isAuthenticated: false,
      session: null,
      error: null,
      errorCode: null,
    });
  }, []);

  /**
   * Reset inactivity timer
   */
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      console.log('[QR Session] Inactivity timeout - logging out');
      clearSession('inactivity');
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearSession]);

  /**
   * Record user activity (call this on any user interaction)
   */
  const recordActivity = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  /**
   * Validate existing session
   */
  const validateSession = useCallback(async (): Promise<boolean> => {
    const sessionToken = localStorage.getItem(QR_SESSION_TOKEN_KEY);
    if (!sessionToken) return false;

    setState(prev => ({ ...prev, isValidating: true }));

    try {
      const { data, error } = await supabase.functions.invoke('qr-secure-session', {
        body: {
          action: 'validate',
          sessionToken,
        },
        headers: {
          'x-device-fingerprint': deviceFingerprint.current,
          'x-qr-session-token': sessionToken,
        },
      });

      if (error) throw error;

      if (data.valid) {
        const sessionData = JSON.parse(localStorage.getItem(QR_SESSION_DATA_KEY) || '{}');
        setState({
          isLoading: false,
          isValidating: false,
          isAuthenticated: true,
          session: sessionData,
          error: null,
          errorCode: null,
        });
        resetInactivityTimer();
        return true;
      } else {
        // Session invalid - clear and return false
        let errorMessage = 'Sessão inválida';
        if (data.error === 'session_expired') {
          errorMessage = 'Sessão expirada. Escaneie o QR Code novamente.';
        } else if (data.error === 'inactivity_timeout') {
          errorMessage = 'Sessão expirada por inatividade. Escaneie o QR Code novamente.';
        } else if (data.error === 'device_mismatch') {
          errorMessage = 'Dispositivo não reconhecido. Escaneie o QR Code novamente.';
        }

        clearSession(data.error);
        setState(prev => ({
          ...prev,
          error: errorMessage,
          errorCode: data.error,
        }));
        return false;
      }
    } catch (e) {
      console.error('[QR Session] Validation error:', e);
      setState(prev => ({
        ...prev,
        isValidating: false,
        error: 'Erro ao validar sessão',
      }));
      return false;
    }
  }, [clearSession, resetInactivityTimer]);

  /**
   * Authenticate with QR code data and GPS location
   */
  const authenticateWithQR = useCallback(async (params: {
    slug: string;
    qrType: QRSessionType;
    tableId?: string;
    comandaId?: string;
    userLatitude: number;
    userLongitude: number;
  }): Promise<{ success: boolean; error?: string; errorCode?: string }> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, errorCode: null }));

    try {
      const { data, error } = await supabase.functions.invoke('qr-secure-session', {
        body: {
          action: 'validate_location',
          ...params,
          deviceFingerprint: deviceFingerprint.current,
        },
        headers: {
          'x-device-fingerprint': deviceFingerprint.current,
        },
      });

      if (error) throw error;

      if (data.error) {
        setState({
          isLoading: false,
          isValidating: false,
          isAuthenticated: false,
          session: null,
          error: data.message || data.error,
          errorCode: data.code || 'unknown',
        });
        return { success: false, error: data.message || data.error, errorCode: data.code };
      }

      // Save session
      const sessionData: QRSessionData = {
        sessionToken: data.sessionToken,
        companyId: data.companyId,
        companyName: data.companyName,
        qrType: params.qrType,
        tableId: params.tableId,
        comandaId: params.comandaId,
        expiresAt: data.expiresAt,
        validatedAt: new Date().toISOString(),
      };

      localStorage.setItem(QR_SESSION_TOKEN_KEY, data.sessionToken);
      localStorage.setItem(QR_SESSION_DATA_KEY, JSON.stringify(sessionData));

      setState({
        isLoading: false,
        isValidating: false,
        isAuthenticated: true,
        session: sessionData,
        error: null,
        errorCode: null,
      });

      resetInactivityTimer();
      return { success: true };
    } catch (e) {
      console.error('[QR Session] Authentication error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
      setState({
        isLoading: false,
        isValidating: false,
        isAuthenticated: false,
        session: null,
        error: errorMessage,
        errorCode: 'auth_error',
      });
      return { success: false, error: errorMessage, errorCode: 'auth_error' };
    }
  }, [resetInactivityTimer]);

  /**
   * Refresh activity on server
   */
  const refreshActivity = useCallback(async () => {
    const sessionToken = localStorage.getItem(QR_SESSION_TOKEN_KEY);
    if (!sessionToken) return;

    try {
      const { data, error } = await supabase.functions.invoke('qr-secure-session', {
        body: {
          action: 'refresh_activity',
          sessionToken,
        },
        headers: {
          'x-device-fingerprint': deviceFingerprint.current,
          'x-qr-session-token': sessionToken,
        },
      });

      if (error) throw error;

      if (!data.valid) {
        // Session became invalid
        clearSession(data.error || 'invalid');
      }
    } catch (e) {
      console.error('[QR Session] Refresh error:', e);
    }
  }, [clearSession]);

  // Initialize: check for existing session
  useEffect(() => {
    const init = async () => {
      const sessionToken = localStorage.getItem(QR_SESSION_TOKEN_KEY);
      if (sessionToken) {
        await validateSession();
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    init();
  }, [validateSession]);

  // Set up activity refresh interval when authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      refreshIntervalRef.current = setInterval(refreshActivity, ACTIVITY_REFRESH_INTERVAL_MS);
      resetInactivityTimer();

      return () => {
        if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      };
    }
  }, [state.isAuthenticated, refreshActivity, resetInactivityTimer]);

  // Track user activity globally
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const handleActivity = () => recordActivity();

    // Listen for various user interactions
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('mousemove', handleActivity);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
    };
  }, [state.isAuthenticated, recordActivity]);

  return {
    ...state,
    authenticateWithQR,
    validateSession,
    clearSession,
    recordActivity,
    deviceFingerprint: deviceFingerprint.current,
  };
}

/**
 * Hook for requesting GPS location
 */
export function useGeolocation() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const requestLocation = useCallback((): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError('Geolocalização não suportada neste dispositivo');
        resolve(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(coords);
          setIsLoading(false);
          setPermissionDenied(false);
          resolve(coords);
        },
        (error) => {
          setIsLoading(false);
          let errorMessage = 'Erro ao obter localização';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permissão de localização negada. Para acessar a mesa/comanda, você precisa permitir o acesso à sua localização.';
              setPermissionDenied(true);
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Localização indisponível. Verifique se o GPS está ativado.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tempo esgotado ao obter localização. Tente novamente.';
              break;
          }

          setError(errorMessage);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  }, []);

  return {
    location,
    error,
    isLoading,
    permissionDenied,
    requestLocation,
  };
}
