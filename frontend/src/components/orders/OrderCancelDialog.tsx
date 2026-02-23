import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { OrderStatus } from '@/hooks/useOrders';

const CANCEL_REASONS = [
  { value: 'cliente_desistiu', label: 'Cliente desistiu' },
  { value: 'produto_indisponivel', label: 'Produto indisponível' },
  { value: 'erro_pedido', label: 'Erro no pedido' },
  { value: 'problema_pagamento', label: 'Problema no pagamento' },
  { value: 'tempo_excedido', label: 'Tempo de espera excedido' },
  { value: 'endereco_nao_atendido', label: 'Endereço não atendido' },
  { value: 'outro', label: 'Outro motivo' },
];

interface OrderCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber?: string;
  orderStatus: OrderStatus;
  onSuccess?: () => void;
}

export function OrderCancelDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  orderStatus,
  onSuccess,
}: OrderCancelDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [confirmExtra, setConfirmExtra] = useState(false);
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  // Regras de negócio por status
  const isDelivered = orderStatus === 'entregue';
  const isInRoute = orderStatus === 'em_rota';
  const requiresExtraConfirmation = isInRoute;
  const cannotCancel = isDelivered;

  const cancelOrder = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Usuário não identificado');
      if (!profile?.company_id) throw new Error('Empresa não identificada');
      
      const reason = selectedReason === 'outro' 
        ? customReason 
        : CANCEL_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;

      if (!reason.trim()) {
        throw new Error('Informe o motivo do cancelamento');
      }

      // Update order with cancel info
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'cancelado' as any,
          cancelled_at: new Date().toISOString(),
          cancelled_by: profile.id,
          cancel_reason: reason,
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Log to order_status_events with full audit trail
      const { error: eventError } = await supabase
        .from('order_status_events')
        .insert({
          order_id: orderId,
          company_id: profile.company_id,
          from_status: orderStatus,
          to_status: 'cancelado',
          changed_by_user_id: profile.id,
          meta: {
            source: 'manual_cancel',
            reason: reason,
            reason_code: selectedReason,
            previous_status: orderStatus,
            required_extra_confirmation: requiresExtraConfirmation,
          },
        });

      if (eventError) {
        console.error('Erro ao registrar evento:', eventError);
        // Don't fail the cancellation if event logging fails
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Pedido cancelado com sucesso');
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao cancelar pedido');
    },
  });

  const resetForm = () => {
    setSelectedReason('');
    setCustomReason('');
    setConfirmExtra(false);
  };

  const handleCancel = () => {
    if (!selectedReason) {
      toast.error('Selecione um motivo para o cancelamento');
      return;
    }
    if (selectedReason === 'outro' && !customReason.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }
    if (requiresExtraConfirmation && !confirmExtra) {
      toast.error('Confirme que deseja cancelar o pedido em rota');
      return;
    }
    cancelOrder.mutate();
  };

  if (cannotCancel) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Cancelamento Não Permitido
            </DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Não é possível cancelar um pedido já entregue. 
              Para estornos, utilize o módulo financeiro.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancelar Pedido {orderNumber ? `#${orderNumber}` : ''}
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. Informe o motivo do cancelamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {requiresExtraConfirmation && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Este pedido está em rota de entrega. 
                O entregador deve ser notificado sobre o cancelamento.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Label className="text-base font-semibold">Motivo do Cancelamento *</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {CANCEL_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="font-normal cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === 'outro' && (
            <div className="space-y-2">
              <Label htmlFor="customReason">Descreva o motivo *</Label>
              <Textarea
                id="customReason"
                placeholder="Descreva o motivo do cancelamento..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}

          {requiresExtraConfirmation && (
            <div className="flex items-start space-x-2 p-3 bg-destructive/10 rounded-lg">
              <input
                type="checkbox"
                id="confirmExtra"
                checked={confirmExtra}
                onChange={(e) => setConfirmExtra(e.target.checked)}
                className="mt-1"
              />
              <Label htmlFor="confirmExtra" className="font-normal cursor-pointer text-sm">
                Confirmo que desejo cancelar este pedido em rota e entendo que o 
                entregador deve ser notificado.
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelOrder.isPending || !selectedReason || (requiresExtraConfirmation && !confirmExtra)}
          >
            {cancelOrder.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Confirmar Cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
