import { useState, forwardRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDeliverers, Deliverer } from '@/hooks/useDeliverers';
import { Truck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber?: number | string;
  onConfirm: (delivererId: string) => void;
  isLoading?: boolean;
}

// Using forwardRef to fix React ref warning
export const DispatchDialog = forwardRef<HTMLDivElement, DispatchDialogProps>(function DispatchDialog(
  { open, onOpenChange, orderNumber, onConfirm, isLoading },
  ref
) {
  const [selectedDelivererId, setSelectedDelivererId] = useState<string>('');
  const { deliverers } = useDeliverers();
  
  const activeDeliverers = deliverers.filter((d: Deliverer) => d.active);

  const handleConfirm = () => {
    if (!selectedDelivererId) {
      toast.error('Selecione um entregador antes de despachar');
      return;
    }
    onConfirm(selectedDelivererId);
  };

  const handleClose = () => {
    setSelectedDelivererId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Despachar Pedido {orderNumber ? `#${String(orderNumber).padStart(3, '0')}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {activeDeliverers.length === 0 ? (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">
                Nenhum entregador ativo cadastrado. Cadastre entregadores primeiro.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="deliverer" className="text-base font-semibold">
                  Selecione o Entregador *
                </Label>
                <Select
                  value={selectedDelivererId}
                  onValueChange={setSelectedDelivererId}
                  disabled={isLoading}
                >
                  <SelectTrigger id="deliverer" className="h-12 text-base">
                    <SelectValue placeholder="Escolha o entregador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDeliverers.map((deliverer) => (
                      <SelectItem key={deliverer.id} value={deliverer.id} className="py-3">
                        {deliverer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <p className="text-sm text-muted-foreground">
                O entregador será vinculado ao pedido e poderá receber notificações.
              </p>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isLoading || !selectedDelivererId || activeDeliverers.length === 0}
          >
            {isLoading ? 'Despachando...' : 'Confirmar Despacho'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

// Display name for debugging
DispatchDialog.displayName = 'DispatchDialog';
