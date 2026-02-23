import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import type { GoogleDriveTokens } from '../types';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = `${window.location.origin}/backup/google-callback`;
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.file';

export function useGoogleDriveAuth() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const initiateAuth = useCallback((type: 'company' | 'saas') => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error('Google Client ID não configurado. Configure VITE_GOOGLE_CLIENT_ID.');
      return;
    }

    const state = JSON.stringify({ type, timestamp: Date.now() });
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GOOGLE_SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', btoa(state));

    window.location.href = authUrl.toString();
  }, []);

  const exchangeCodeForTokens = useCallback(async (code: string): Promise<GoogleDriveTokens | null> => {
    setIsAuthenticating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-auth', {
        body: { code, redirectUri: GOOGLE_REDIRECT_URI },
      });

      if (error) throw error;
      
      toast.success('Google Drive conectado com sucesso!');
      return data.tokens;
    } catch (error: any) {
      toast.error(`Erro ao conectar Google Drive: ${error.message}`);
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const refreshTokens = useCallback(async (tokens: GoogleDriveTokens): Promise<GoogleDriveTokens | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-refresh', {
        body: { refreshToken: tokens.refresh_token },
      });

      if (error) throw error;
      return data.tokens;
    } catch (error) {
      console.error('Failed to refresh Google Drive tokens:', error);
      return null;
    }
  }, []);

  const disconnectDrive = useCallback(async () => {
    // Just clear tokens - actual revocation is optional
    toast.success('Google Drive desconectado!');
  }, []);

  return {
    isAuthenticating,
    initiateAuth,
    exchangeCodeForTokens,
    refreshTokens,
    disconnectDrive,
    isConfigured: !!GOOGLE_CLIENT_ID,
  };
}
