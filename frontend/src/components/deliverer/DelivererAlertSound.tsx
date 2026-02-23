import { useEffect, useRef, useCallback } from 'react';
import { alertSoundPlayer, getSavedAlertSound, getSavedVolume } from '@/lib/alertSounds';

interface DelivererAlertSoundProps {
  ordersCount: number;
  enabled: boolean;
}

export function DelivererAlertSound({ ordersCount, enabled }: DelivererAlertSoundProps) {
  const previousCountRef = useRef<number>(ordersCount);
  const hasPlayedInitialRef = useRef<boolean>(false);

  const playAlert = useCallback(() => {
    if (!enabled) return;
    
    const soundId = getSavedAlertSound('deliverer_new_order', 'phone_ring');
    const volume = getSavedVolume('deliverer_new_order', 0.7);
    
    // Play sound 3 times with intervals
    const playSequence = async () => {
      for (let i = 0; i < 3; i++) {
        await alertSoundPlayer.play(soundId, volume);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    };
    
    playSequence();
  }, [enabled]);

  useEffect(() => {
    // Skip the initial render
    if (!hasPlayedInitialRef.current) {
      hasPlayedInitialRef.current = true;
      previousCountRef.current = ordersCount;
      return;
    }

    // If orders count increased, play alert
    if (ordersCount > previousCountRef.current) {
      console.log('[DelivererAlertSound] New orders detected!', {
        previous: previousCountRef.current,
        current: ordersCount,
      });
      playAlert();
    }

    previousCountRef.current = ordersCount;
  }, [ordersCount, playAlert]);

  // This component doesn't render anything
  return null;
}
