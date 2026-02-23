import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag, Clock, Percent } from 'lucide-react';
import { type Comanda, type ComandaStatus } from '@/hooks/useComandas';
import { cn } from '@/lib/utils';

interface ComandaCardProps {
  comanda: Comanda;
  onClick: () => void;
}

const statusConfig: Record<ComandaStatus, { label: string; textColor: string; bgColor: string; iconBg: string }> = {
  free: {
    label: 'Livre',
    textColor: 'text-green-900 dark:text-green-100',
    bgColor: 'bg-green-200 dark:bg-green-800 border-green-400 dark:border-green-600',
    iconBg: 'bg-green-600',
  },
  open: {
    label: 'Em consumo',
    textColor: 'text-blue-900 dark:text-blue-100',
    bgColor: 'bg-blue-200 dark:bg-blue-800 border-blue-400 dark:border-blue-600',
    iconBg: 'bg-blue-600',
  },
  no_activity: {
    label: 'Sem consumo',
    textColor: 'text-amber-900 dark:text-amber-100',
    bgColor: 'bg-amber-200 dark:bg-amber-800 border-amber-400 dark:border-amber-600',
    iconBg: 'bg-amber-600',
  },
  requested_bill: {
    label: 'Pediu conta',
    textColor: 'text-red-900 dark:text-red-100',
    bgColor: 'bg-red-200 dark:bg-red-800 border-red-400 dark:border-red-600',
    iconBg: 'bg-red-600',
  },
  closed: {
    label: 'Fechada',
    textColor: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-500',
    iconBg: 'bg-gray-500',
  },
};

export function ComandaCard({ comanda, onClick }: ComandaCardProps) {
  const [timer, setTimer] = useState('--:--:--');

  // Determine visual status based on actual consumption
  // 'free' comandas are always free, 'open' with no amount shows as 'no_activity'
  const visualStatus = comanda.status === 'free' 
    ? 'free'
    : comanda.status === 'open' && Number(comanda.total_amount) === 0 
      ? 'no_activity' 
      : comanda.status;
  
  const status = statusConfig[visualStatus];
  const balance = Number(comanda.total_amount) - Number(comanda.paid_amount);

  // Only show timer if there's consumption (has amount)
  const hasConsumption = Number(comanda.total_amount) > 0;

  useEffect(() => {
    // Only run timer if there's consumption
    if (!hasConsumption) {
      setTimer('--:--:--');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const opened = new Date(comanda.opened_at);
      const diff = Math.floor((now.getTime() - opened.getTime()) / 1000);

      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      setTimer(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [comanda.opened_at, hasConsumption]);

  // Check if comanda needs attention (no_activity or requested_bill)
  const needsAttention = visualStatus === 'no_activity' || visualStatus === 'requested_bill';

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all hover:shadow-md border-2',
        status.bgColor,
        comanda.status === 'requested_bill' && 'ring-2 ring-red-500'
      )}
    >
      <CardContent className={cn('p-4 flex flex-col items-center gap-2', status.textColor)}>
        {/* Comanda Icon */}
        <div
          className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center shadow-md',
            status.iconBg
          )}
        >
          <Tag className="h-6 w-6 text-white" />
        </div>

        {/* Command Number - only this element blinks when attention needed */}
        <div className={cn(
          "text-2xl font-bold",
          needsAttention && "animate-pulse"
        )}>
          {comanda.command_number}
        </div>

        {/* Name */}
        {comanda.name && (
          <div className="text-sm font-semibold truncate max-w-full opacity-80">
            {comanda.name}
          </div>
        )}

        {/* Timer */}
        <div className="flex items-center gap-1 text-xs opacity-70 font-medium">
          <Clock className="h-3 w-3" />
          {timer}
        </div>

        {/* Total Amount */}
        <div className="text-lg font-bold">
          R$ {Number(comanda.total_amount).toFixed(2)}
        </div>

        {/* Balance if has payments */}
        {Number(comanda.paid_amount) > 0 && (
          <div className="text-xs font-medium opacity-80">
            Saldo: R$ {balance.toFixed(2)}
          </div>
        )}

        {/* Service Fee Badge */}
        {comanda.apply_service_fee && (
          <Badge variant="outline" className="text-xs gap-1 border-current">
            <Percent className="h-3 w-3" />
            {comanda.service_fee_percent}%
          </Badge>
        )}

        {/* Status Badge */}
        <Badge
          className={cn(
            'text-xs font-semibold',
            status.iconBg,
            'text-white border-0'
          )}
        >
          {status.label}
        </Badge>
      </CardContent>
    </Card>
  );
}
