import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2, XCircle, RotateCcw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

interface AccountCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountDescription: string;
  isPaid: boolean;
  onSuccess?: () => void;
}

export function AccountCancelDialog({
  open,
  onOpenChange,
  accountId,
  accountDescription,
  isPaid,
  onSuccess,
}: AccountCancelDialogProps) {
  const [reason, setReason] = useState('');
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const cancelAccount = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Usuário não identificado');
      if (!reason.trim()) throw new Error('Informe o motivo');

      if (isPaid) {
        // Estorno - apenas registrar o cancelamento com status especial
        const { error } = await supabase
          .from('accounts_payable')
          .update({
            status: 'estornado',
            cancelled_at: new Date().toISOString(),
            cancelled_by: profile.id,
            cancel_reason: `ESTORNO: ${reason}`,
          })
          .eq('id', accountId);

        if (error) throw error;
        return { type: 'estorno' };
      } else {
        // Conta aberta - pode cancelar
        const { error } = await supabase
          .from('accounts_payable')
          .update({
            status: 'cancelado',
            cancelled_at: new Date().toISOString(),
            cancelled_by: profile.id,
            cancel_reason: reason,
          })
          .eq('id', accountId);

        if (error) throw error;
        return { type: 'cancelamento' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      if (result.type === 'estorno') {
        toast.success('Conta estornada com sucesso');
      } else {
        toast.success('Conta cancelada com sucesso');
      }
      onOpenChange(false);
      setReason('');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao processar');
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            {isPaid ? (
              <>
                <RotateCcw className="h-5 w-5" />
                Estornar Conta
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5" />
                Cancelar Conta
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {isPaid 
                ? `Esta conta já foi paga. Deseja estornar?`
                : `Deseja cancelar a conta?`
              }
            </p>
            <p className="font-medium">{accountDescription}</p>
            {isPaid && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-500 text-sm">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                O estorno será registrado para fins de auditoria. 
                Ajustes financeiros devem ser feitos manualmente.
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reason" className="font-semibold">
            Motivo {isPaid ? 'do estorno' : 'do cancelamento'} *
          </Label>
          <Textarea
            id="reason"
            placeholder={isPaid ? "Descreva o motivo do estorno..." : "Descreva o motivo do cancelamento..."}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={() => cancelAccount.mutate()}
            disabled={cancelAccount.isPending || !reason.trim()}
          >
            {cancelAccount.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : isPaid ? (
              <RotateCcw className="h-4 w-4 mr-2" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            {isPaid ? 'Confirmar Estorno' : 'Confirmar Cancelamento'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
