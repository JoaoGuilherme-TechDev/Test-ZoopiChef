import { useState } from 'react';
import { Banknote, CreditCard, Smartphone, Shuffle, Percent, Plus, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PDVPayment, SaleAdjustments } from '@/hooks/usePDVLoja';
import { cn } from '@/lib/utils';
import { PDVFinalizeButtons, FinalizeType } from './PDVFinalizeButtons';

interface Customer {
  id: string;
  name: string;
  cpf_cnpj?: string | null;
  email?: string | null;
  address?: string | null;
}

interface PDVPaymentPanelProps {
  cartSubtotal: number;
  cartTotal: number;
  paidTotal: number;
  remainingBalance: number;
  payments: PDVPayment[];
  adjustments: SaleAdjustments;
  serviceFeeValue: number;
  customer?: Customer | null;
  onAddPayment: (payment: PDVPayment) => void;
  onRemovePayment: (index: number) => void;
  onUpdateAdjustments: (updates: Partial<SaleAdjustments>) => void;
  onFinalize: (type: FinalizeType) => void;
  onCancel: () => void;
  onRequestCustomer: () => void;
  isLoading?: boolean;
}

type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito';

const paymentMethods: { key: PaymentMethod; label: string; icon: any; color: string }[] = [
  { key: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'bg-green-500' },
  { key: 'cartao_credito', label: 'Crédito', icon: CreditCard, color: 'bg-blue-500' },
  { key: 'cartao_debito', label: 'Débito', icon: CreditCard, color: 'bg-cyan-500' },
  { key: 'pix', label: 'PIX', icon: Smartphone, color: 'bg-purple-500' },
];

