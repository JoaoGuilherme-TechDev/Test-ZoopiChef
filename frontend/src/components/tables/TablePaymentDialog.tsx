import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTablePayments } from '@/hooks/useTablePayments';
import { useAllSessionItems } from '@/hooks/useTableCommands';
import { useTableCommands } from '@/hooks/useTableCommands';
import { toast } from 'sonner';
import { Loader2, CreditCard, Banknote, Smartphone, Percent, Minus, CheckSquare, TabletSmartphone, User } from 'lucide-react';
import { SmartPOSPaymentDialog } from '@/components/smartpos/SmartPOSPaymentDialog';
import { QuickCustomerLink } from '@/components/sales/QuickCustomerLink';
import { Customer } from '@/hooks/useCustomers';

interface TablePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  tableId: string;
  tableNumber: number;
  totalAmountCents: number;
  onClose?: () => void;
}

const paymentMethods = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'credito', label: 'Crédito', icon: CreditCard },
  { value: 'debito', label: 'Débito', icon: CreditCard },
  { value: 'pix', label: 'PIX', icon: Smartphone },
  { value: 'smartpos', label: 'Maquininha', icon: TabletSmartphone },
];

export function TablePaymentDialog({ 
  open, 
  onOpenChange,
  sessionId,
  tableId,
  tableNumber,
  totalAmountCents,
  onClose
}: TablePaymentDialogProps) {
  const { payments, totalPaidCents, addPayment } = useTablePayments(sessionId);
  const { commands } = useTableCommands(sessionId);
  const { items } = useAllSessionItems(sessionId);
  
  const [paymentType, setPaymentType] = useState<'partial' | 'advance' | 'full' | 'command'>('full');
  const [selectedCommandIds, setSelectedCommandIds] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [payerName, setPayerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'value'>('percent');
  const [surcharge, setSurcharge] = useState('');
  const [showSmartPOS, setShowSmartPOS] = useState(false);
  const [linkedCustomer, setLinkedCustomer] = useState<Customer | null>(null);

  const remainingAmount = totalAmountCents - totalPaidCents;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
    return Math.round(parseFloat(cleaned || '0') * 100);
  };

  const calculateFinalAmount = () => {
    let base = remainingAmount;
    
    // Apply surcharge
    if (surcharge) {
      base += parseCurrency(surcharge);
    }
    
    // Apply discount
    if (discount) {
      if (discountType === 'percent') {
        const percent = parseFloat(discount) || 0;
        base -= Math.round(base * (percent / 100));
      } else {
        base -= parseCurrency(discount);
      }
    }
    
    return Math.max(0, base);
  };

  const getPaymentAmount = () => {
    if (paymentType === 'full') {
      return calculateFinalAmount();
    } else if (paymentType === 'command' && selectedCommandIds.length > 0) {
      const commandItems = items.filter(i => 
        selectedCommandIds.includes(i.command_id || '') && i.status !== 'cancelled'
      );
      return commandItems.reduce((sum, i) => sum + i.total_price_cents, 0);
    } else {
      return parseCurrency(amount);
    }
  };

  const handlePayment = async () => {
    // If smartpos is selected, open the SmartPOS dialog
    if (paymentMethod === 'smartpos') {
      setShowSmartPOS(true);
      return;
    }

    const payAmount = getPaymentAmount();

    if (payAmount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    try {
      await addPayment.mutateAsync({
        sessionId,
        tableId,
        commandId: selectedCommandIds.length === 1 ? selectedCommandIds[0] : undefined,
        amountCents: payAmount,
        payerName: payerName || undefined,
        paymentMethod,
        paymentType: paymentType === 'command' ? 'partial' : paymentType,
      });

      toast.success('Pagamento registrado!');
      
      // Reset form
      setAmount('');
      setPayerName('');
      setDiscount('');
      setSurcharge('');
      setSelectedCommandIds([]);
      
      // If full payment, trigger close
      if (paymentType === 'full' || payAmount >= remainingAmount) {
        onClose?.();
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleSmartPOSSuccess = async (transaction: any) => {
    const payAmount = getPaymentAmount();
    
    try {
      await addPayment.mutateAsync({
        sessionId,
        tableId,
        commandId: selectedCommandIds.length === 1 ? selectedCommandIds[0] : undefined,
        amountCents: payAmount,
        payerName: payerName || undefined,
        paymentMethod: transaction.payment_method || 'smartpos',
        paymentType: paymentType === 'command' ? 'partial' : paymentType,
      });

      toast.success('Pagamento via maquininha aprovado!');
      setShowSmartPOS(false);
      
      // Reset form
      setAmount('');
      setPayerName('');
      setDiscount('');
      setSurcharge('');
      setSelectedCommandIds([]);
      
      if (paymentType === 'full' || payAmount >= remainingAmount) {
        onClose?.();
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleQuickDiscount = (percent: number) => {
    setDiscountType('percent');
    setDiscount(percent.toString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pagamento - Mesa {tableNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Customer Link */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Vincular Cliente (opcional)
            </Label>
            <QuickCustomerLink
              selectedCustomer={linkedCustomer}
              onSelectCustomer={setLinkedCustomer}
              compact
            />
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <span className="text-sm text-muted-foreground">Total Consumo</span>
              <p className="text-xl font-bold">{formatCurrency(totalAmountCents)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Já Pago</span>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaidCents)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Restante</span>
              <p className="text-xl font-bold text-primary">{formatCurrency(remainingAmount)}</p>
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Pagamentos Anteriores</h4>
              <div className="space-y-1">
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                    <span>
                      {p.payer_name || 'Anônimo'} - {p.payment_method}
                      {p.payment_type === 'advance' && <Badge variant="outline" className="ml-2">Adiantamento</Badge>}
                    </span>
                    <span className="font-medium">{formatCurrency(p.amount_cents)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as typeof paymentType)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="full">Total</TabsTrigger>
              <TabsTrigger value="partial">Parcial</TabsTrigger>
              <TabsTrigger value="command">Por Comanda</TabsTrigger>
              <TabsTrigger value="advance">Adiantamento</TabsTrigger>
            </TabsList>

            <TabsContent value="full" className="space-y-4 mt-4">
              <div className="space-y-4">
                {/* Quick discount buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleQuickDiscount(10)}
                  >
                    <Minus className="h-3 w-3 mr-1" />
                    10%
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setDiscountType('percent');
                      setDiscount('10');
                    }}
                  >
                    Retirar Taxa
                  </Button>
                </div>

                {/* Surcharge */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Acréscimo (R$)</Label>
                    <Input
                      type="text"
                      value={surcharge}
                      onChange={(e) => setSurcharge(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Desconto</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder={discountType === 'percent' ? '10' : '0,00'}
                      />
                      <Button 
                        variant={discountType === 'percent' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setDiscountType('percent')}
                      >
                        <Percent className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={discountType === 'value' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setDiscountType('value')}
                      >
                        R$
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-primary/10 rounded-lg">
                  <span className="text-sm text-muted-foreground">Valor Final</span>
                  <p className="text-2xl font-bold">{formatCurrency(calculateFinalAmount())}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="partial" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Valor a Pagar</Label>
                <Input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome de quem está pagando (opcional)</Label>
                <Input
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Ex: João"
                />
              </div>
            </TabsContent>

            <TabsContent value="command" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Selecione as Comandas</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (selectedCommandIds.length === commands.length) {
                        setSelectedCommandIds([]);
                      } else {
                        setSelectedCommandIds(commands.map(c => c.id));
                      }
                    }}
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    {selectedCommandIds.length === commands.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </Button>
                </div>
                <div className="space-y-2">
                  {commands.map((cmd) => {
                    const cmdItems = items.filter(i => i.command_id === cmd.id && i.status !== 'cancelled');
                    const cmdTotal = cmdItems.reduce((sum, i) => sum + i.total_price_cents, 0);
                    const isSelected = selectedCommandIds.includes(cmd.id);
                    return (
                      <div 
                        key={cmd.id} 
                        className={`flex items-center space-x-3 p-3 border rounded cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                        }`}
                        onClick={() => {
                          setSelectedCommandIds(prev => 
                            prev.includes(cmd.id) 
                              ? prev.filter(id => id !== cmd.id)
                              : [...prev, cmd.id]
                          );
                        }}
                      >
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setSelectedCommandIds(prev => 
                              checked 
                                ? [...prev, cmd.id]
                                : prev.filter(id => id !== cmd.id)
                            );
                          }}
                        />
                        <div className="flex-1 flex justify-between">
                          <span className="font-medium">{cmd.name || `Comanda ${cmd.number}`}</span>
                          <span className="font-bold text-primary">{formatCurrency(cmdTotal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selectedCommandIds.length > 0 && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Selecionado ({selectedCommandIds.length} comanda{selectedCommandIds.length > 1 ? 's' : ''}):</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(
                          items
                            .filter(i => selectedCommandIds.includes(i.command_id || '') && i.status !== 'cancelled')
                            .reduce((sum, i) => sum + i.total_price_cents, 0)
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="advance" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Valor Adiantado</Label>
                <Input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome de quem está adiantando</Label>
                <Input
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Ex: Maria"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                O adiantamento ficará registrado e será descontado do valor final.
              </p>
            </TabsContent>
          </Tabs>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <div className="grid grid-cols-4 gap-2">
              {paymentMethods.map((method) => (
                <Button
                  key={method.value}
                  variant={paymentMethod === method.value ? 'default' : 'outline'}
                  className="flex flex-col h-16 gap-1"
                  onClick={() => setPaymentMethod(method.value)}
                >
                  <method.icon className="h-5 w-5" />
                  <span className="text-xs">{method.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              className="flex-1" 
              onClick={handlePayment}
              disabled={addPayment.isPending}
            >
              {addPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {paymentMethod === 'smartpos' ? 'Enviar para Maquininha' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </div>

        {/* Smart POS Payment Dialog */}
        <SmartPOSPaymentDialog
          open={showSmartPOS}
          onOpenChange={setShowSmartPOS}
          amountCents={getPaymentAmount()}
          orderId={sessionId}
          onSuccess={handleSmartPOSSuccess}
          onCancel={() => setShowSmartPOS(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
