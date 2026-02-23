import { Badge } from '@/components/ui/badge';
import { Clock, Store, AlertCircle } from 'lucide-react';
import { usePublicOnlineStoreStatus } from '@/hooks/useOnlineStoreSettings';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OnlineStoreStatusBadgeProps {
  companyId: string | undefined;
  showNextOpen?: boolean;
  className?: string;
}

export function OnlineStoreStatusBadge({ 
  companyId, 
  showNextOpen = true,
  className = ''
}: OnlineStoreStatusBadgeProps) {
  const { data: status, isLoading } = usePublicOnlineStoreStatus(companyId);

  if (isLoading || !status) {
    return null;
  }

  const formatNextOpen = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(parseISO(dateStr), "EEEE 'às' HH:mm", { locale: ptBR });
    } catch {
      return null;
    }
  };

  if (status.allowed_to_order) {
    return (
      <Badge 
        variant="default" 
        className={`bg-green-500 hover:bg-green-600 ${className}`}
      >
        <Store className="h-3 w-3 mr-1" />
        Aberto
      </Badge>
    );
  }

  const nextOpen = formatNextOpen(status.next_open_at);

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <Badge variant="destructive">
        <AlertCircle className="h-3 w-3 mr-1" />
        Fechado
      </Badge>
      {showNextOpen && nextOpen && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Abre {nextOpen}
        </span>
      )}
    </div>
  );
}

interface OnlineStoreClosedMessageProps {
  companyId: string | undefined;
}

export function OnlineStoreClosedMessage({ companyId }: OnlineStoreClosedMessageProps) {
  const { data: status, isLoading } = usePublicOnlineStoreStatus(companyId);

  if (isLoading || !status || status.allowed_to_order) {
    return null;
  }

  const formatNextOpen = (dateStr: string | null) => {
    if (!dateStr) return 'Horário não disponível';
    try {
      return format(parseISO(dateStr), "EEEE 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'Horário não disponível';
    }
  };

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
      <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
      <h3 className="font-semibold text-destructive">Loja fechada no momento</h3>
      {status.next_open_at && (
        <p className="text-sm text-muted-foreground mt-1">
          Próxima abertura: {formatNextOpen(status.next_open_at)}
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        Você pode navegar pelo cardápio, mas pedidos não serão aceitos.
      </p>
    </div>
  );
}

export function useCanOrder(companyId: string | undefined) {
  const { data: status, isLoading } = usePublicOnlineStoreStatus(companyId);
  
  return {
    canOrder: status?.allowed_to_order ?? true,
    isLoading,
    status,
    etaAdjustMinutes: status?.eta_adjust_minutes ?? 0,
  };
}
