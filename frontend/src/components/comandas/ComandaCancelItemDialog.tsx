import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, X, AlertTriangle } from 'lucide-react';
import { useComandaItemMutations } from '@/hooks/useComandaItems';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ComandaCancelItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  isPrinted?: boolean;
  allowDeletePrintedItems?: boolean;
  onSuccess: () => void;
}

export function ComandaCancelItemDialog({
  open,
  onOpenChange,
  itemId,
  isPrinted = false,
  allowDeletePrintedItems = true,
  onSuccess,
}: ComandaCancelItemDialogProps) {
  const [reason, setReason] = useState('');
  const { cancelItem } = useComandaItemMutations();

  // Block deletion if item is printed and setting disallows it
  const isBlocked = isPrinted && !allowDeletePrintedItems;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemId) return;

    if (!reason.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }

    try {
      await cancelItem.mutateAsync({ itemId, reason: reason.trim() });
      toast.success('Item cancelado');
      setReason('');
      onSuccess();
    } catch (error) {
      toast.error('Erro ao cancelar item');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <X className="h-5 w-5" />
            Cancelar Item
          </DialogTitle>
        </DialogHeader>

        {isBlocked ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Este item já foi impresso e não pode ser cancelado via dispositivo móvel.
                Para cancelar, utilize o sistema principal.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isPrinted && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Atenção: Este item já foi impresso na cozinha.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo do cancelamento *</Label>
              <Textarea
                id="reason"
                placeholder="Ex: cliente desistiu, erro de lançamento..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Voltar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={cancelItem.isPending || !reason.trim()}
              >
                {cancelItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar Cancelamento
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
