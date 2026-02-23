// Alert Sounds Library - 12 configurable alert sounds
// Each sound is generated programmatically using Web Audio API

export interface AlertSound {
  id: string;
  name: string;
  description: string;
  category: 'order' | 'alert' | 'notification' | 'urgent';
}

export const ALERT_SOUNDS: AlertSound[] = [
  { id: 'phone_ring', name: 'Telefone', description: 'Som clássico de telefone tocando', category: 'order' },
  { id: 'chime', name: 'Sino', description: 'Som suave de sino', category: 'notification' },
  { id: 'digital_beep', name: 'Beep Digital', description: 'Beep eletrônico curto', category: 'notification' },
  { id: 'cash_register', name: 'Caixa Registradora', description: 'Som de dinheiro/venda', category: 'order' },
  { id: 'doorbell', name: 'Campainha', description: 'Som de campainha da porta', category: 'order' },
  { id: 'notification', name: 'Notificação', description: 'Som moderno de notificação', category: 'notification' },
  { id: 'alarm', name: 'Alarme', description: 'Som de alarme urgente', category: 'urgent' },
  { id: 'success', name: 'Sucesso', description: 'Som positivo de conclusão', category: 'notification' },
  { id: 'warning', name: 'Aviso', description: 'Som de atenção moderada', category: 'alert' },
  { id: 'urgent', name: 'Urgente', description: 'Som crítico de alta prioridade', category: 'urgent' },
  { id: 'melody', name: 'Melodia', description: 'Sequência musical agradável', category: 'order' },
  { id: 'xylophone', name: 'Xilofone', description: 'Som de xilofone alegre', category: 'notification' },
];

class AlertSoundPlayer {
  private audioContext: AudioContext | null = null;
  
  private getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  async play(soundId: string, volume: number = 0.5): Promise<void> {
    const ctx = this.getAudioContext();
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;

    switch (soundId) {
      case 'phone_ring':
        this.playPhoneRing(ctx, now, volume);
        break;
      case 'chime':
        this.playChime(ctx, now, volume);
        break;
      case 'digital_beep':
        this.playDigitalBeep(ctx, now, volume);
        break;
      case 'cash_register':
        this.playCashRegister(ctx, now, volume);
        break;
      case 'doorbell':
        this.playDoorbell(ctx, now, volume);
        break;
      case 'notification':
        this.playNotification(ctx, now, volume);
        break;
      case 'alarm':
        this.playAlarm(ctx, now, volume);
        break;
      case 'success':
        this.playSuccess(ctx, now, volume);
        break;
      case 'warning':
        this.playWarning(ctx, now, volume);
        break;
      case 'urgent':
        this.playUrgent(ctx, now, volume);
        break;
      case 'melody':
        this.playMelody(ctx, now, volume);
        break;
      case 'xylophone':
        this.playXylophone(ctx, now, volume);
        break;
      default:
        this.playNotification(ctx, now, volume);
    }
  }

