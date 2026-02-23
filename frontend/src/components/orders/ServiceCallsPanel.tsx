import { useEffect, useState } from 'react';
import { Bell, Receipt, Check, X, User, Clock, Hash, Volume2 } from 'lucide-react';
import { useServiceCalls, ServiceCall } from '@/hooks/useServiceCalls';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ServiceCallsPanel() {
  const { calls, pendingCount, acknowledgeCall, completeCall } = useServiceCalls(['pending', 'acknowledged']);
  const [lastCount, setLastCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Tocar som quando nova chamada chegar
  useEffect(() => {
    if (pendingCount > lastCount && soundEnabled) {
      // Tocar som de notificação
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Fallback: beep via Web Audio API
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 800;
          gain.gain.value = 0.3;
          osc.start();
          setTimeout(() => {
            osc.stop();
            ctx.close();
          }, 200);
        });
      } catch (e) {
        console.log('Audio not available');
      }

      // Toast de notificação
      const newCalls = calls.filter(c => c.status === 'pending').slice(0, pendingCount - lastCount);
      newCalls.forEach(call => {
        const location = call.table_number 
          ? `Mesa ${call.table_number}` 
          : call.comanda_number 
            ? `Comanda ${call.comanda_number}` 
            : '';
        
        if (call.call_type === 'waiter') {
          toast.info(`🔔 ${location} - ${call.customer_name} está chamando!`, {
            duration: 10000,
          });
        } else {
          toast.info(`📋 ${location} - ${call.customer_name} pediu a conta!`, {
            duration: 10000,
          });
        }
      });
    }
    setLastCount(pendingCount);
  }, [pendingCount, lastCount, soundEnabled, calls]);

  const handleAcknowledge = async (call: ServiceCall) => {
    try {
      await acknowledgeCall(call.id);
      toast.success('Chamada confirmada');
    } catch (error) {
      toast.error('Erro ao confirmar chamada');
    }
  };

  const handleComplete = async (call: ServiceCall) => {
    try {
      await completeCall(call.id);
      toast.success('Chamada concluída');
    } catch (error) {
      toast.error('Erro ao concluir chamada');
    }
  };

  const pendingCalls = calls.filter(c => c.status === 'pending');
  const acknowledgedCalls = calls.filter(c => c.status === 'acknowledged');

  if (calls.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Chamadas de Serviço
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma chamada pendente
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Chamadas de Serviço
            {pendingCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {pendingCount}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(!soundEnabled && 'text-muted-foreground')}
          >
            <Volume2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="p-4 space-y-3">
            {/* Chamadas pendentes */}
            {pendingCalls.map((call) => (
              <ServiceCallCard
                key={call.id}
                call={call}
                onAcknowledge={() => handleAcknowledge(call)}
                onComplete={() => handleComplete(call)}
              />
            ))}

            {/* Chamadas em atendimento */}
            {acknowledgedCalls.length > 0 && pendingCalls.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <p className="text-xs text-muted-foreground mb-2">Em atendimento</p>
              </div>
            )}
            {acknowledgedCalls.map((call) => (
              <ServiceCallCard
                key={call.id}
                call={call}
                onAcknowledge={() => handleAcknowledge(call)}
                onComplete={() => handleComplete(call)}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface ServiceCallCardProps {
  call: ServiceCall;
  onAcknowledge: () => void;
  onComplete: () => void;
}

function ServiceCallCard({ call, onAcknowledge, onComplete }: ServiceCallCardProps) {
  const isPending = call.status === 'pending';
  const isWaiter = call.call_type === 'waiter';

  const location = call.table_number 
    ? `Mesa ${call.table_number}` 
    : call.comanda_number 
      ? `Comanda ${call.comanda_number}` 
      : 'Local não identificado';

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all',
        isPending 
          ? 'bg-destructive/10 border-destructive/30 animate-pulse' 
          : 'bg-muted/50 border-border'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isWaiter ? (
            <Bell className={cn('h-5 w-5', isPending ? 'text-destructive' : 'text-muted-foreground')} />
          ) : (
            <Receipt className={cn('h-5 w-5', isPending ? 'text-destructive' : 'text-muted-foreground')} />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {isWaiter ? 'Chamar Garçom' : 'Pedir Conta'}
              </span>
              <Badge variant={isPending ? 'destructive' : 'secondary'} className="text-xs">
                {location}
              </Badge>
              {!isWaiter && call.payment_preference && (
                <Badge variant="outline" className="text-xs">
                  {call.payment_preference === 'pix' ? '💠 PIX' : '💳 Outros'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {call.customer_name}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(call.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-1">
          {isPending ? (
            <Button size="sm" variant="default" onClick={onAcknowledge}>
              <Check className="h-3 w-3 mr-1" />
              OK
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onComplete}>
              <Check className="h-3 w-3 mr-1" />
              Concluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
