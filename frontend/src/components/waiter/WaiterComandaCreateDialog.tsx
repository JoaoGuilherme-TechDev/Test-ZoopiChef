import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

interface WaiterComandaCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, applyServiceFee: boolean, serviceFeePercent: number) => void;
  isLoading: boolean;
  /** Default service fee percentage - can be passed from parent to avoid context dependency */
  defaultServiceFeePercent?: number;
}

export function WaiterComandaCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  defaultServiceFeePercent = 10,
}: WaiterComandaCreateDialogProps) {
  const [name, setName] = useState('');
  const [applyServiceFee, setApplyServiceFee] = useState(false);
  const serviceFeePercent = defaultServiceFeePercent;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name.trim(), applyServiceFee, serviceFeePercent);
    setName('');
    setApplyServiceFee(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova Comanda</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome (opcional)</Label>
            <Input
              id="name"
              placeholder="Ex: João, Maria..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Identifique o cliente ou deixe em branco
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <Label htmlFor="service-fee">Taxa de serviço ({serviceFeePercent}%)</Label>
              <p className="text-xs text-muted-foreground">Aplicar taxa de serviço</p>
            </div>
            <Switch
              id="service-fee"
              checked={applyServiceFee}
              onCheckedChange={setApplyServiceFee}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Comanda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
