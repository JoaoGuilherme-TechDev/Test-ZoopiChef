import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCashSession } from '@/hooks/useCashSession';
import { Unlock, Loader2, Banknote, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CashOpenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CashOpenDialog({ open, onOpenChange }: CashOpenDialogProps) {
  const [openingBalance, setOpeningBalance] = useState('');
  const [notes, setNotes] = useState('');
  const { openCash } = useCashSession();

  const openingBalanceNum = parseFloat(openingBalance) || 0;
  const isValidBalance = openingBalance !== '' && openingBalanceNum >= 0;

  const handleOpen = async () => {
    if (!isValidBalance) {
      return;
    }
    
    try {
      await openCash.mutateAsync({
        openingBalance: openingBalanceNum,
        notes: notes.trim() || undefined,
      });
      setOpeningBalance('');
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-green-500" />
            Abrir Caixa
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <span>Informe o valor inicial em dinheiro (troco) disponível no caixa para iniciar o turno.</span>
            <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">
                Data de Negócio: {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Todos os pedidos deste caixa serão vinculados a esta data, mesmo que o fechamento ocorra em outro dia.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="openingBalance" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Valor de Suprimento (R$) *
            </Label>
            <Input
              id="openingBalance"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className={`text-lg font-bold ${!isValidBalance && openingBalance !== '' ? 'border-red-500' : ''}`}
              autoFocus
              required
            />
            <p className="text-xs text-muted-foreground">
              <strong>Obrigatório:</strong> Informe o valor em dinheiro disponível para troco. 
              Um comprovante será impresso automaticamente para assinatura.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Turno da manhã, conferido por..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleOpen} 
            disabled={openCash.isPending || !isValidBalance}
            className="bg-green-600 hover:bg-green-700"
            title={!isValidBalance ? 'Informe o valor de suprimento' : ''}
          >
            {openCash.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Abrindo...
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                Abrir Caixa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}