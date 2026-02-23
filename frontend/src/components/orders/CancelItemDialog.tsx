import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Package, Trash2 } from 'lucide-react';

interface CancelItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  quantity: number;
  onConfirm: (returnToStock: boolean, reason: string) => void;
  isLoading?: boolean;
  productType?: 'prepared' | 'resale'; // prepared = pratos, resale = bebidas/CMV
}

export function CancelItemDialog({
  open,
  onOpenChange,
  itemName,
  quantity,
  onConfirm,
  isLoading,
  productType = 'resale',
}: CancelItemDialogProps) {
  const [returnToStock, setReturnToStock] = useState<string>(
    productType === 'prepared' ? 'no' : 'yes'
  );
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(returnToStock === 'yes', reason);
  };

  const isPrepared = productType === 'prepared';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancelar Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">{itemName}</p>
            <p className="text-sm text-muted-foreground">Quantidade: {quantity}</p>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">O que fazer com o estoque?</Label>
            <RadioGroup
              value={returnToStock}
              onValueChange={setReturnToStock}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="no" id="no-return" />
                <Label htmlFor="no-return" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="font-medium">Sair do Estoque (Perda)</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isPrepared 
                      ? 'Pratos preparados não podem voltar ao estoque'
                      : 'O produto foi consumido, desperdiçado ou danificado'}
                  </p>
                </Label>
              </div>

              <div 
                className={`flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors ${
                  isPrepared ? 'opacity-50' : ''
                }`}
              >
                <RadioGroupItem value="yes" id="yes-return" disabled={isPrepared} />
                <Label htmlFor="yes-return" className={`flex-1 ${isPrepared ? '' : 'cursor-pointer'}`}>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-success" />
                    <span className="font-medium">Voltar para Estoque</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isPrepared
                      ? 'Não disponível para itens preparados'
                      : 'O produto está intacto e pode ser revendido (ex: cerveja fechada)'}
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do cancelamento</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo do cancelamento..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Voltar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={isLoading}
          >
            {isLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
