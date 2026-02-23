import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useActiveRodizioSession, useCloseRodizio } from '@/hooks/useRodizio';
import { UtensilsCrossed, X, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface RodizioSessionBadgeProps {
  tableSessionId: string;
  onActivate?: () => void;
}

export function RodizioSessionBadge({ tableSessionId, onActivate }: RodizioSessionBadgeProps) {
  const { data: rodizioSession, isLoading } = useActiveRodizioSession(tableSessionId);
  const closeRodizio = useCloseRodizio();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const handleClose = async () => {
    if (!rodizioSession?.id) return;
    
    if (confirm('Encerrar rodízio desta mesa?')) {
      await closeRodizio.mutateAsync(rodizioSession.id);
    }
  };

  if (isLoading) {
    return null;
  }

  // Se não há rodízio ativo, mostrar botão para ativar
  if (!rodizioSession) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onActivate}
        className="gap-1"
      >
        <UtensilsCrossed className="h-4 w-4" />
        Rodízio
      </Button>
    );
  }

  // Rodízio ativo
  const rodizioType = rodizioSession.rodizio_types as any;
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge 
          variant="default" 
          className="cursor-pointer gap-1 bg-orange-500 hover:bg-orange-600"
        >
          <UtensilsCrossed className="h-3 w-3" />
          {rodizioType?.name || 'Rodízio'}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-orange-500" />
              {rodizioType?.name}
            </h4>
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {rodizioSession.people_count}
            </Badge>
          </div>
          
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor por pessoa:</span>
              <span>{formatCurrency(rodizioType?.price_cents || 0)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span className="text-primary">{formatCurrency(rodizioSession.total_price_cents)}</span>
            </div>
          </div>
          
          <Button 
            variant="destructive" 
            size="sm" 
            className="w-full"
            onClick={handleClose}
            disabled={closeRodizio.isPending}
          >
            {closeRodizio.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <X className="h-4 w-4 mr-2" />
            )}
            Encerrar Rodízio
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
