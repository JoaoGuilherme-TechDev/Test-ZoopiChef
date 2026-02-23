import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-shim';

const GEO_DEVICE_ID_KEY = 'geo_device_id';
const GEO_SESSION_KEY = 'geo_session';

interface GeoSession {
  id: string;
  validatedAt: string;
  expiresAt: string;
  distance: number;
}

interface GeoSecuritySettings {
  enabled: boolean;
  radiusMeters: number;
  sessionDurationMinutes: number;
  establishmentLat: number | null;
  establishmentLng: number | null;
}

interface UseGeoSecurityProps {
  companyId: string | undefined;
  onValidated?: () => void;
  onExpired?: () => void;
}

interface UseGeoSecurityReturn {
  isValidating: boolean;
  isValidSession: boolean;
  error: string | null;
  distance: number | null;
  settings: GeoSecuritySettings | null;
  timeRemaining: number | null; // seconds
  validateLocation: () => Promise<boolean>;
  checkSession: () => Promise<boolean>;
}

// Generate or get device ID
function getDeviceId(): string {
  let deviceId = localStorage.getItem(GEO_DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(GEO_DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// Calculate distance between two coordinates in meters (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeoSecurity({ companyId, onValidated, onExpired }: UseGeoSecurityProps): UseGeoSecurityReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [settings, setSettings] = useState<GeoSecuritySettings | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Fetch geo security settings
  useEffect(() => {
    if (!companyId) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('company_table_settings')
        .select('geo_security_enabled, geo_security_radius_meters, geo_session_duration_minutes, location_latitude, location_longitude')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('[GeoSecurity] Error fetching settings:', error);
        return;
      }

      if (data) {
        setSettings({
          enabled: data.geo_security_enabled || false,
          radiusMeters: data.geo_security_radius_meters || 100,
          sessionDurationMinutes: data.geo_session_duration_minutes || 30,
          establishmentLat: data.location_latitude,
          establishmentLng: data.location_longitude,
        });
      } else {
        // No settings, disable geo security
        setSettings({
          enabled: false,
          radiusMeters: 100,
          sessionDurationMinutes: 30,
          establishmentLat: null,
          establishmentLng: null,
        });
      }
    };

    fetchSettings();
  }, [companyId]);

  // Check for existing valid session
  const checkSession = useCallback(async (): Promise<boolean> => {
    if (!companyId || !settings) return false;
    
    // If geo security is disabled, always valid
    if (!settings.enabled) {
      setIsValidSession(true);
      return true;
    }

    const deviceId = getDeviceId();
    
    // Check local storage first
    const cachedSession = localStorage.getItem(`${GEO_SESSION_KEY}_${companyId}`);
    if (cachedSession) {
      try {
        const session: GeoSession = JSON.parse(cachedSession);
        const expiresAt = new Date(session.expiresAt);
        if (expiresAt > new Date()) {
          setIsValidSession(true);
          setDistance(session.distance);
          setTimeRemaining(Math.floor((expiresAt.getTime() - Date.now()) / 1000));
          return true;
        }
      } catch (e) {
        // Invalid cached session
      }
    }

    // Check database for valid session
    const { data, error } = await supabase
      .from('geo_validated_sessions')
      .select('*')
      .eq('company_id', companyId)
      .eq('device_id', deviceId)
      .gt('expires_at', new Date().toISOString())
      .order('validated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[GeoSecurity] Error checking session:', error);
      return false;
    }

    if (data) {
      const session: GeoSession = {
        id: data.id,
        validatedAt: data.validated_at,
        expiresAt: data.expires_at,
        distance: Number(data.distance_meters) || 0,
      };
      
      localStorage.setItem(`${GEO_SESSION_KEY}_${companyId}`, JSON.stringify(session));
      setIsValidSession(true);
      setDistance(session.distance);
      
      const expiresAt = new Date(session.expiresAt);
      setTimeRemaining(Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      
      return true;
    }

    setIsValidSession(false);
    onExpired?.();
    return false;
  }, [companyId, settings, onExpired]);

  // Validate current location
  const validateLocation = useCallback(async (): Promise<boolean> => {
    if (!companyId || !settings) {
      setError('Configurações não carregadas');
      return false;
    }

    // If geo security is disabled, always valid
    if (!settings.enabled) {
      setIsValidSession(true);
      return true;
    }

    // Check if establishment location is configured
    if (!settings.establishmentLat || !settings.establishmentLng) {
      setError('Localização do estabelecimento não configurada');
      return false;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Request geolocation
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocalização não suportada neste dispositivo'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          resolve,
          (err) => {
            switch (err.code) {
              case err.PERMISSION_DENIED:
                reject(new Error('Permissão de localização negada. Por favor, habilite nas configurações.'));
                break;
              case err.POSITION_UNAVAILABLE:
                reject(new Error('Localização indisponível. Verifique o GPS.'));
                break;
              case err.TIMEOUT:
                reject(new Error('Tempo esgotado ao obter localização.'));
                break;
              default:
                reject(new Error('Erro ao obter localização.'));
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );
      });

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      const distanceToEstablishment = calculateDistance(
        userLat, 
        userLng, 
        settings.establishmentLat, 
        settings.establishmentLng
      );

      setDistance(Math.round(distanceToEstablishment));

      // Check if within allowed radius
      if (distanceToEstablishment > settings.radiusMeters) {
        setError(`Você está a ${Math.round(distanceToEstablishment)}m do estabelecimento. Máximo permitido: ${settings.radiusMeters}m`);
        setIsValidSession(false);
        setIsValidating(false);
        return false;
      }

      // Create validated session
      const deviceId = getDeviceId();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + settings.sessionDurationMinutes);

      const { data: sessionData, error: insertError } = await supabase
        .from('geo_validated_sessions')
        .insert({
          company_id: companyId,
          device_id: deviceId,
          latitude: userLat,
          longitude: userLng,
          distance_meters: distanceToEstablishment,
          expires_at: expiresAt.toISOString(),
          user_agent: navigator.userAgent,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[GeoSecurity] Error creating session:', insertError);
        setError('Erro ao validar sessão');
        setIsValidating(false);
        return false;
      }

      // Save to local storage
      const session: GeoSession = {
        id: sessionData.id,
        validatedAt: sessionData.validated_at,
        expiresAt: sessionData.expires_at,
        distance: Math.round(distanceToEstablishment),
      };
      
      localStorage.setItem(`${GEO_SESSION_KEY}_${companyId}`, JSON.stringify(session));
      
      setIsValidSession(true);
      setTimeRemaining(settings.sessionDurationMinutes * 60);
      setIsValidating(false);
      
      onValidated?.();
      return true;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao validar localização');
      setIsValidating(false);
      return false;
    }
  }, [companyId, settings, onValidated]);

  // Timer to update remaining time
  useEffect(() => {
    if (!isValidSession || timeRemaining === null) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          setIsValidSession(false);
          if (companyId) {
            localStorage.removeItem(`${GEO_SESSION_KEY}_${companyId}`);
          }
          onExpired?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isValidSession, timeRemaining, companyId, onExpired]);

  // Initial session check when settings load
  useEffect(() => {
    if (settings) {
      checkSession();
    }
  }, [settings, checkSession]);

  return {
    isValidating,
    isValidSession,
    error,
    distance,
    settings,
    timeRemaining,
    validateLocation,
    checkSession,
  };
}
