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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useComandaPaymentMutations } from '@/hooks/useComandaPayments';
import { Loader2, CreditCard, Banknote, Smartphone, Receipt } from 'lucide-react';
import { toast } from 'sonner';

interface WaiterComandaPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comandaId: string;
  comandaNumber: number;
  total: number;
  paidAmount: number;
}

const paymentMethods = [
  { value: 'cash', label: 'Dinheiro', icon: Banknote },
  { value: 'credit_card', label: 'Crédito', icon: CreditCard },
  { value: 'debit_card', label: 'Débito', icon: CreditCard },
  { value: 'pix', label: 'PIX', icon: Smartphone },
];

export function WaiterComandaPaymentDialog({
  open,
  onOpenChange,
  comandaId,
  comandaNumber,
  total,
  paidAmount,
}: WaiterComandaPaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [paidByName, setPaidByName] = useState('');

  const { addPayment } = useComandaPaymentMutations();

  const remainingBalance = total - paidAmount;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountValue = parseFloat(amount.replace(',', '.'));
    
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    try {
      await addPayment.mutateAsync({
        comandaId,
        amount: amountValue,
        paymentMethod,
        paidByName: paidByName || undefined,
      });

      toast.success('Pagamento registrado!');
      setAmount('');
      setPaidByName('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const useFullAmount = () => {
    setAmount(remainingBalance.toFixed(2).replace('.', ','));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Pagamento - Comanda #{comandaNumber}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Total Display */}
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            {paidAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Pago</span>
                <span>{formatCurrency(paidAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-1 border-t">
              <span>Restante</span>
              <span>{formatCurrency(remainingBalance)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => (
                <Label
                  key={method.value}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === method.value ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <RadioGroupItem value={method.value} className="sr-only" />
                  <method.icon className="h-4 w-4" />
                  <span className="text-sm">{method.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Valor</Label>
              <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={useFullAmount}>
                Usar restante
              </Button>
            </div>
            <Input
              id="amount"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
            />
          </div>

          {/* Paid By Name (optional) */}
          <div className="space-y-2">
            <Label htmlFor="paidBy">Quem está pagando (opcional)</Label>
            <Input
              id="paidBy"
              placeholder="Nome do cliente"
              value={paidByName}
              onChange={(e) => setPaidByName(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={addPayment.isPending || !amount} className="gap-2">
              {addPayment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
