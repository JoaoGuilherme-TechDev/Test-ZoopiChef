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
import { Textarea } from '@/components/ui/textarea';
import { useCashMovements } from '@/hooks/useCashMovements';
import { useCashSession } from '@/hooks/useCashSession';
import { useProfile } from '@/hooks/useProfile';
import { useCompany } from '@/hooks/useCompany';
import { usePrintJobQueue } from '@/hooks/usePrintJobQueue';
import { ArrowDownCircle, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WithdrawalDialog({ open, onOpenChange }: WithdrawalDialogProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const { addWithdrawal } = useCashMovements();
  const { openSession } = useCashSession();
  const { data: profile } = useProfile();
  const { data: company } = useCompany();
  const { createCashPrintJob } = usePrintJobQueue();

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (!reason.trim()) return;

    try {
      await addWithdrawal.mutateAsync({
        amount: parseFloat(amount),
        reason: reason.trim(),
      });

      // Enviar para fila de impressão via agente (RAW ESC/POS)
      if (company?.id && openSession?.id) {
        await createCashPrintJob.mutateAsync({
          companyId: company.id,
          cashSessionId: openSession.id,
          jobType: 'cash_sangria',
          metadata: {
            type: 'sangria',
            amount: parseFloat(amount),
            reason: reason.trim(),
            operatorName: profile?.full_name || 'Operador',
            companyName: company?.name || 'Empresa',
            timestamp: new Date().toISOString(),
          },
        });
        toast.success('Sangria registrada e enviada para impressão');
      } else {
        toast.success('Sangria registrada');
      }

      setAmount('');
      setReason('');
      onOpenChange(false);
    } catch (error) {
      console.error('[WithdrawalDialog] Error:', error);
      toast.error('Erro ao registrar sangria');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-red-500" />
            Sangria (Retirada)
          </DialogTitle>
          <DialogDescription>
            Registre uma retirada de dinheiro do caixa. O cupom será impresso automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Motivo da Sangria *</Label>
            <Textarea
              placeholder="Descreva o motivo da retirada..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0 || !reason.trim() || addWithdrawal.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {addWithdrawal.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Registrar e Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
