import { useOfflineStatus } from '@/hooks/useOfflineStatus';

/**
 * Componente indicador de status offline
 * Exibe um badge fixo quando o usuário está offline
 */
export function OfflineIndicator() {
  const { isOnline } = useOfflineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-warning text-warning-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
      <div className="w-2 h-2 rounded-full bg-current" />
      <span className="text-sm font-medium">Offline</span>
    </div>
  );
}
