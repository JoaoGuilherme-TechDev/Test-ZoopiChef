import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface OfflineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineAt: Date | null;
  checkConnection: () => Promise<boolean>;
}

/**
 * Hook para monitorar status de conexão e exibir notificações
 */
export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(
    isOnline ? new Date() : null
  );

  // Verificar conexão real fazendo um ping
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Tentar fazer uma requisição pequena para verificar conectividade real
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());

      if (wasOffline) {
        toast.success('Conexão restaurada', {
          description: 'Você está online novamente.',
          duration: 3000,
        });
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);

      toast.warning('Sem conexão', {
        description: 'Você está offline. Algumas funcionalidades podem não funcionar.',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return {
    isOnline,
    wasOffline,
    lastOnlineAt,
    checkConnection,
  };
}

// Componente indicador de status offline movido para arquivo separado
// para evitar problemas com JSX em arquivo de hook
