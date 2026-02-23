import { useEffect, useRef, useCallback } from 'react';
import type { SoundType } from './useTVDisplaySettings';

// Storage key for tracking played orders (per session)
const PLAYED_ORDERS_KEY = 'tv_order_ready_played';

// Sound generator functions for each preset type
const createChimeSound = (audioContext: AudioContext, volume: number) => {
  return () => {
    const now = audioContext.currentTime;
    const playChime = (startTime: number) => {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const noteStart = startTime + index * 0.15;
        const noteDuration = 0.4;
        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(volume * 0.4, noteStart + 0.05);
        gain.gain.setValueAtTime(volume * 0.4, noteStart + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, noteStart + noteDuration);
        osc.start(noteStart);
        osc.stop(noteStart + noteDuration);
      });
    };
    playChime(now);
    playChime(now + 0.8);
  };
};

const createBellSound = (audioContext: AudioContext, volume: number) => {
  return () => {
    const now = audioContext.currentTime;
    // Bell sound - rich overtones
    const fundamentalFreq = 440;
    const harmonics = [1, 2.4, 3, 4.5, 5.8]; // Bell-like harmonic series
    
    harmonics.forEach((harmonic, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = fundamentalFreq * harmonic;
      osc.type = 'sine';
      const amplitude = volume * 0.3 / (i + 1);
      gain.gain.setValueAtTime(amplitude, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
      osc.start(now);
      osc.stop(now + 2);
    });
  };
};

const createDingSound = (audioContext: AudioContext, volume: number) => {
  return () => {
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = 880; // A5
    osc.type = 'sine';
    gain.gain.setValueAtTime(volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  };
};

const createNotificationSound = (audioContext: AudioContext, volume: number) => {
  return () => {
    const now = audioContext.currentTime;
    // Modern notification - two-tone
    const tones = [
      { freq: 587.33, start: 0, duration: 0.15 },     // D5
      { freq: 880, start: 0.15, duration: 0.25 },     // A5
    ];
    
    tones.forEach(({ freq, start, duration }) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const noteStart = now + start;
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(volume * 0.4, noteStart + 0.02);
      gain.gain.setValueAtTime(volume * 0.4, noteStart + duration * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + duration);
      osc.start(noteStart);
      osc.stop(noteStart + duration);
    });
  };
};

// Get played order IDs from sessionStorage
const getPlayedOrders = (): Set<string> => {
  try {
    const stored = sessionStorage.getItem(PLAYED_ORDERS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // ignore parse errors
  }
  return new Set();
};

// Save played order ID to sessionStorage
const markOrderAsPlayed = (orderId: string) => {
  try {
    const played = getPlayedOrders();
    played.add(orderId);
    // Keep only last 100 orders to prevent storage bloat
    const arr = Array.from(played).slice(-100);
    sessionStorage.setItem(PLAYED_ORDERS_KEY, JSON.stringify(arr));
  } catch {
    // ignore storage errors
  }
};

// Check if an order has already played sound
const hasOrderPlayed = (orderId: string): boolean => {
  return getPlayedOrders().has(orderId);
};

export interface UseTVOrderReadySoundOptions {
  enabled: boolean;
  soundType?: SoundType;
  volume?: number;
  customSoundUrl?: string | null;
  loop?: boolean; // Whether to loop until stopped
}

export function useTVOrderReadySound({ 
  enabled, 
  soundType = 'chime', 
  volume = 0.7,
  customSoundUrl = null,
  loop = false,
}: UseTVOrderReadySoundOptions) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);
  const isUnlockedRef = useRef(false);
  const loopIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLoopingRef = useRef(false);

  // Preload custom audio if provided
  useEffect(() => {
    if (!enabled || soundType !== 'custom' || !customSoundUrl) {
      customAudioRef.current = null;
      return;
    }

    const audio = new Audio(customSoundUrl);
    audio.preload = 'auto';
    audio.volume = volume;
    customAudioRef.current = audio;

    // Preload the audio
    audio.load();

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [enabled, soundType, customSoundUrl, volume]);

  // Initialize and unlock audio context on first user interaction
  useEffect(() => {
    if (!enabled) return;

    const unlock = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        // Also try to unlock custom audio
        if (customAudioRef.current) {
          customAudioRef.current.volume = 0;
          await customAudioRef.current.play().catch(() => {});
          customAudioRef.current.pause();
          customAudioRef.current.currentTime = 0;
          customAudioRef.current.volume = volume;
        }
        isUnlockedRef.current = true;
      } catch {
        console.warn('[TVSound] Failed to unlock audio context');
      }
    };

    // Unlock on any user interaction
    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, unlock, { once: true }));

    return () => {
      events.forEach(event => window.removeEventListener(event, unlock as any));
    };
  }, [enabled, volume]);

  // Play sound for an order (only once per order)
  const playOrderReadySound = useCallback(async (orderId: string) => {
    if (!enabled) return false;
    
    // Check if already played for this order
    if (hasOrderPlayed(orderId)) {
      return false;
    }

    try {
      // Handle custom audio
      if (soundType === 'custom' && customAudioRef.current) {
        customAudioRef.current.volume = volume;
        customAudioRef.current.currentTime = 0;
        await customAudioRef.current.play();
        markOrderAsPlayed(orderId);
        return true;
      }

      // Handle Web Audio API sounds
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Try to resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Get the appropriate sound generator
      let playSound: () => void;
      switch (soundType) {
        case 'bell':
          playSound = createBellSound(audioContextRef.current, volume);
          break;
        case 'ding':
          playSound = createDingSound(audioContextRef.current, volume);
          break;
        case 'notification':
          playSound = createNotificationSound(audioContextRef.current, volume);
          break;
        case 'chime':
        default:
          playSound = createChimeSound(audioContextRef.current, volume);
          break;
      }
      
      // Play the sound
      playSound();
      
      // Mark as played to prevent duplicates
      markOrderAsPlayed(orderId);
      
      return true;
    } catch (error) {
      console.warn('[TVSound] Failed to play order ready sound:', error);
      return false;
    }
  }, [enabled, soundType, volume]);

  // Preview function for settings page
  const previewSound = useCallback(async () => {
    try {
      // Handle custom audio
      if (soundType === 'custom' && customSoundUrl) {
        const audio = new Audio(customSoundUrl);
        audio.volume = volume;
        await audio.play();
        return true;
      }

      // Handle Web Audio API sounds
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      let playSound: () => void;
      switch (soundType) {
        case 'bell':
          playSound = createBellSound(audioContext, volume);
          break;
        case 'ding':
          playSound = createDingSound(audioContext, volume);
          break;
        case 'notification':
          playSound = createNotificationSound(audioContext, volume);
          break;
        case 'chime':
        default:
          playSound = createChimeSound(audioContext, volume);
          break;
      }
      
      playSound();
      return true;
    } catch (error) {
      console.warn('[TVSound] Failed to preview sound:', error);
      return false;
    }
  }, [soundType, volume, customSoundUrl]);

  // Stop looping sound
  const stopLoopingSound = useCallback(() => {
    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
    isLoopingRef.current = false;
    
    // Stop custom audio if playing
    if (customAudioRef.current) {
      customAudioRef.current.pause();
      customAudioRef.current.currentTime = 0;
    }
  }, []);

  // Play sound with optional looping
  const playOrderReadySoundWithLoop = useCallback(async (orderId: string) => {
    // If already looping for this or another order, don't restart
    if (isLoopingRef.current) {
      return false;
    }
    
    const played = await playOrderReadySound(orderId);
    
    if (played && loop) {
      isLoopingRef.current = true;
      
      // Get sound duration based on type for loop interval
      // These intervals should be slightly longer than the sound duration
      const loopInterval = soundType === 'custom' ? 4000 : 
                           soundType === 'bell' ? 3000 : 
                           soundType === 'chime' ? 2000 : 1500;
      
      // Clear any existing interval first
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
      }
      
      loopIntervalRef.current = setInterval(() => {
        // Check if we should stop looping
        if (!isLoopingRef.current) {
          if (loopIntervalRef.current) {
            clearInterval(loopIntervalRef.current);
            loopIntervalRef.current = null;
          }
          return;
        }
        
        try {
          if (soundType === 'custom' && customAudioRef.current) {
            customAudioRef.current.currentTime = 0;
            customAudioRef.current.play().catch(() => {});
          } else if (audioContextRef.current) {
            // Ensure audio context is active
            if (audioContextRef.current.state === 'suspended') {
              audioContextRef.current.resume();
            }
            
            let playSound: () => void;
            switch (soundType) {
              case 'bell':
                playSound = createBellSound(audioContextRef.current, volume);
                break;
              case 'ding':
                playSound = createDingSound(audioContextRef.current, volume);
                break;
              case 'notification':
                playSound = createNotificationSound(audioContextRef.current, volume);
                break;
              case 'chime':
              default:
                playSound = createChimeSound(audioContextRef.current, volume);
                break;
            }
            playSound();
          }
        } catch (err) {
          console.warn('[TVSound] Loop iteration error:', err);
        }
      }, loopInterval);
    }
    
    return played;
  }, [playOrderReadySound, loop, soundType, volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
        loopIntervalRef.current = null;
      }
      isLoopingRef.current = false;
    };
  }, []);

  return {
    playOrderReadySound: loop ? playOrderReadySoundWithLoop : playOrderReadySound,
    stopLoopingSound,
    previewSound,
    isAudioUnlocked: isUnlockedRef.current,
  };
}
