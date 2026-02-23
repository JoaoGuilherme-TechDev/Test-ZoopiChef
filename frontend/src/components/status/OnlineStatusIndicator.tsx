import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function OnlineStatusIndicator() {
  const { isOnline } = useOnlineStatus();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300',
            isOnline
              ? 'bg-success/20 text-success'
              : 'bg-destructive/20 text-destructive animate-pulse'
          )}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Offline</span>
            </>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {isOnline ? 'Conectado à internet' : 'Sem conexão com a internet'}
      </TooltipContent>
    </Tooltip>
  );
}
