import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Users } from 'lucide-react';

interface TableCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (peopleCount: number) => Promise<void>;
  isPending?: boolean;
  tableNumber?: number;
  totalAmount?: number;
}

export function TableCloseDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  tableNumber,
  totalAmount = 0,
}: TableCloseDialogProps) {
  const [peopleCount, setPeopleCount] = useState('1');

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const handleConfirm = async () => {
    const count = parseInt(peopleCount) || 1;
    await onConfirm(count);
    setPeopleCount('1');
    onOpenChange(false);
  };

  const ticketMedio = totalAmount > 0 && parseInt(peopleCount) > 0
    ? totalAmount / parseInt(peopleCount)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Fechar Mesa {tableNumber}
          </DialogTitle>
          <DialogDescription>
            Informe a quantidade de pessoas para calcular o ticket médio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="peopleCount">Quantidade de Pessoas</Label>
            <Input
              id="peopleCount"
              type="number"
              min="1"
              placeholder="Ex: 4"
              value={peopleCount}
              onChange={(e) => setPeopleCount(e.target.value)}
              autoFocus
            />
          </div>

          {totalAmount > 0 && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total da Mesa:</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pessoas:</span>
                <span className="font-medium">{parseInt(peopleCount) || 1}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">Ticket Médio:</span>
                <span className="font-bold text-primary">{formatCurrency(ticketMedio)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isPending || !peopleCount || parseInt(peopleCount) < 1}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
