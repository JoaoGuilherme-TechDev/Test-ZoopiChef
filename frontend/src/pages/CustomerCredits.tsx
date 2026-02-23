import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCustomersWithCredit, useCustomerCredit } from '@/hooks/useCustomerCredit';
import { useCompany } from '@/hooks/useCompany';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Wallet, DollarSign, ArrowDownCircle, ArrowUpCircle, 
  User, Phone, Loader2, Receipt, Printer, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { printCreditStatement, CreditStatementData } from '@/lib/print/creditStatement';
import { toast } from 'sonner';

export default function CustomerCredits() {
  const { customersWithCredit, isLoading } = useCustomersWithCredit();
  const { data: company } = useCompany();
  const { data: profile } = useProfile();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');

  const { 
    transactions, 
    customerBalance, 
    receivePayment 
  } = useCustomerCredit(selectedCustomerId || undefined);

  const selectedCustomer = customersWithCredit.find(c => c.id === selectedCustomerId);

  const totalCredit = customersWithCredit.reduce((sum, c) => sum + Number(c.credit_balance), 0);

  const handleReceivePayment = async () => {
    if (!selectedCustomerId || !paymentAmount) return;

    await receivePayment.mutateAsync({
      customerId: selectedCustomerId,
      amount: parseFloat(paymentAmount),
      paymentMethod,
    });

    setPaymentDialogOpen(false);
    setPaymentAmount('');
  };

  // Print simple receipt (quick print)
  const handlePrintReceipt = (customerId: string) => {
    const customer = customersWithCredit.find(c => c.id === customerId);
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
            <div class="row"><span>SALDO DEVEDOR:</span><span>R$ ${Number(customer.credit_balance).toFixed(2)}</span></div>
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

  // Print full credit statement with transaction history
  const handlePrintFullStatement = () => {
    if (!selectedCustomer || !company) {
      toast.error('Selecione um cliente para imprimir o extrato');
      return;
    }

    const statementData: CreditStatementData = {
      customer: {
        id: selectedCustomer.id,
        name: selectedCustomer.name,
        whatsapp: selectedCustomer.whatsapp,
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
      operatorName: profile?.id ? undefined : undefined,
    };

    printCreditStatement(statementData);
    toast.success('Extrato enviado para impressão');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fiado / Conta Corrente</h1>
            <p className="text-muted-foreground">
              Gerencie os créditos dos clientes
            </p>
          </div>
        </div>

        {/* Card de Total */}
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total a Receber</CardTitle>
            <Wallet className="h-6 w-6 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {formatCurrency(totalCredit)}
            </div>
            <p className="text-sm text-muted-foreground">
              {customersWithCredit.length} clientes com saldo devedor
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Lista de Clientes */}
          <Card>
            <CardHeader>
              <CardTitle>Clientes com Fiado</CardTitle>
              <CardDescription>Selecione para ver detalhes</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : customersWithCredit.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum cliente com fiado pendente
                </div>
              ) : (
                <div className="space-y-2">
                  {customersWithCredit.map((customer) => (
                    <div
                      key={customer.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedCustomerId === customer.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedCustomerId(customer.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.whatsapp}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">
                            {formatCurrency(Number(customer.credit_balance))}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintReceipt(customer.id);
                            }}
                          >
                            <Printer className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalhes do Cliente */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedCustomer ? selectedCustomer.name : 'Selecione um cliente'}
                  </CardTitle>
                  <CardDescription>Histórico de transações</CardDescription>
                </div>
                {selectedCustomer && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePrintFullStatement();
                      }}
                      title="Imprimir extrato completo"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Imprimir Relatório
                    </Button>
                    <Button onClick={() => setPaymentDialogOpen(true)}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Receber
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedCustomer ? (
                <div className="text-center py-8 text-muted-foreground">
                  Selecione um cliente para ver o histórico
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Saldo atual */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Saldo Devedor Atual</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(customerBalance)}
                    </p>
                  </div>

                  {/* Histórico */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {transactions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhuma transação registrada
                      </p>
                    ) : (
                      transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {tx.transaction_type === 'debit' ? (
                              <ArrowUpCircle className="h-5 w-5 text-red-500" />
                            ) : (
                              <ArrowDownCircle className="h-5 w-5 text-green-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium">
                                {tx.transaction_type === 'debit' ? 'Débito (Pedido)' : 'Pagamento'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              tx.transaction_type === 'debit' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {tx.transaction_type === 'debit' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Saldo: {formatCurrency(tx.balance_after)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog Receber Pagamento */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receber Pagamento de Fiado</DialogTitle>
            <DialogDescription>
              Cliente: {selectedCustomer?.name}
              <br />
              Saldo devedor: {formatCurrency(customerBalance)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor a Receber (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                max={customerBalance}
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleReceivePayment} 
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || receivePayment.isPending}
            >
              {receivePayment.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
