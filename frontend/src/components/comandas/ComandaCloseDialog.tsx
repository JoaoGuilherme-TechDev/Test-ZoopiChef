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
import { Loader2 } from 'lucide-react';

interface ComandaCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (tableNumber: string) => Promise<void>;
  requestTableNumber: boolean;
  isPending?: boolean;
}

export function ComandaCloseDialog({
  open,
  onOpenChange,
  onConfirm,
  requestTableNumber,
  isPending,
}: ComandaCloseDialogProps) {
  const [tableNumber, setTableNumber] = useState('');

  const handleConfirm = async () => {
    await onConfirm(tableNumber);
    setTableNumber('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fechar Comanda</DialogTitle>
          <DialogDescription>
            {requestTableNumber 
              ? 'Informe o número da mesa para finalizar a comanda'
              : 'Confirme o fechamento da comanda'
            }
          </DialogDescription>
        </DialogHeader>

        {requestTableNumber && (
          <div className="space-y-2">
            <Label htmlFor="tableNumber">Número da Mesa</Label>
            <Input
              id="tableNumber"
              placeholder="Ex: 15"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isPending || (requestTableNumber && !tableNumber.trim())}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
