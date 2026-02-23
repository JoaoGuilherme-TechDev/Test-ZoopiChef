import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
}

interface UseDelivererTrackingOptions {
  delivererId: string;
  companyId: string;
  enabled?: boolean;
  intervalMs?: number;
}

export function useDelivererTracking({
  delivererId,
  companyId,
  enabled = true,
  intervalMs = 15000, // 15 seconds default
}: UseDelivererTrackingOptions) {
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get battery level if available
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch(() => {
        // Battery API not available
      });
    }
  }, []);

  // Send location to server
  const sendLocation = useCallback(async (position: GeolocationPosition) => {
    const locationData = {
      deliverer_id: delivererId,
      company_id: companyId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      heading: position.coords.heading,
      altitude: position.coords.altitude,
      battery_level: batteryLevel,
      is_online: true,
      recorded_at: new Date().toISOString(),
    };

    try {
      // Insert into locations table (via edge function to bypass RLS)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deliverer-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: 'update_location',
          deliverer_id: delivererId,
          ...locationData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send location');
      }

      setLastLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        heading: position.coords.heading,
        altitude: position.coords.altitude,
      });
      setError(null);
    } catch (err) {
      console.error('Error sending location:', err);
      setError('Erro ao enviar localização');
    }
  }, [delivererId, companyId, batteryLevel]);

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada');
      toast.error('Seu navegador não suporta geolocalização');
      return;
    }

    if (!enabled || !delivererId || !companyId) return;

    // Request permission and start watching
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendLocation(position);
        setIsTracking(true);
        toast.success('Rastreio GPS ativado');

        // Start interval for periodic updates
        intervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            sendLocation,
            (err) => {
              console.warn('Location update failed:', err);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 5000,
            }
          );
        }, intervalMs);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Permissão de localização negada');
            toast.error('Ative a localização para rastreio');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Localização indisponível');
            toast.error('GPS indisponível');
            break;
          case err.TIMEOUT:
            setError('Tempo esgotado');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [enabled, delivererId, companyId, sendLocation, intervalMs]);

  // Stop tracking
  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsTracking(false);

    // Mark as offline
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deliverer-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: 'set_offline',
          deliverer_id: delivererId,
        }),
      });
    } catch (err) {
      console.error('Error setting offline:', err);
    }
  }, [delivererId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    lastLocation,
    error,
    batteryLevel,
    startTracking,
    stopTracking,
  };
}
