import { useState, useEffect } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowRightLeft, Tag, Minus, Plus } from 'lucide-react';
import { useComandas } from '@/hooks/useComandas';
import { useComandaItemMutations, useComandaItems } from '@/hooks/useComandaItems';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ComandaTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  sourceComandaId: string;
  onSuccess: () => void;
}

export function ComandaTransferDialog({
  open,
  onOpenChange,
  itemId,
  sourceComandaId,
  onSuccess,
}: ComandaTransferDialogProps) {
  const [targetComandaId, setTargetComandaId] = useState<string | null>(null);
  const [qtyToTransfer, setQtyToTransfer] = useState(1);

  const { comandas } = useComandas(['open', 'no_activity']);
  const { items } = useComandaItems(sourceComandaId);
  const { transferItem } = useComandaItemMutations();

  const availableComandas = comandas.filter((c) => c.id !== sourceComandaId);
  const currentItem = items.find((i) => i.id === itemId);
  const maxQty = currentItem ? Number(currentItem.qty) : 1;

  useEffect(() => {
    if (open && currentItem) {
      setQtyToTransfer(Number(currentItem.qty));
    }
  }, [open, currentItem]);

  const handleTransfer = async () => {
    if (!itemId || !targetComandaId) {
      toast.error('Selecione a comanda de destino');
      return;
    }

    try {
      await transferItem.mutateAsync({
        itemId,
        targetComandaId,
        qtyToTransfer,
      });

      toast.success('Item transferido com sucesso');
      setTargetComandaId(null);
      onSuccess();
    } catch (error) {
      toast.error('Erro ao transferir item');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transferir Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current item info */}
          {currentItem && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium">{currentItem.product_name_snapshot}</p>
              <p className="text-sm text-muted-foreground">
                Quantidade disponível: {maxQty}
              </p>
            </div>
          )}

          {/* Quantity selector (only if qty > 1) */}
          {maxQty > 1 && (
            <div className="space-y-2">
              <Label>Quantidade a transferir</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQtyToTransfer(Math.max(1, qtyToTransfer - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={qtyToTransfer}
                  onChange={(e) =>
                    setQtyToTransfer(
                      Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1))
                    )
                  }
                  className="w-20 text-center"
                  min={1}
                  max={maxQty}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQtyToTransfer(Math.min(maxQty, qtyToTransfer + 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Target comanda selection */}
          <div className="space-y-2">
            <Label>Transferir para</Label>
            <ScrollArea className="h-48 rounded-lg border p-2">
              {availableComandas.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhuma outra comanda aberta
                </div>
              ) : (
                <div className="space-y-2">
                  {availableComandas.map((comanda) => (
                    <button
                      key={comanda.id}
                      onClick={() => setTargetComandaId(comanda.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
                        targetComandaId === comanda.id
                          ? 'border-primary bg-primary/10'
                          : 'hover:bg-muted'
                      )}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Tag className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Comanda {comanda.command_number}</p>
                        {comanda.name && (
                          <p className="text-sm text-muted-foreground">{comanda.name}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={transferItem.isPending || !targetComandaId}
          >
            {transferItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
