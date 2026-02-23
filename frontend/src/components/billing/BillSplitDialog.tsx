import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useBillSplit, SplitType, BillSplitParticipant } from '@/hooks/useBillSplit';
import { formatCurrency } from '@/lib/format';
import { Loader2, Users, Receipt, Pencil, Check, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface BillSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string;
  comandaId?: string;
  totalAmountCents: number;
}

const SPLIT_TYPES: { value: SplitType; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    value: 'equal', 
    label: 'Divisão Igual', 
    description: 'Dividir igualmente entre participantes',
    icon: <Users className="w-5 h-5" />
  },
  { 
    value: 'by_item', 
    label: 'Por Item', 
    description: 'Cada pessoa paga seus itens',
    icon: <Receipt className="w-5 h-5" />
  },
  { 
    value: 'custom', 
    label: 'Valor Personalizado', 
    description: 'Definir valor de cada pessoa',
    icon: <Pencil className="w-5 h-5" />
  },
];

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'cash', label: 'Dinheiro' },
];

export function BillSplitDialog({ 
  open, 
  onOpenChange, 
  orderId, 
  comandaId, 
  totalAmountCents 
}: BillSplitDialogProps) {
  const [step, setStep] = useState<'type' | 'config' | 'payment'>('type');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [numberOfSplits, setNumberOfSplits] = useState(2);
  const [customAmounts, setCustomAmounts] = useState<{ name: string; amountCents: number }[]>([]);

  const { billSplit, isLoading, createBillSplit, markParticipantPaid, deleteBillSplit } = useBillSplit(orderId, comandaId);

  const amountPerPerson = Math.floor(totalAmountCents / numberOfSplits);

  const handleCreateSplit = async () => {
    if (splitType === 'custom' && customAmounts.length > 0) {
      await createBillSplit.mutateAsync({
        orderId,
        comandaId,
        splitType,
        totalAmountCents,
        numberOfSplits: customAmounts.length,
        participants: customAmounts.map(c => ({
          name: c.name,
          amountCents: c.amountCents,
        })),
      });
    } else {
      await createBillSplit.mutateAsync({
        orderId,
        comandaId,
        splitType,
        totalAmountCents,
        numberOfSplits,
      });
    }
    setStep('payment');
  };

  const handlePayment = async (participantId: string, paymentMethod: string) => {
    await markParticipantPaid.mutateAsync({ participantId, paymentMethod });
  };

  const handleAddCustomAmount = () => {
    setCustomAmounts([...customAmounts, { name: `Pessoa ${customAmounts.length + 1}`, amountCents: 0 }]);
  };

  const handleUpdateCustomAmount = (index: number, field: 'name' | 'amountCents', value: string | number) => {
    const updated = [...customAmounts];
    if (field === 'amountCents') {
      updated[index].amountCents = Math.round(Number(value) * 100);
    } else {
      updated[index].name = value as string;
    }
    setCustomAmounts(updated);
  };

  const allPaid = billSplit?.participants?.every(p => p.paid);

  const renderStepType = () => (
    <div className="space-y-4">
      <RadioGroup value={splitType} onValueChange={(v) => setSplitType(v as SplitType)}>
        {SPLIT_TYPES.map((type) => (
          <div
            key={type.value}
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors",
              splitType === type.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            )}
            onClick={() => setSplitType(type.value)}
          >
            <RadioGroupItem value={type.value} id={type.value} />
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {type.icon}
            </div>
            <div className="flex-1">
              <Label htmlFor={type.value} className="font-medium cursor-pointer">{type.label}</Label>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </div>
          </div>
        ))}
      </RadioGroup>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={() => setStep('config')}>Continuar</Button>
      </div>
    </div>
  );

  const renderStepConfig = () => (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">Valor Total</p>
        <p className="text-2xl font-bold">{formatCurrency(totalAmountCents / 100)}</p>
      </div>

      {splitType === 'equal' && (
        <div className="space-y-3">
          <Label>Número de pessoas</Label>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setNumberOfSplits(Math.max(2, numberOfSplits - 1))}
            >
              -
            </Button>
            <span className="text-2xl font-bold w-12 text-center">{numberOfSplits}</span>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setNumberOfSplits(numberOfSplits + 1)}
            >
              +
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Cada pessoa paga: <strong>{formatCurrency(amountPerPerson / 100)}</strong>
          </p>
        </div>
      )}

      {splitType === 'custom' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Participantes</Label>
            <Button variant="outline" size="sm" onClick={handleAddCustomAmount}>
              + Adicionar
            </Button>
          </div>
          {customAmounts.map((ca, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Nome"
                value={ca.name}
                onChange={(e) => handleUpdateCustomAmount(index, 'name', e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Valor"
                value={(ca.amountCents / 100).toFixed(2)}
                onChange={(e) => handleUpdateCustomAmount(index, 'amountCents', e.target.value)}
                className="w-32"
              />
            </div>
          ))}
          {customAmounts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Adicione participantes para definir valores personalizados
            </p>
          )}
        </div>
      )}

      {splitType === 'by_item' && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-600">
            A divisão por item requer associar itens a cada participante. 
            Esta funcionalidade está disponível no terminal.
          </p>
        </div>
      )}

      <div className="flex justify-between gap-2 pt-4">
        <Button variant="outline" onClick={() => setStep('type')}>Voltar</Button>
        <Button 
          onClick={handleCreateSplit}
          disabled={createBillSplit.isPending || (splitType === 'custom' && customAmounts.length === 0)}
        >
          {createBillSplit.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Criar Divisão
        </Button>
      </div>
    </div>
  );

  const renderStepPayment = () => (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : billSplit ? (
        <>
          <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total da Conta</p>
              <p className="text-xl font-bold">{formatCurrency(billSplit.total_amount_cents / 100)}</p>
            </div>
            <Badge variant={allPaid ? 'default' : 'secondary'}>
              {allPaid ? 'Pago' : 'Pendente'}
            </Badge>
          </div>

          <div className="space-y-3">
            <Label>Participantes</Label>
            {billSplit.participants?.map((participant) => (
              <ParticipantPaymentRow
                key={participant.id}
                participant={participant}
                onPay={handlePayment}
                isLoading={markParticipantPaid.isPending}
              />
            ))}
          </div>

          {allPaid && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-600 font-medium">Conta totalmente paga!</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          Nenhuma divisão encontrada
        </p>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Dividir Conta
          </DialogTitle>
          <DialogDescription>
            {step === 'type' && 'Escolha como dividir a conta'}
            {step === 'config' && 'Configure a divisão'}
            {step === 'payment' && 'Registre os pagamentos'}
          </DialogDescription>
        </DialogHeader>

        {step === 'type' && renderStepType()}
        {step === 'config' && renderStepConfig()}
        {step === 'payment' && renderStepPayment()}
      </DialogContent>
    </Dialog>
  );
}

interface ParticipantPaymentRowProps {
  participant: BillSplitParticipant;
  onPay: (participantId: string, paymentMethod: string) => void;
  isLoading: boolean;
}

function ParticipantPaymentRow({ participant, onPay, isLoading }: ParticipantPaymentRowProps) {
  const [selectedMethod, setSelectedMethod] = useState('pix');

  return (
    <div className={cn(
      "p-3 rounded-lg border flex items-center gap-3",
      participant.paid ? "bg-green-500/5 border-green-500/20" : "bg-background"
    )}>
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
        {(participant.participant_name || 'P')[0].toUpperCase()}
      </div>
      <div className="flex-1">
        <p className="font-medium">{participant.participant_name || 'Participante'}</p>
        <p className="text-sm text-muted-foreground">{formatCurrency(participant.amount_cents / 100)}</p>
      </div>
      {participant.paid ? (
        <Badge variant="default" className="gap-1">
          <Check className="w-3 h-3" />
          {participant.payment_method?.toUpperCase()}
        </Badge>
      ) : (
        <div className="flex items-center gap-2">
          <Select value={selectedMethod} onValueChange={setSelectedMethod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            onClick={() => onPay(participant.id, selectedMethod)}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
