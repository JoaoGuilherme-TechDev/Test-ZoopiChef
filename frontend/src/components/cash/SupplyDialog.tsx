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
import { ArrowUpCircle, Loader2, Printer } from 'lucide-react';

interface SupplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplyDialog({ open, onOpenChange }: SupplyDialogProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const { addSupply } = useCashMovements();
  const { openSession } = useCashSession();
  const { data: profile } = useProfile();
  const { data: company } = useCompany();

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    await addSupply.mutateAsync({
      amount: parseFloat(amount),
      reason: reason.trim() || undefined,
    });

    // Imprimir cupom de suprimento
    printSupplyReceipt();

    setAmount('');
    setReason('');
    onOpenChange(false);
  };

  const printSupplyReceipt = () => {
    const printContent = `
      <html>
      <head>
        <title>Suprimento</title>
        <style>
          body { font-family: monospace; width: 280px; padding: 10px; font-size: 12px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; }
        </style>
      </head>
      <body>
        <div class="center bold">SUPRIMENTO DE CAIXA</div>
        <div class="line"></div>
        <p>${company?.name || 'Empresa'}</p>
        <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
        <p>Operador: ${profile?.full_name || 'Operador'}</p>
        <p>Sessão: ${openSession?.id?.slice(0, 8) || '-'}</p>
        <div class="line"></div>
        <div class="row">
          <span class="bold">VALOR:</span>
          <span class="bold">R$ ${parseFloat(amount).toFixed(2)}</span>
        </div>
        ${reason ? `
          <div class="line"></div>
          <p><strong>Observação:</strong></p>
          <p>${reason}</p>
        ` : ''}
        <div class="line"></div>
        <br><br>
        <p>_________________________</p>
        <p class="center">Assinatura do Operador</p>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-green-500" />
            Suprimento de Caixa
          </DialogTitle>
          <DialogDescription>
            Registre uma entrada adicional de dinheiro no caixa.
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
            <Label>Observação (opcional)</Label>
            <Textarea
              placeholder="Descreva o motivo do suprimento..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0 || addSupply.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {addSupply.isPending ? (
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