export function PDVPaymentPanel({
  cartSubtotal,
  cartTotal,
  paidTotal,
  remainingBalance,
  payments,
  adjustments,
  serviceFeeValue,
  customer,
  onAddPayment,
  onRemovePayment,
  onUpdateAdjustments,
  onFinalize,
  onCancel,
  onRequestCustomer,
  isLoading,
}: PDVPaymentPanelProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('dinheiro');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  
  // Estados para popover de desconto/acréscimo
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'value'>('percent');
  const [additionInput, setAdditionInput] = useState('');
  const [showDiscountPopover, setShowDiscountPopover] = useState(false);
  const [showAdditionPopover, setShowAdditionPopover] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setPaymentAmount(remainingBalance.toFixed(2));
    setCashReceived('');
    setShowPaymentDialog(true);
  };

  const handleConfirmPayment = () => {
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0) return;

    let change = 0;
    if (selectedMethod === 'dinheiro') {
      const received = parseFloat(cashReceived) || amount;
      change = Math.max(0, received - amount);
    }

    onAddPayment({
      method: selectedMethod,
      amount,
      change,
    });

    setShowPaymentDialog(false);
    setPaymentAmount('');
    setCashReceived('');
  };

  const handleApplyDiscount = () => {
    const value = parseFloat(discountInput) || 0;
    if (discountType === 'percent') {
      const discountInCents = Math.round((cartSubtotal * value) / 100);
      onUpdateAdjustments({ discountCents: discountInCents, discountPercent: value });
    } else {
      const valueInCents = Math.round(value * 100);
      const percent = cartSubtotal > 0 ? (valueInCents / cartSubtotal) * 100 : 0;
      onUpdateAdjustments({ discountCents: valueInCents, discountPercent: percent });
    }
    setShowDiscountPopover(false);
    setDiscountInput('');
  };

  const handleClearDiscount = () => {
    onUpdateAdjustments({ discountCents: 0, discountPercent: 0 });
    setShowDiscountPopover(false);
  };

  const handleApplyAddition = () => {
    const value = parseFloat(additionInput) || 0;
    const valueInCents = Math.round(value * 100);
    onUpdateAdjustments({ additionCents: valueInCents });
    setShowAdditionPopover(false);
    setAdditionInput('');
  };

  const handleClearAddition = () => {
    onUpdateAdjustments({ additionCents: 0 });
    setShowAdditionPopover(false);
  };

  const handleToggleServiceFee = (enabled: boolean) => {
    onUpdateAdjustments({ serviceFeeEnabled: enabled });
  };

  const canFinalize = cartTotal > 0 && remainingBalance <= 0.01;

  return (
    <div className="flex flex-col h-full p-4">
      {/* Resumo de valores */}
      <Card className="p-4 space-y-2 bg-muted/30">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(cartSubtotal)}</span>
        </div>
        
        {/* Desconto na conta */}
        {adjustments.discountCents > 0 && (
          <div className="flex justify-between text-sm text-red-500">
            <span>Desconto ({adjustments.discountPercent.toFixed(1)}%)</span>
            <span>-{formatPrice(adjustments.discountCents)}</span>
          </div>
        )}
        
        {/* Acréscimo */}
        {adjustments.additionCents > 0 && (
          <div className="flex justify-between text-sm text-blue-500">
            <span>Acréscimo</span>
            <span>+{formatPrice(adjustments.additionCents)}</span>
          </div>
        )}
        
        {/* Taxa de serviço */}
        {adjustments.serviceFeeEnabled && serviceFeeValue > 0 && (
          <div className="flex justify-between text-sm text-amber-600">
            <span>Taxa de serviço ({adjustments.serviceFeePercent}%)</span>
            <span>+{formatPrice(serviceFeeValue)}</span>
          </div>
        )}
        
        {payments.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1">
              {payments.map((payment, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {paymentMethods.find(m => m.key === payment.method)?.label || payment.method}
                    </Badge>
                    {payment.change && payment.change > 0 && (
                      <span className="text-xs text-muted-foreground">
                        (troco: {formatPrice(payment.change)})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">{formatPrice(payment.amount)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => onRemovePayment(index)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <Separator />

        <div className="flex justify-between">
          <span className="font-bold text-lg">TOTAL</span>
          <span className="font-bold text-lg">{formatPrice(cartTotal)}</span>
        </div>

        {remainingBalance > 0.01 && (
          <div className="flex justify-between text-destructive">
            <span className="font-medium">FALTA PAGAR</span>
            <span className="font-bold text-xl">{formatPrice(remainingBalance)}</span>
          </div>
        )}

        {remainingBalance <= 0.01 && cartTotal > 0 && (
          <div className="flex justify-between text-green-500">
            <span className="font-medium">✓ PAGO</span>
            <span className="font-bold text-xl">{formatPrice(paidTotal)}</span>
          </div>
        )}
      </Card>

      {/* Botões de Desconto, Acréscimo e Taxa de Serviço */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {/* Botão Desconto */}
        <Popover open={showDiscountPopover} onOpenChange={setShowDiscountPopover}>
          <PopoverTrigger asChild>
            <Button
              variant={adjustments.discountCents > 0 ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-10 text-xs",
                adjustments.discountCents > 0 && "bg-red-500 hover:bg-red-600"
              )}
            >
              <Percent className="h-3 w-3 mr-1" />
              Desconto
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-3">
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Desconto na Conta</h4>
                {adjustments.discountCents > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    -{adjustments.discountPercent.toFixed(1)}% ({formatPrice(adjustments.discountCents / 100)})
                  </Badge>
                )}
              </div>
              
              <Tabs value={discountType} onValueChange={(v) => setDiscountType(v as 'percent' | 'value')}>
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="percent" className="text-xs">%</TabsTrigger>
                  <TabsTrigger value="value" className="text-xs">R$</TabsTrigger>
                </TabsList>

                <TabsContent value="percent" className="mt-2">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder="0"
                      className="h-9 text-center"
                    />
                    <span className="flex items-center text-muted-foreground">%</span>
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {[5, 10, 15, 20].map((p) => (
                      <Button
                        key={p}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => setDiscountInput(p.toString())}
                      >
                        {p}%
                      </Button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="value" className="mt-2">
                  <div className="flex gap-2">
                    <span className="flex items-center text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder="0,00"
                      className="h-9 text-center"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2">
                {adjustments.discountCents > 0 && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleClearDiscount}>
                    Limpar
                  </Button>
                )}
                <Button size="sm" className="flex-1" onClick={handleApplyDiscount}>
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Botão Acréscimo */}
        <Popover open={showAdditionPopover} onOpenChange={setShowAdditionPopover}>
          <PopoverTrigger asChild>
            <Button
              variant={adjustments.additionCents > 0 ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-10 text-xs",
                adjustments.additionCents > 0 && "bg-blue-500 hover:bg-blue-600"
              )}
            >
              <Plus className="h-3 w-3 mr-1" />
              Acréscimo
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="center">
            <div className="space-y-3">
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Acréscimo na Conta</h4>
                {adjustments.additionCents > 0 && (
                  <Badge className="bg-blue-500 text-xs">
                    +{formatPrice(adjustments.additionCents / 100)}
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <span className="flex items-center text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={additionInput}
                  onChange={(e) => setAdditionInput(e.target.value)}
                  placeholder="0,00"
                  className="h-9 text-center"
                />
              </div>

              <div className="flex gap-2">
                {adjustments.additionCents > 0 && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleClearAddition}>
                    Limpar
                  </Button>
                )}
                <Button size="sm" className="flex-1" onClick={handleApplyAddition}>
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Toggle Taxa de Serviço */}
        <Button
          variant={adjustments.serviceFeeEnabled ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-10 text-xs",
            adjustments.serviceFeeEnabled && "bg-amber-500 hover:bg-amber-600"
          )}
          onClick={() => handleToggleServiceFee(!adjustments.serviceFeeEnabled)}
        >
          <DollarSign className="h-3 w-3 mr-1" />
          {adjustments.serviceFeePercent}% Taxa
        </Button>
      </div>

      {/* Botões de pagamento */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {paymentMethods.map((method) => (
          <Button
            key={method.key}
            variant="outline"
            className={cn(
              "h-16 flex flex-col gap-1 hover:border-primary",
              remainingBalance <= 0.01 && "opacity-50"
            )}
            disabled={remainingBalance <= 0.01}
            onClick={() => handleSelectMethod(method.key)}
          >
            <method.icon className="h-5 w-5" />
            <span className="text-sm">{method.label}</span>
          </Button>
        ))}
      </div>

      {/* Pagamento múltiplo */}
      <Button
        variant="outline"
        className="mt-3 h-12"
        disabled={remainingBalance <= 0.01}
        onClick={() => handleSelectMethod('dinheiro')}
      >
        <Shuffle className="h-4 w-4 mr-2" />
        Receber Parcial
      </Button>

      {/* Espaço flexível */}
      <div className="flex-1" />

      {/* Ações finais */}
      <div className="space-y-3 mt-4">
        <PDVFinalizeButtons
          canFinalize={canFinalize}
          isLoading={isLoading}
          customer={customer}
          onFinalize={onFinalize}
          onRequestCustomer={onRequestCustomer}
        />

        <Button
          variant="destructive"
          size="lg"
          className="w-full h-12"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar Venda
        </Button>
      </div>

      {/* Dialog de pagamento */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(() => {
                const method = paymentMethods.find(m => m.key === selectedMethod);
                const Icon = method?.icon || Banknote;
                return <Icon className="h-5 w-5" />;
              })()}
              Pagamento em {paymentMethods.find(m => m.key === selectedMethod)?.label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Valor a receber</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="h-12 text-lg text-center"
                autoFocus
              />
              <p className="text-sm text-muted-foreground mt-1">
                Restante: {formatPrice(remainingBalance)}
              </p>
            </div>

            {selectedMethod === 'dinheiro' && (
              <div>
                <Label>Valor recebido (para troco)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="h-12 text-lg text-center"
                  placeholder="Opcional"
                />
                {cashReceived && parseFloat(cashReceived) > parseFloat(paymentAmount || '0') && (
                  <p className="text-sm text-green-500 mt-1">
                    Troco: {formatPrice(parseFloat(cashReceived) - parseFloat(paymentAmount || '0'))}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmPayment}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
