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
import { Tag, Loader2, Percent } from 'lucide-react';
import { useComandaSettings } from '@/hooks/useComandas';

interface ComandaCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, applyServiceFee: boolean, serviceFeePercent: number) => void;
  isLoading: boolean;
}

export function ComandaCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: ComandaCreateDialogProps) {
  const [name, setName] = useState('');
  const [applyServiceFee, setApplyServiceFee] = useState(false);
  const [serviceFeePercent, setServiceFeePercent] = useState('');
  const { settings } = useComandaSettings();

  const defaultPercent = settings?.default_service_fee_percent ?? 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const percent = applyServiceFee
      ? (parseFloat(serviceFeePercent) || defaultPercent)
      : 0;
    onSubmit(name.trim(), applyServiceFee, percent);
    setName('');
    setApplyServiceFee(false);
    setServiceFeePercent('');
  };

  const handleServiceFeeToggle = (checked: boolean) => {
    setApplyServiceFee(checked);
    if (checked && !serviceFeePercent) {
      setServiceFeePercent(defaultPercent.toString());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Nova Comanda
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome (opcional)</Label>
            <Input
              id="name"
              placeholder="Ex: Pedro, João..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Identificação para facilitar a busca
            </p>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="service-fee" className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Taxa de serviço
                </Label>
                <p className="text-xs text-muted-foreground">
                  Aplicar porcentagem sobre o consumo
                </p>
              </div>
              <Switch
                id="service-fee"
                checked={applyServiceFee}
                onCheckedChange={handleServiceFeeToggle}
              />
            </div>

            {applyServiceFee && (
              <div className="space-y-2">
                <Label htmlFor="service-fee-percent">Porcentagem (%)</Label>
                <Input
                  id="service-fee-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={serviceFeePercent}
                  onChange={(e) => setServiceFeePercent(e.target.value)}
                  placeholder={defaultPercent.toString()}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Comanda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
