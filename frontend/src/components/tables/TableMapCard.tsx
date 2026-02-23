import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  UtensilsCrossed,
  Clock, 
  Receipt, 
  AlertCircle,
  Users,
  Hash,
  CalendarCheck,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table } from '@/hooks/useTables';
import { TableSession } from '@/hooks/useTableSessions';
import { TableReservation } from '@/hooks/useTableReservations';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TableMapCardProps {
  table: Table;
  session?: TableSession | null;
  reservation?: TableReservation | null;
  commandCount?: number;
  idleWarningMinutes?: number;
  onClick?: () => void;
  onRequestBill?: () => void;
  onReservationClick?: () => void;
}

type TableStatus = 'available' | 'occupied' | 'idle_warning' | 'bill_requested' | 'reserved';

const statusConfig: Record<TableStatus, { 
  gradient: string;
  borderColor: string;
  iconBg: string;
  label: string;
  labelColor: string;
}> = {
  available: {
    gradient: 'from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30',
    borderColor: 'border-green-400 dark:border-green-600',
    iconBg: 'bg-green-500',
    label: 'Livre',
    labelColor: 'text-green-700 dark:text-green-400',
  },
  occupied: {
    gradient: 'from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30',
    borderColor: 'border-blue-400 dark:border-blue-600',
    iconBg: 'bg-blue-500',
    label: 'Ocupada',
    labelColor: 'text-blue-700 dark:text-blue-400',
  },
  idle_warning: {
    gradient: 'from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/30',
    borderColor: 'border-yellow-400 dark:border-yellow-600',
    iconBg: 'bg-yellow-500',
    label: 'Sem consumo',
    labelColor: 'text-yellow-700 dark:text-yellow-400',
  },
  bill_requested: {
    gradient: 'from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30',
    borderColor: 'border-red-400 dark:border-red-600',
    iconBg: 'bg-red-500',
    label: 'Conta',
    labelColor: 'text-red-700 dark:text-red-400',
  },
  reserved: {
    gradient: 'from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/40',
    borderColor: 'border-purple-500 dark:border-purple-400',
    iconBg: 'bg-purple-600',
    label: 'Reservada',
    labelColor: 'text-purple-700 dark:text-purple-300',
  },
};

