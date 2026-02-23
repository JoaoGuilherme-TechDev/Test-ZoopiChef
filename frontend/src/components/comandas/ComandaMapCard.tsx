import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Tag,
  Clock, 
  Receipt, 
  AlertCircle,
  Users,
  Percent
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Comanda, type ComandaStatus } from '@/hooks/useComandas';

interface ComandaMapCardProps {
  comanda: Comanda;
  onClick?: () => void;
  onRequestBill?: () => void;
}

const statusConfig: Record<ComandaStatus, { 
  gradient: string;
  borderColor: string;
  iconBg: string;
  label: string;
  labelColor: string;
}> = {
  free: {
    gradient: 'from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30',
    borderColor: 'border-green-400 dark:border-green-600',
    iconBg: 'bg-green-500',
    label: 'Livre',
    labelColor: 'text-green-700 dark:text-green-400',
  },
  open: {
    gradient: 'from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30',
    borderColor: 'border-blue-400 dark:border-blue-600',
    iconBg: 'bg-blue-500',
    label: 'Em consumo',
    labelColor: 'text-blue-700 dark:text-blue-400',
  },
  no_activity: {
    gradient: 'from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/30',
    borderColor: 'border-yellow-400 dark:border-yellow-600',
    iconBg: 'bg-yellow-500',
    label: 'Sem consumo',
    labelColor: 'text-yellow-700 dark:text-yellow-400',
  },
  requested_bill: {
    gradient: 'from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30',
    borderColor: 'border-red-400 dark:border-red-600',
    iconBg: 'bg-red-500',
    label: 'Conta',
    labelColor: 'text-red-700 dark:text-red-400',
  },
  closed: {
    gradient: 'from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/30',
    borderColor: 'border-gray-400 dark:border-gray-600',
    iconBg: 'bg-gray-500',
    label: 'Fechada',
    labelColor: 'text-gray-700 dark:text-gray-400',
  },
};

export function ComandaMapCard({ 
  comanda,
  onClick,
  onRequestBill
}: ComandaMapCardProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Determine visual status
  const hasConsumption = Number(comanda.total_amount) > 0;
  
  let visualStatus: ComandaStatus = comanda.status;
  if (comanda.status === 'open' && !hasConsumption) {
    visualStatus = 'no_activity';
  }

  // Check for attention states
  useEffect(() => {
    if (visualStatus === 'no_activity' || visualStatus === 'requested_bill') {
      setIsBlinking(true);
    } else {
      setIsBlinking(false);
    }
  }, [visualStatus]);

  // Real-time timer for elapsed time (HH:MM:SS format)
  useEffect(() => {
    if (comanda.status === 'free' || !hasConsumption) {
      setElapsedTime('');
      return;
    }

    const updateTime = () => {
      const opened = new Date(comanda.opened_at).getTime();
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
  }, [comanda.status, comanda.opened_at, hasConsumption]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const config = statusConfig[visualStatus];

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-xl hover:scale-105 border-2 relative overflow-hidden',
        config.borderColor
      )}
      onClick={onClick}
    >
      {/* Background Gradient */}
      <div className={cn('absolute inset-0 bg-gradient-to-br', config.gradient)} />
      
      <CardContent className="p-4 relative">
        {/* Comanda Icon with Number */}
        <div className="flex flex-col items-center mb-3">
          <div className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center shadow-lg mb-2',
            config.iconBg,
            isBlinking && "animate-[pulse_1s_ease-in-out_infinite]"
          )}>
            <span className="text-white font-bold text-xl">
              {comanda.command_number}
            </span>
          </div>
          
          {/* Comanda Visual (like table but with tag icon) */}
          <div className="relative">
            <div className="w-20 h-12 rounded-lg shadow-md flex items-center justify-center bg-amber-700 dark:bg-amber-800">
              <Tag className="h-5 w-5 text-amber-200" />
            </div>
            {/* Base/Legs */}
            <div className="absolute -bottom-1 left-2 w-2 h-2 rounded-sm bg-amber-900" />
            <div className="absolute -bottom-1 right-2 w-2 h-2 rounded-sm bg-amber-900" />
          </div>
        </div>

        {/* Comanda Name */}
        {comanda.name && (
          <p className="text-xs text-center text-muted-foreground truncate mb-2">
            {comanda.name}
          </p>
        )}

        {/* Status Badge */}
        <div className="flex justify-center mb-2">
          <Badge 
            variant="outline"
            className={cn('text-xs font-medium', config.labelColor)}
          >
            {visualStatus === 'free' && <Users className="h-3 w-3 mr-1" />}
            {visualStatus === 'open' && <Users className="h-3 w-3 mr-1" />}
            {visualStatus === 'no_activity' && <AlertCircle className="h-3 w-3 mr-1" />}
            {visualStatus === 'requested_bill' && <Receipt className="h-3 w-3 mr-1" />}
            {config.label}
          </Badge>
        </div>

        {/* Consumption Info (only show if has consumption) */}
        {hasConsumption && comanda.status !== 'free' && (
          <div className="space-y-1 text-center">
            {elapsedTime && (
              <div className="flex items-center justify-center gap-1 text-xs font-mono text-muted-foreground">
                <Clock className="h-3 w-3" />
                {elapsedTime}
              </div>
            )}
            <p className="font-bold text-lg text-primary">
              {formatCurrency(Number(comanda.total_amount))}
            </p>
            {comanda.apply_service_fee && (
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Percent className="h-3 w-3" />
                {comanda.service_fee_percent}%
              </div>
            )}
          </div>
        )}

        {/* Call to action for free comandas */}
        {comanda.status === 'free' && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Toque para abrir
          </p>
        )}

        {/* Request Bill Button (only when has consumption and not already requested) */}
        {hasConsumption && visualStatus !== 'requested_bill' && onRequestBill && (
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
