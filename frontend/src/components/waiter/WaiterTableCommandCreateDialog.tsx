import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Tag } from 'lucide-react';

interface WaiterTableCommandCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (next: string) => void;
  number: string;
  onNumberChange: (next: string) => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function WaiterTableCommandCreateDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  number,
  onNumberChange,
  onConfirm,
  isLoading,
}: WaiterTableCommandCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Nova comanda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="command-number">Número (opcional)</Label>
              <Input
                id="command-number"
                inputMode="numeric"
                placeholder="Ex: 12"
                value={number}
                onChange={(e) => onNumberChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Se deixar vazio, gera automático</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="command-name">Nome (opcional)</Label>
              <Input
                id="command-name"
                placeholder="Ex: João, Família..."
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Ajuda a identificar a comanda</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={onConfirm} disabled={!!isLoading} className="gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
