import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-shim';

interface UseTTSOptions {
  provider?: 'openai' | 'elevenlabs';
  voice?: string;
  onError?: (error: Error) => void;
}

interface TTSResult {
  audioBase64: string;
  mimeType: string;
  provider: string;
  fallback_used?: boolean;
}

export function useTTS(options: UseTTSOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const generateAndPlay = useCallback(async (text: string): Promise<boolean> => {
    if (!text || text.trim().length === 0) {
      setError('Texto vazio');
      return false;
    }

    stopAudio();
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke<TTSResult>('ai-tts', {
        body: {
          text: text.trim(),
          voice: options.voice,
          provider: options.provider,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data || !data.audioBase64) {
        // Fallback to text-only (no audio available)
        console.warn('[TTS] No audio returned, text-only fallback');
        setError('Áudio não disponível');
        return false;
      }

      // Create audio element and play
      const audioUrl = `data:${data.mimeType};base64,${data.audioBase64}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setError('Erro ao reproduzir áudio');
        setIsPlaying(false);
        audioRef.current = null;
      };

      await audio.play();

      if (data.fallback_used) {
        console.log('[TTS] Fallback provider was used:', data.provider);
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar áudio';
      console.error('[TTS] Error:', message);
      setError(message);
      options.onError?.(err instanceof Error ? err : new Error(message));
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [options.voice, options.provider, options.onError, stopAudio]);

  const generateAudioUrl = useCallback(async (text: string): Promise<string | null> => {
    if (!text || text.trim().length === 0) {
      return null;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke<TTSResult>('ai-tts', {
        body: {
          text: text.trim(),
          voice: options.voice,
          provider: options.provider,
        },
      });

      if (invokeError || !data?.audioBase64) {
        return null;
      }

      return `data:${data.mimeType};base64,${data.audioBase64}`;
    } catch {
      return null;
    }
  }, [options.voice, options.provider]);

  return {
    generateAndPlay,
    generateAudioUrl,
    stopAudio,
    isGenerating,
    isPlaying,
    error,
  };
}