export function TableMapCard({ 
  table, 
  session, 
  reservation,
  commandCount = 0,
  idleWarningMinutes = 30,
  onClick,
  onRequestBill,
  onReservationClick
}: TableMapCardProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Determine status - reserved takes priority if no session
  let status: TableStatus = 'available';
  const hasConsumption = session ? (session.total_amount_cents > 0 || commandCount > 0) : false;

  if (session) {
    // Se a sessão está aberta mas não tem lançamentos/consumo, tratar como livre
    if (session.status === 'open' && !hasConsumption) {
      status = 'available';
    } else if (session.status === 'bill_requested') {
      status = 'bill_requested';
    } else if (session.status === 'idle_warning') {
      status = 'idle_warning';
    } else {
      status = 'occupied';
    }
  } else if (reservation) {
    status = 'reserved';
  }

  // Check for idle warning
  useEffect(() => {
    if (session && session.status === 'open') {
      const lastActivity = new Date(session.last_activity_at).getTime();
      const now = Date.now();
      const minutesIdle = (now - lastActivity) / (1000 * 60);
      
      if (minutesIdle >= idleWarningMinutes) {
        setIsBlinking(true);
      } else {
        setIsBlinking(false);
      }
    } else if (status === 'idle_warning') {
      setIsBlinking(true);
    } else {
      setIsBlinking(false);
    }
  }, [session, idleWarningMinutes, status]);

  // Real-time timer for elapsed time (HH:MM:SS format)
  // Only show timer for sessions with actual consumption (total_amount_cents > 0)
  useEffect(() => {
    if (!session) {
      setElapsedTime('');
      return;
    }

    // Don't show timer for "comanda livre" (no consumption yet)
    if (session.total_amount_cents === 0) {
      setElapsedTime('');
      return;
    }

    const updateTime = () => {
      const opened = new Date(session.opened_at).getTime();
      const now = Date.now();
      const totalSeconds = Math.floor((now - opened) / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      const h = String(hours).padStart(2, '0');
      const m = String(minutes).padStart(2, '0');
      const s = String(seconds).padStart(2, '0');
      
      setElapsedTime(`${h}:${m}:${s}`);
    };

    updateTime();
    intervalRef.current = setInterval(updateTime, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const handleClick = () => {
    if (status === 'reserved' && onReservationClick) {
      onReservationClick();
    } else if (onClick) {
      onClick();
    }
  };

  const config = statusConfig[status];

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-xl hover:scale-105 border-2 relative overflow-hidden',
        config.borderColor,
        status === 'reserved' && 'ring-2 ring-purple-400 ring-offset-2 dark:ring-purple-500'
      )}
      onClick={handleClick}
    >
      {/* Background Gradient */}
      <div className={cn('absolute inset-0 bg-gradient-to-br', config.gradient)} />
      
      {/* Reserved Tag - Top ribbon */}
      {reservation && !session && (
        <div className="absolute top-0 left-0 right-0 bg-purple-600 text-white text-[10px] font-bold py-1 px-2 text-center z-10 flex items-center justify-center gap-1">
          <CalendarCheck className="h-3 w-3" />
          RESERVADA • {reservation.party_size} {reservation.party_size === 1 ? 'LUGAR' : 'LUGARES'}
        </div>
      )}
      
      <CardContent className={cn("p-4 relative", reservation && !session && "pt-8")}>
        {/* Table Icon with Number */}
        <div className="flex flex-col items-center mb-3">
          <div className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center shadow-lg mb-2',
            config.iconBg,
            // Piscar apenas o círculo com número quando atrasado ou idle_warning
            isBlinking && "animate-[pulse_1s_ease-in-out_infinite]"
          )}>
            <span className="text-white font-bold text-xl">
              {table.number}
            </span>
          </div>
          
          {/* Table Visual */}
          <div className="relative">
            <div className={cn(
              "w-20 h-12 rounded-lg shadow-md flex items-center justify-center",
              status === 'reserved' ? 'bg-purple-700 dark:bg-purple-800' : 'bg-amber-700 dark:bg-amber-800'
            )}>
              <UtensilsCrossed className={cn(
                "h-5 w-5",
                status === 'reserved' ? 'text-purple-200' : 'text-amber-200'
              )} />
            </div>
            {/* Table Legs */}
            <div className={cn(
              "absolute -bottom-1 left-2 w-2 h-2 rounded-sm",
              status === 'reserved' ? 'bg-purple-900' : 'bg-amber-900'
            )} />
            <div className={cn(
              "absolute -bottom-1 right-2 w-2 h-2 rounded-sm",
              status === 'reserved' ? 'bg-purple-900' : 'bg-amber-900'
            )} />
          </div>
        </div>

        {/* Table Name */}
        {table.name && (
          <p className="text-xs text-center text-muted-foreground truncate mb-2">
            {table.name}
          </p>
        )}

        {/* Status Badge */}
        <div className="flex justify-center mb-2">
          <Badge 
            variant={status === 'reserved' ? 'default' : 'outline'}
            className={cn(
              'text-xs font-medium',
              status === 'reserved' 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : config.labelColor
            )}
          >
            {status === 'available' && <Users className="h-3 w-3 mr-1" />}
            {status === 'occupied' && <Users className="h-3 w-3 mr-1" />}
            {status === 'idle_warning' && <AlertCircle className="h-3 w-3 mr-1" />}
            {status === 'bill_requested' && <Receipt className="h-3 w-3 mr-1" />}
            {status === 'reserved' && <CalendarCheck className="h-3 w-3 mr-1" />}
            {config.label}
          </Badge>
        </div>

        {/* Session Info (mostrar apenas se houver consumo/lançamentos) */}
        {session && hasConsumption && (
          <div className="space-y-1 text-center">
            {/* Only show timer if there's actual consumption */}
            {elapsedTime && (
              <div className="flex items-center justify-center gap-1 text-xs font-mono text-muted-foreground">
                <Clock className="h-3 w-3" />
                {elapsedTime}
              </div>
            )}
            <p className="font-bold text-lg text-primary">
              {formatCurrency(session.total_amount_cents)}
            </p>
            {commandCount > 0 && (
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                {commandCount} comanda{commandCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Reservation Info */}
        {!session && reservation && (
          <div className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {reservation.reservation_time.slice(0, 5)}
            </div>
            <p className="text-sm font-medium truncate">
              {reservation.customer_name}
            </p>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {reservation.party_size} pessoas
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs mt-1',
                reservation.status === 'confirmed' 
                  ? 'border-green-500 text-green-600' 
                  : 'border-yellow-500 text-yellow-600'
              )}
            >
              {reservation.status === 'confirmed' ? 'Confirmada' : 'Pendente'}
            </Badge>
          </div>
        )}

        {/* Call to action for available tables */}
        {((!session && !reservation) || (session && !hasConsumption && status === 'available')) && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Toque para abrir
          </p>
        )}

        {/* Request Bill Button (somente quando houver consumo) */}
        {session && hasConsumption && status !== 'bill_requested' && onRequestBill && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2 h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onRequestBill();
            }}
          >
            <Receipt className="h-3 w-3 mr-1" />
            Pedir Conta
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
