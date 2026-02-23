import { useState } from 'react';
import { 
  Search, 
  DollarSign,
  ChevronLeft,
  AlertCircle,
  Wallet,
  Phone,
  Receipt,
  Printer
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCustomerCredit, useCustomersWithCredit } from '@/hooks/useCustomerCredit';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SmartPOSCreditProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'receive' | 'launch';
}

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  credit_balance: number;
}

export function SmartPOSCredit({
  open,
  onOpenChange,
  mode,
}: SmartPOSCreditProps) {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [notes, setNotes] = useState('');

  const { customersWithCredit, isLoading } = useCustomersWithCredit();
  const { receivePayment, customerBalance } = useCustomerCredit(selectedCustomer?.id);

  const filteredCustomers = (customersWithCredit || []).filter((c) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(searchLower) ||
      c.whatsapp.includes(search)
    );
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleReceive = async () => {
    if (!selectedCustomer || !amount) {
      toast.error('Preencha todos os campos');
      return;
    }

    const amountNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Valor inválido');
      return;
    }

    try {
      await receivePayment.mutateAsync({
        customerId: selectedCustomer.id,
        amount: amountNum,
        paymentMethod,
        notes: notes || undefined,
      });
      
      // Reset form
      setAmount('');
      setNotes('');
      
      // Update local customer balance
      setSelectedCustomer(prev => prev ? {
        ...prev,
        credit_balance: prev.credit_balance - amountNum
      } : null);
      
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleClose = () => {
    setSearch('');
    setSelectedCustomer(null);
    setAmount('');
    setNotes('');
    onOpenChange(false);
  };

  const quickAmounts = [10, 20, 50, 100];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 bg-gray-900 border-gray-700">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-white flex items-center gap-2">
            {selectedCustomer ? (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 mr-2"
                  onClick={() => setSelectedCustomer(null)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {mode === 'receive' ? 'Receber de' : 'Lançar para'} {selectedCustomer.name}
              </>
            ) : (
              <>
                <Wallet className="h-5 w-5 text-orange-500" />
                {mode === 'receive' ? 'Receber Fiado' : 'Lançar Fiado'}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {!selectedCustomer ? (
          // Customer List
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-2">
                {isLoading ? (
                  <div className="text-center py-8 text-gray-400">
                    Carregando...
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>{mode === 'receive' ? 'Nenhum cliente com saldo devedor' : 'Nenhum cliente encontrado'}</p>
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-4 rounded-lg bg-gray-800 border border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-medium text-white">
                            {customer.name}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-400">
                            <Phone className="h-3 w-3" />
                            {customer.whatsapp}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">Saldo devedor</div>
                          <div className="text-lg font-bold text-orange-400">
                            {formatPrice(customer.credit_balance)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          // Payment Form
          <div className="p-4 space-y-4">
            {/* Customer Info */}
            <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">Saldo devedor</div>
                  <div className="text-2xl font-bold text-orange-400">
                    {formatPrice(selectedCustomer.credit_balance)}
                  </div>
                </div>
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <div className="text-sm text-gray-400 mt-2">
                {selectedCustomer.whatsapp}
              </div>
            </div>

            {mode === 'receive' && (
              <>
                {/* Quick Amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((qa) => (
                    <Button
                      key={qa}
                      variant="outline"
                      size="sm"
                      className="bg-gray-800 border-gray-700 hover:bg-gray-700"
                      onClick={() => setAmount(qa.toString())}
                    >
                      R$ {qa}
                    </Button>
                  ))}
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label className="text-gray-300">Valor a receber</Label>
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="text-2xl font-bold h-14 text-center bg-gray-800 border-gray-700 text-white"
                    inputMode="decimal"
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-gray-300">Forma de pagamento</Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="grid grid-cols-2 gap-2"
                  >
                    {[
                      { value: 'dinheiro', label: 'Dinheiro' },
                      { value: 'pix', label: 'PIX' },
                      { value: 'cartao_debito', label: 'Débito' },
                      { value: 'cartao_credito', label: 'Crédito' },
                    ].map((method) => (
                      <div key={method.value}>
                        <RadioGroupItem
                          value={method.value}
                          id={method.value}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={method.value}
                          className={cn(
                            "flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-colors",
                            paymentMethod === method.value
                              ? "bg-primary/20 border-primary text-primary"
                              : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750"
                          )}
                        >
                          {method.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-gray-300">Observação (opcional)</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Pagamento parcial"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              {mode === 'receive' && (
                <Button 
                  onClick={handleReceive}
                  disabled={receivePayment.isPending || !amount}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Receber
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
