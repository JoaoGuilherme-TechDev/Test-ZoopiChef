import { useEffect, useRef, useCallback } from 'react';

// Som estilo iFood - telefone tocando 3 vezes
const createNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const playRing = (startTime: number) => {
    // Tom principal do telefone (duas frequências alternando)
    const freq1 = 440; // Lá4
    const freq2 = 480; // Próximo tom
    const ringDuration = 0.8;
    
    // Primeiro tom
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.frequency.value = freq1;
    osc1.type = 'sine';
    
    // Segundo tom (overlay para efeito de telefone)
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.frequency.value = freq2;
    osc2.type = 'sine';
    
    // Envelope pulsante (on-off-on-off)
    const pulseRate = 25; // Hz - velocidade do pulso
    for (let i = 0; i < ringDuration * pulseRate; i++) {
      const time = startTime + (i / pulseRate);
      const isOn = i % 2 === 0;
      gain1.gain.setValueAtTime(isOn ? 0.3 : 0, time);
      gain2.gain.setValueAtTime(isOn ? 0.2 : 0, time);
    }
    
    osc1.start(startTime);
    osc1.stop(startTime + ringDuration);
    osc2.start(startTime);
    osc2.stop(startTime + ringDuration);
  };

  const playSound = () => {
    const now = audioContext.currentTime;
    // 3 toques com intervalo
    playRing(now);        // Primeiro toque
    playRing(now + 1.2);  // Segundo toque
    playRing(now + 2.4);  // Terceiro toque
  };

  return { playSound, audioContext };
};

export function useOrderNotification(soundEnabled: boolean = true) {
  const audioRef = useRef<{ playSound: () => void; audioContext: AudioContext } | null>(null);
  const previousOrderCountRef = useRef<number>(0);

  // Unlock audio on first user interaction (required by some browsers)
  useEffect(() => {
    if (!soundEnabled) return;

    const unlock = async () => {
      try {
        if (!audioRef.current) {
          audioRef.current = createNotificationSound();
        }
        if (audioRef.current.audioContext.state === 'suspended') {
          await audioRef.current.audioContext.resume();
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock as any);
  }, [soundEnabled]);

  const playNotificationSound = useCallback(async () => {
    if (!soundEnabled) return;

    try {
      if (!audioRef.current) {
        audioRef.current = createNotificationSound();
      }
      if (audioRef.current.audioContext.state === 'suspended') {
        await audioRef.current.audioContext.resume();
      }
      audioRef.current.playSound();
    } catch {
      // Browser may block autoplay until user interacts
    }
  }, [soundEnabled]);

  const checkNewOrders = useCallback((currentCount: number) => {
    if (previousOrderCountRef.current > 0 && currentCount > previousOrderCountRef.current) {
      playNotificationSound();
    }
    previousOrderCountRef.current = currentCount;
  }, [playNotificationSound]);

  return { playNotificationSound, checkNewOrders };
}
