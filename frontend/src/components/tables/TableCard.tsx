import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LayoutGrid, 
  Clock, 
  Users, 
  Receipt, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table } from '@/hooks/useTables';
import { TableSession } from '@/hooks/useTableSessions';

interface TableCardProps {
  table: Table;
  session?: TableSession | null;
  idleWarningMinutes?: number;
  onClick?: () => void;
  onRequestBill?: () => void;
}

type TableStatus = 'available' | 'occupied' | 'idle_warning' | 'bill_requested';

const statusConfig: Record<TableStatus, { 
  color: string; 
  bgColor: string; 
  borderColor: string;
  label: string;
  icon: React.ReactNode;
}> = {
  available: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500',
    label: 'Livre',
    icon: <LayoutGrid className="h-4 w-4" />,
  },
  occupied: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    label: 'Ocupada',
    icon: <Users className="h-4 w-4" />,
  },
  idle_warning: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-500',
    label: 'Sem consumo',
    icon: <AlertCircle className="h-4 w-4" />,
  },
  bill_requested: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    label: 'Conta pedida',
    icon: <Receipt className="h-4 w-4" />,
  },
};

export function TableCard({ 
  table, 
  session, 
  idleWarningMinutes = 30,
  onClick,
  onRequestBill
}: TableCardProps) {
  const [isBlinking, setIsBlinking] = useState(false);

  // Determine status
  let status: TableStatus = 'available';
  if (session) {
    if (session.status === 'bill_requested') {
      status = 'bill_requested';
    } else if (session.status === 'idle_warning') {
      status = 'idle_warning';
    } else {
      status = 'occupied';
    }
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

  // Calculate time since opened
  const getElapsedTime = () => {
    if (!session) return null;
    const opened = new Date(session.opened_at).getTime();
    const now = Date.now();
    const minutes = Math.floor((now - opened) / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}min`;
    }
    return `${minutes}min`;
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const config = statusConfig[status];

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-md border-2',
        config.borderColor,
        config.bgColor
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg',
              status === 'available' ? 'bg-green-500 text-white' :
              status === 'occupied' ? 'bg-blue-500 text-white' :
              status === 'idle_warning' ? 'bg-yellow-500 text-white' :
              'bg-red-500 text-white'
            )}>
              <span className={cn(isBlinking && "animate-pulse")}>
                {table.number}
              </span>
            </div>
            {table.name && (
              <span className="text-sm text-muted-foreground">{table.name}</span>
            )}
          </div>
          <Badge 
            variant="outline" 
            className={cn(config.color, 'flex items-center gap-1')}
          >
            {config.icon}
            {config.label}
          </Badge>
        </div>

        {session && (
          <>
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Tempo:
                </span>
                <span className="font-medium">{getElapsedTime()}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Total:</span>
                <span className="font-bold text-lg">
                  {formatCurrency(session.total_amount_cents)}
                </span>
              </div>
            </div>

            {status !== 'bill_requested' && onRequestBill && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestBill();
                }}
              >
                <Receipt className="h-4 w-4 mr-2" />
                Pedir Conta
              </Button>
            )}

            {status === 'bill_requested' && (
              <div className="text-center text-sm text-red-600 font-medium py-2">
                Aguardando fechamento no caixa
              </div>
            )}
          </>
        )}

        {!session && (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <span className="text-sm">Clique para abrir mesa</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
