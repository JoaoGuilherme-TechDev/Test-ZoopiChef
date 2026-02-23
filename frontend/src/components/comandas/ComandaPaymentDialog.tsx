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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CreditCard, Banknote, QrCode, Smartphone, Receipt, Users, Star, Search, TabletSmartphone } from 'lucide-react';
import { useComandaPaymentMutations } from '@/hooks/useComandaPayments';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { SmartPOSPaymentDialog } from '@/components/smartpos/SmartPOSPaymentDialog';

interface ComandaPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comandaId: string;
  balance: number;
}

const defaultPaymentMethods = [
  { value: 'Dinheiro', label: 'Dinheiro', icon: Banknote, has_loyalty_points: false },
  { value: 'PIX', label: 'PIX', icon: QrCode, has_loyalty_points: false },
  { value: 'Crédito', label: 'Crédito', icon: CreditCard, has_loyalty_points: false },
  { value: 'Débito', label: 'Débito', icon: Smartphone, has_loyalty_points: false },
  { value: 'Maquininha', label: 'Maquininha', icon: TabletSmartphone, has_loyalty_points: false },
  { value: 'Outro', label: 'Outro', icon: Receipt, has_loyalty_points: false },
];

export function ComandaPaymentDialog({
  open,
  onOpenChange,
  comandaId,
  balance,
}: ComandaPaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [paidByName, setPaidByName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showSmartPOS, setShowSmartPOS] = useState(false);

  const { addPayment } = useComandaPaymentMutations();
  const { activeMethods } = usePaymentMethods();
  const { customers } = useCustomers();

  const numericAmount = parseFloat(amount.replace(',', '.')) || 0;

  // Get payment methods with loyalty info
  const paymentMethodsWithLoyalty = activeMethods.length > 0 
    ? activeMethods.map(m => ({
        value: m.name,
        label: m.name,
        icon: m.payment_type === 'dinheiro' ? Banknote 
            : m.payment_type === 'pix' ? QrCode 
            : m.payment_type === 'credito' ? CreditCard 
            : m.payment_type === 'debito' ? Smartphone 
            : Receipt,
        has_loyalty_points: m.has_loyalty_points,
      }))
    : defaultPaymentMethods;

  const currentMethod = paymentMethodsWithLoyalty.find(m => m.value === paymentMethod);
  const methodHasLoyalty = currentMethod?.has_loyalty_points || false;

  // Filter customers by search
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.whatsapp.includes(customerSearch)
  ).slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (numericAmount <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    // If Maquininha is selected, open Smart POS dialog
    if (paymentMethod === 'Maquininha') {
      setShowSmartPOS(true);
      return;
    }

    await processPayment(paymentMethod);
  };

  const processPayment = async (method: string) => {
    try {
      const result = await addPayment.mutateAsync({
        comandaId,
        amount: numericAmount,
        paymentMethod: method,
        paidByName: paidByName.trim() || selectedCustomer?.name || undefined,
        customerId: selectedCustomer?.id,
      });

      if (result.loyalty_points_awarded > 0) {
        toast.success(`Pagamento de R$ ${numericAmount.toFixed(2)} registrado! +${result.loyalty_points_awarded} pontos de fidelidade`);
      } else {
        toast.success(`Pagamento de R$ ${numericAmount.toFixed(2)} registrado`);
      }
      
      setAmount('');
      setPaidByName('');
      setSelectedCustomer(null);
      setCustomerSearch('');
      setShowCustomerSelector(false);
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleSmartPOSSuccess = async (transaction: any) => {
    const method = transaction.payment_method || 'Maquininha';
    await processPayment(method);
    setShowSmartPOS(false);
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toFixed(2).replace('.', ','));
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaidByName(customer.name);
    setShowCustomerSelector(false);
    setCustomerSearch('');
  };

  const handleRemoveCustomer = () => {
    setSelectedCustomer(null);
  };

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedCustomer(null);
      setShowCustomerSelector(false);
      setCustomerSearch('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Receber Pagamento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Balance display */}
          <div className="p-4 rounded-lg bg-muted text-center">
            <p className="text-sm text-muted-foreground">Saldo restante</p>
            <p className="text-2xl font-bold text-primary">
              R$ {balance.toFixed(2)}
            </p>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickAmount(balance)}
              className="flex-1"
            >
              Total
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickAmount(balance / 2)}
              className="flex-1"
            >
              Metade
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickAmount(Math.ceil(balance / 10) * 10)}
              className="flex-1"
            >
              Arredondar
            </Button>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg"
              autoFocus
            />
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="grid grid-cols-3 gap-2"
            >
              {paymentMethodsWithLoyalty.map((method) => {
                const Icon = method.icon;
                return (
                  <Label
                    key={method.value}
                    htmlFor={method.value}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all relative',
                      paymentMethod === method.value
                        ? 'border-primary bg-primary/10'
                        : 'border-muted hover:border-muted-foreground/50'
                    )}
                  >
                    <RadioGroupItem
                      value={method.value}
                      id={method.value}
                      className="sr-only"
                    />
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-xs text-center">{method.label}</span>
                    {method.has_loyalty_points && (
                      <Star className="h-3 w-3 absolute top-1 right-1 text-yellow-500 fill-yellow-500" />
                    )}
                  </Label>
                );
              })}
            </RadioGroup>
            {methodHasLoyalty && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                Esta forma de pagamento pontua fidelidade
              </p>
            )}
          </div>

          {/* Customer selector - for loyalty points */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Vincular Cliente (opcional)
            </Label>
            
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div>
                  <p className="font-medium">{selectedCustomer.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.whatsapp}</p>
                </div>
                <div className="flex items-center gap-2">
                  {methodHasLoyalty && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      Pontua
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCustomer}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ) : showCustomerSelector ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente por nome ou WhatsApp..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-40 border rounded-lg">
                  {filteredCustomers.length > 0 ? (
                    <div className="p-1">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleSelectCustomer(customer)}
                          className="w-full p-2 text-left hover:bg-muted rounded-md transition-colors"
                        >
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.whatsapp}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      {customerSearch ? 'Nenhum cliente encontrado' : 'Digite para buscar'}
                    </div>
                  )}
                </ScrollArea>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomerSelector(false)}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowCustomerSelector(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                Selecionar Cliente
              </Button>
            )}
            {!selectedCustomer && methodHasLoyalty && (
              <p className="text-xs text-amber-600">
                Vincule um cliente para pontuar fidelidade neste pagamento
              </p>
            )}
          </div>

          {/* Paid by name - only show if no customer selected */}
          {!selectedCustomer && (
            <div className="space-y-2">
              <Label htmlFor="paidByName">Quem pagou? (opcional)</Label>
              <Input
                id="paidByName"
                placeholder="Nome de quem está pagando"
                value={paidByName}
                onChange={(e) => setPaidByName(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={addPayment.isPending || numericAmount <= 0}>
              {addPayment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {paymentMethod === 'Maquininha' ? 'Enviar para Maquininha' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </form>

        {/* Smart POS Payment Dialog */}
        <SmartPOSPaymentDialog
          open={showSmartPOS}
          onOpenChange={setShowSmartPOS}
          amountCents={Math.round(numericAmount * 100)}
          orderId={comandaId}
          onSuccess={handleSmartPOSSuccess}
          onCancel={() => setShowSmartPOS(false)}
        />
      </DialogContent>
    </Dialog>
  );
}