import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useGoogleDriveAuth } from '../hooks/useGoogleDriveAuth';
import { useUpsertBackupConfig } from '../hooks/useBackupConfig';
import { useUpsertSaasBackupConfig } from '../hooks/useSaasBackupConfig';

export function GoogleDriveCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  const { exchangeCodeForTokens } = useGoogleDriveAuth();
  const upsertCompanyConfig = useUpsertBackupConfig();
  const upsertSaasConfig = useUpsertSaasBackupConfig();

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const stateParam = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage(error === 'access_denied' ? 'Acesso negado pelo usuário' : error);
        return;
      }

      if (!code || !stateParam) {
        setStatus('error');
        setErrorMessage('Parâmetros inválidos');
        return;
      }

      try {
        const state = JSON.parse(atob(stateParam));
        const tokens = await exchangeCodeForTokens(code);

        if (!tokens) {
          throw new Error('Falha ao obter tokens');
        }

        // Save tokens to the appropriate config
        if (state.type === 'saas') {
          await upsertSaasConfig.mutateAsync({
            google_drive_tokens: tokens,
            save_to_google_drive: true,
          });
        } else {
          await upsertCompanyConfig.mutateAsync({
            google_drive_tokens: tokens,
            save_to_google_drive: true,
          });
        }

        setStatus('success');
        
        // Redirect back to backup settings
        setTimeout(() => {
          if (state.type === 'saas') {
            navigate('/saas/backup');
          } else {
            navigate('/backup');
          }
        }, 2000);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Erro ao conectar Google Drive');
      }
    };

    processCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Conectando ao Google Drive...</h2>
            <p className="text-muted-foreground">Aguarde enquanto processamos a autorização</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
            <h2 className="text-xl font-semibold">Google Drive Conectado!</h2>
            <p className="text-muted-foreground">Redirecionando para as configurações...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-xl font-semibold">Erro na Conexão</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
            <button
              onClick={() => navigate('/backup')}
              className="text-primary hover:underline"
            >
              Voltar para configurações
            </button>
          </>
        )}
      </div>
    </div>
  );
}