  private createOscillator(
    ctx: AudioContext,
    type: OscillatorType,
    frequency: number,
    startTime: number,
    duration: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = type;
    osc.frequency.value = frequency;
    
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // 1. Phone Ring - Classic telephone ring
  private playPhoneRing(ctx: AudioContext, now: number, volume: number): void {
    const playRing = (startTime: number) => {
      const freq1 = 440;
      const freq2 = 480;
      const ringDuration = 0.8;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = freq1;
      osc1.type = 'sine';
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = freq2;
      osc2.type = 'sine';
      
      const pulseRate = 25;
      for (let i = 0; i < ringDuration * pulseRate; i++) {
        const time = startTime + (i / pulseRate);
        const isOn = i % 2 === 0;
        gain1.gain.setValueAtTime(isOn ? volume * 0.6 : 0, time);
        gain2.gain.setValueAtTime(isOn ? volume * 0.4 : 0, time);
      }
      
      osc1.start(startTime);
      osc1.stop(startTime + ringDuration);
      osc2.start(startTime);
      osc2.stop(startTime + ringDuration);
    };

    playRing(now);
    playRing(now + 1.2);
    playRing(now + 2.4);
  }

  // 2. Chime - Soft bell sound
  private playChime(ctx: AudioContext, now: number, volume: number): void {
    const frequencies = [523, 659, 784]; // C5, E5, G5
    frequencies.forEach((freq, i) => {
      this.createOscillator(ctx, 'sine', freq, now + i * 0.15, 0.8 - i * 0.1, volume * 0.4);
    });
  }

  // 3. Digital Beep - Short electronic beep
  private playDigitalBeep(ctx: AudioContext, now: number, volume: number): void {
    this.createOscillator(ctx, 'square', 800, now, 0.15, volume * 0.3);
    this.createOscillator(ctx, 'square', 800, now + 0.2, 0.15, volume * 0.3);
  }

  // 4. Cash Register - Ka-ching sound
  private playCashRegister(ctx: AudioContext, now: number, volume: number): void {
    // Mechanical click
    this.createOscillator(ctx, 'sawtooth', 100, now, 0.05, volume * 0.5);
    // Bell
    this.createOscillator(ctx, 'sine', 2000, now + 0.1, 0.3, volume * 0.4);
    this.createOscillator(ctx, 'sine', 2500, now + 0.15, 0.25, volume * 0.3);
    this.createOscillator(ctx, 'sine', 3000, now + 0.2, 0.2, volume * 0.2);
  }

  // 5. Doorbell - Ding-dong
  private playDoorbell(ctx: AudioContext, now: number, volume: number): void {
    this.createOscillator(ctx, 'sine', 660, now, 0.5, volume * 0.5); // Ding
    this.createOscillator(ctx, 'sine', 440, now + 0.5, 0.6, volume * 0.5); // Dong
  }

  // 6. Notification - Modern notification sound
  private playNotification(ctx: AudioContext, now: number, volume: number): void {
    this.createOscillator(ctx, 'sine', 880, now, 0.1, volume * 0.4);
    this.createOscillator(ctx, 'sine', 1100, now + 0.1, 0.15, volume * 0.4);
    this.createOscillator(ctx, 'sine', 1320, now + 0.2, 0.2, volume * 0.3);
  }

  // 7. Alarm - Urgent alarm sound
  private playAlarm(ctx: AudioContext, now: number, volume: number): void {
    for (let i = 0; i < 6; i++) {
      const freq = i % 2 === 0 ? 800 : 600;
      this.createOscillator(ctx, 'sawtooth', freq, now + i * 0.25, 0.2, volume * 0.4);
    }
  }

  // 8. Success - Positive completion sound
  private playSuccess(ctx: AudioContext, now: number, volume: number): void {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      this.createOscillator(ctx, 'sine', freq, now + i * 0.12, 0.3, volume * 0.35);
    });
  }

  // 9. Warning - Moderate attention sound
  private playWarning(ctx: AudioContext, now: number, volume: number): void {
    this.createOscillator(ctx, 'triangle', 440, now, 0.3, volume * 0.5);
    this.createOscillator(ctx, 'triangle', 440, now + 0.4, 0.3, volume * 0.5);
    this.createOscillator(ctx, 'triangle', 440, now + 0.8, 0.3, volume * 0.5);
  }

  // 10. Urgent - Critical high priority
  private playUrgent(ctx: AudioContext, now: number, volume: number): void {
    for (let i = 0; i < 4; i++) {
      this.createOscillator(ctx, 'sawtooth', 880, now + i * 0.15, 0.1, volume * 0.5);
      this.createOscillator(ctx, 'sawtooth', 1100, now + i * 0.15 + 0.05, 0.1, volume * 0.5);
    }
  }

  // 11. Melody - Pleasant musical sequence
  private playMelody(ctx: AudioContext, now: number, volume: number): void {
    const melody = [392, 440, 494, 523, 587, 659]; // G4 to E5
    melody.forEach((freq, i) => {
      this.createOscillator(ctx, 'sine', freq, now + i * 0.1, 0.25, volume * 0.35);
    });
  }

  // 12. Xylophone - Cheerful xylophone sound
  private playXylophone(ctx: AudioContext, now: number, volume: number): void {
    const notes = [784, 988, 1175, 1568]; // G5, B5, D6, G6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const startTime = now + i * 0.08;
      gain.gain.setValueAtTime(volume * 0.45, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
      
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }
}

// Singleton instance
export const alertSoundPlayer = new AlertSoundPlayer();

// Helper to get saved sound preference
export function getSavedAlertSound(key: string, defaultValue: string = 'phone_ring'): string {
  return localStorage.getItem(`alertSound_${key}`) || defaultValue;
}

// Helper to save sound preference
export function saveAlertSound(key: string, soundId: string): void {
  localStorage.setItem(`alertSound_${key}`, soundId);
}

// Helper to get volume preference
export function getSavedVolume(key: string, defaultValue: number = 0.5): number {
  const saved = localStorage.getItem(`alertVolume_${key}`);
  return saved ? parseFloat(saved) : defaultValue;
}

// Helper to save volume preference  
export function saveVolume(key: string, volume: number): void {
  localStorage.setItem(`alertVolume_${key}`, String(volume));
}
