import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, Phone, DollarSign, Loader2, Printer, FileText } from 'lucide-react';
import { useCustomerCredit } from '@/hooks/useCustomerCredit';
import { useCompany } from '@/hooks/useCompany';
import { useProfile } from '@/hooks/useProfile';
import { printCreditStatement, CreditStatementData } from '@/lib/print/creditStatement';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  credit_balance: number;
}

interface PDVReceiveCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSuccess?: () => void;
}

export function PDVReceiveCreditModal({ open, onOpenChange, customer, onSuccess }: PDVReceiveCreditModalProps) {
  const { data: company } = useCompany();
  const { data: profile } = useProfile();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');

  const { 
    transactions, 
    customerBalance, 
    receivePayment,
    isLoading 
  } = useCustomerCredit(customer?.id);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleReceive = async () => {
    if (!customer || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    if (amount > customerBalance) {
      toast.error('Valor maior que o saldo devedor');
      return;
    }

    try {
      await receivePayment.mutateAsync({
        customerId: customer.id,
        amount,
        paymentMethod,
      });
      
      toast.success(`Pagamento de ${formatCurrency(amount)} recebido!`);
      setPaymentAmount('');
      onSuccess?.();
      
      if (amount >= customerBalance) {
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handlePrintReceipt = () => {
    if (!customer) return;

    const content = `
      <html>
        <head>
          <title>Comprovante de Fiado</title>
          <style>
            body { font-family: monospace; width: 80mm; padding: 10px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-size: 1.2em; font-weight: bold; border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
            .signature { margin-top: 40px; border-top: 1px solid #000; text-align: center; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>CONTA CORRENTE - FIADO</h3>
            <p>${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
          </div>
          <div class="row"><span>Cliente:</span><span>${customer.name}</span></div>
          <div class="row"><span>WhatsApp:</span><span>${customer.whatsapp}</span></div>
          <div class="total">
            <div class="row"><span>SALDO DEVEDOR:</span><span>${formatCurrency(customerBalance)}</span></div>
          </div>
          <div class="signature">
            <p>Assinatura do Cliente</p>
          </div>
          <p style="text-align: center; margin-top: 20px; font-size: 0.8em;">Via do Cliente</p>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handlePrintStatement = () => {
    if (!customer || !company) return;

    const statementData: CreditStatementData = {
      customer: {
        id: customer.id,
        name: customer.name,
        whatsapp: customer.whatsapp,
      },
      summary: {
        currentBalance: customerBalance,
        status: 'active',
      },
      transactions: transactions.map(tx => ({
        id: tx.id,
        created_at: tx.created_at,
        transaction_type: tx.transaction_type,
        order_id: tx.order_id,
        amount: tx.amount,
        balance_after: tx.balance_after,
        notes: tx.notes,
      })),
      companyName: company.name || 'Empresa',
      operatorName: profile?.full_name,
    };

    printCreditStatement(statementData);
    toast.success('Extrato enviado para impressão');
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-500" />
            Receber Fiado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info do cliente */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-lg">{customer.name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {customer.whatsapp}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Saldo Devedor</span>
              <Badge variant="outline" className="text-lg px-3 py-1 text-orange-600 border-orange-500/50 bg-orange-500/10">
                {formatCurrency(customerBalance)}
              </Badge>
            </div>
          </div>

          {/* Ações de impressão */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handlePrintReceipt}
            >
              <Printer className="h-4 w-4 mr-2" />
              Comprovante
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handlePrintStatement}
            >
              <FileText className="h-4 w-4 mr-2" />
              Extrato Completo
            </Button>
          </div>

          {/* Formulário de recebimento */}
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Valor a Receber (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount(customerBalance.toString())}
                >
                  Total
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount((customerBalance / 2).toFixed(2))}
                >
                  50%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount((customerBalance / 4).toFixed(2))}
                >
                  25%
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleReceive}
            disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || receivePayment.isPending || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {receivePayment.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <DollarSign className="h-4 w-4 mr-1" />
            Receber
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
