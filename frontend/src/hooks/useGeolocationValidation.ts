import { useState, useEffect, useCallback } from 'react';

interface GeolocationValidationResult {
  isValidating: boolean;
  isWithinRange: boolean | null;
  error: string | null;
  distance: number | null;
  userLocation: { latitude: number; longitude: number } | null;
  validate: () => Promise<boolean>;
}

// Haversine formula to calculate distance between two points in km
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeolocationValidation(
  targetLatitude: number | null,
  targetLongitude: number | null,
  maxDistanceKm: number = 0.3 // 300 meters default
): GeolocationValidationResult {
  const [isValidating, setIsValidating] = useState(false);
  const [isWithinRange, setIsWithinRange] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const validate = useCallback(async (): Promise<boolean> => {
    // If no target location configured, skip validation
    if (!targetLatitude || !targetLongitude) {
      setIsWithinRange(true);
      return true;
    }

    if (!navigator.geolocation) {
      setError('Geolocalização não suportada pelo navegador');
      setIsWithinRange(false);
      return false;
    }

    setIsValidating(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });

          const dist = calculateDistance(
            latitude,
            longitude,
            targetLatitude,
            targetLongitude
          );
          setDistance(dist);

          const within = dist <= maxDistanceKm;
          setIsWithinRange(within);
          setIsValidating(false);

          if (!within) {
            setError(`Você está a ${(dist * 1000).toFixed(0)}m do estabelecimento. Aproxime-se para continuar.`);
          }

          resolve(within);
        },
        (err) => {
          setIsValidating(false);
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setError('Permissão de localização negada. Ative a localização para usar o QR Code.');
              break;
            case err.POSITION_UNAVAILABLE:
              setError('Localização indisponível. Verifique o GPS.');
              break;
            case err.TIMEOUT:
              setError('Tempo esgotado ao obter localização.');
              break;
            default:
              setError('Erro ao obter localização.');
          }
          
          setIsWithinRange(false);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  }, [targetLatitude, targetLongitude, maxDistanceKm]);

  // Auto-validate on mount if target is set
  useEffect(() => {
    if (targetLatitude && targetLongitude && isWithinRange === null) {
      validate();
    }
  }, [targetLatitude, targetLongitude, validate, isWithinRange]);

  return {
    isValidating,
    isWithinRange,
    error,
    distance,
    userLocation,
    validate,
  };
}
