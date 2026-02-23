import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Smartphone, CreditCard, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useSmartPOSDevices, useSendToSmartPOS, useSmartPOSRealtimeUpdates, SmartPOSPendingTransaction } from '@/hooks/useSmartPOS';
import { toast } from 'sonner';

interface SmartPOSPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountCents: number;
  orderId?: string;
  tableSessionId?: string;
  comandaId?: string;
  onSuccess?: (transaction: SmartPOSPendingTransaction) => void;
  onCancel?: () => void;
}

const PAYMENT_METHODS = [
  { value: 'credit', label: 'Crédito' },
  { value: 'debit', label: 'Débito' },
  { value: 'pix', label: 'PIX' },
  { value: 'voucher', label: 'Voucher' },
];

const INSTALLMENTS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: i === 0 ? 'À vista' : `${i + 1}x`,
}));

type PaymentStatus = 'idle' | 'sending' | 'waiting' | 'approved' | 'declined' | 'cancelled';

export function SmartPOSPaymentDialog({
  open,
  onOpenChange,
  amountCents,
  orderId,
  tableSessionId,
  comandaId,
  onSuccess,
  onCancel,
}: SmartPOSPaymentDialogProps) {
  const { data: devices, isLoading: devicesLoading } = useSmartPOSDevices();
  const sendToSmartPOS = useSendToSmartPOS();

  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'pix' | 'voucher'>('credit');
  const [installments, setInstallments] = useState<number>(1);
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null);

  const activeDevices = devices?.filter((d) => d.is_active) || [];

  const handleTransactionUpdate = useCallback((transaction: SmartPOSPendingTransaction) => {
    if (transaction.id === currentTransactionId) {
      if (transaction.status === 'approved') {
        setStatus('approved');
        onSuccess?.(transaction);
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } else if (transaction.status === 'declined') {
        setStatus('declined');
      } else if (transaction.status === 'cancelled') {
        setStatus('cancelled');
      }
    }
  }, [currentTransactionId, onSuccess, onOpenChange]);

  const { setupSubscription } = useSmartPOSRealtimeUpdates(handleTransactionUpdate);

  // Setup realtime subscription when dialog opens
  useEffect(() => {
    if (open && currentTransactionId) {
      const channel = setupSubscription();
      return () => {
        channel?.unsubscribe();
      };
    }
  }, [open, currentTransactionId, setupSubscription]);

  // Auto-select first device if only one exists
  useEffect(() => {
    if (activeDevices.length === 1 && !selectedDevice) {
      setSelectedDevice(activeDevices[0].id);
    }
  }, [activeDevices, selectedDevice]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStatus('idle');
      setCurrentTransactionId(null);
      setPaymentMethod('credit');
      setInstallments(1);
    }
  }, [open]);

  const handleSend = async () => {
    if (!selectedDevice) {
      toast.error('Selecione uma maquininha');
      return;
    }

    setStatus('sending');

    try {
      const result = await sendToSmartPOS.mutateAsync({
        deviceId: selectedDevice,
        amountCents,
        paymentMethod,
        installments: paymentMethod === 'credit' ? installments : 1,
        orderId,
        tableSessionId,
        comandaId,
      });

      setCurrentTransactionId(result.id);
      setStatus('waiting');
    } catch {
      setStatus('idle');
    }
  };

  const handleCancel = () => {
    setStatus('idle');
    setCurrentTransactionId(null);
    onCancel?.();
    onOpenChange(false);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const renderContent = () => {
    switch (status) {
      case 'sending':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-lg font-medium">Enviando para maquininha...</p>
          </div>
        );

      case 'waiting':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="relative">
              <Smartphone className="w-16 h-16 text-primary" />
              <RefreshCw className="w-6 h-6 text-primary absolute -bottom-1 -right-1 animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Aguardando pagamento</p>
              <p className="text-sm text-muted-foreground">
                Passe o cartão na maquininha
              </p>
              <Badge variant="outline" className="text-lg font-bold">
                {formatCurrency(amountCents)}
              </Badge>
            </div>
            <Button variant="outline" onClick={handleCancel} className="mt-4">
              Cancelar
            </Button>
          </div>
        );

      case 'approved':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <p className="text-lg font-medium text-green-600">Pagamento Aprovado!</p>
            <Badge variant="outline" className="text-lg font-bold bg-green-500/10 text-green-700 border-green-300">
              {formatCurrency(amountCents)}
            </Badge>
          </div>
        );

      case 'declined':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <XCircle className="w-16 h-16 text-red-500" />
            <p className="text-lg font-medium text-red-600">Pagamento Recusado</p>
            <p className="text-sm text-muted-foreground">
              Tente novamente ou use outro cartão
            </p>
            <Button onClick={() => setStatus('idle')}>
              Tentar Novamente
            </Button>
          </div>
        );

      case 'cancelled':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <XCircle className="w-16 h-16 text-gray-500" />
            <p className="text-lg font-medium text-gray-600">Transação Cancelada</p>
            <Button onClick={() => setStatus('idle')}>
              Tentar Novamente
            </Button>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            {/* Amount Display */}
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Valor a cobrar</p>
              <p className="text-3xl font-bold">{formatCurrency(amountCents)}</p>
            </div>

            {/* Device Selection */}
            <div className="space-y-2">
              <Label>Maquininha</Label>
              {devicesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : activeDevices.length === 0 ? (
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma maquininha ativa.{' '}
                    <a href="/settings/smartpos" className="text-primary underline">
                      Configure aqui
                    </a>
                  </p>
                </div>
              ) : (
                <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a maquininha" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDevices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4" />
                          <span>{device.device_name || device.device_serial}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Installments (only for credit) */}
            {paymentMethod === 'credit' && (
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Select value={String(installments)} onValueChange={(v) => setInstallments(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTALLMENTS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                        {Number(option.value) > 1 && (
                          <span className="ml-2 text-muted-foreground">
                            ({formatCurrency(amountCents / Number(option.value))}/mês)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleSend} 
                disabled={!selectedDevice || activeDevices.length === 0}
                className="flex-1"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Enviar para Maquininha
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Pagamento Smart POS
          </DialogTitle>
          <DialogDescription>
            Envie o pagamento para a maquininha
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
