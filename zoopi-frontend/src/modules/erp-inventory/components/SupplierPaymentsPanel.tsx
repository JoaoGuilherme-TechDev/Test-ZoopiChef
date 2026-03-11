import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Check, X, AlertTriangle, DollarSign } from 'lucide-react';
import { useSupplierPayments, SupplierPayment } from '../hooks/useSupplierPayments';

interface SupplierPaymentsPanelProps {
  supplierId?: string;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function getStatusBadge(payment: SupplierPayment) {
  const dueDate = new Date(payment.due_date);

  if (payment.status === 'paid') {
    return <Badge variant="default" className="bg-green-500">Pago</Badge>;
  }
  if (payment.status === 'cancelled') {
    return <Badge variant="secondary">Cancelado</Badge>;
  }
  if (isPast(dueDate) && !isToday(dueDate)) {
    return <Badge variant="destructive">Vencido</Badge>;
  }
  if (isToday(dueDate)) {
    return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Vence Hoje</Badge>;
  }
  return <Badge variant="outline">Pendente</Badge>;
}

export function SupplierPaymentsPanel({ supplierId }: SupplierPaymentsPanelProps) {
  const { payments, isLoading, markAsPaid, cancelPayment, totalPending, pendingPayments } = useSupplierPayments(supplierId);
  const [payDialog, setPayDialog] = useState<SupplierPayment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');

  const handlePay = async () => {
    if (!payDialog || !paymentMethod) return;
    await markAsPaid.mutateAsync({ id: payDialog.id, paymentMethod });
    setPayDialog(null);
    setPaymentMethod('');
  };

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Pagamentos
        </CardTitle>
        {pendingPayments.length > 0 && (
          <Badge variant="outline" className="text-sm">
            {pendingPayments.length} pendente(s) - {formatCurrency(totalPending)}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {!payments?.length ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Nenhum pagamento registrado
          </p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{formatCurrency(payment.amount_cents)}</p>
                    <p className="text-sm text-muted-foreground">
                      Vence: {format(new Date(payment.due_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    {payment.paid_at && (
                      <p className="text-xs text-green-600">
                        Pago em {format(new Date(payment.paid_at), "dd/MM/yyyy", { locale: ptBR })}
                        {payment.payment_method && ` via ${payment.payment_method}`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(payment)}
                  {payment.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPayDialog(payment)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelPayment.mutate(payment.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pay Dialog */}
        <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Pagamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">
                  {payDialog && formatCurrency(payDialog.amount_cents)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Vencimento: {payDialog && format(new Date(payDialog.due_date), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Cartão">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPayDialog(null)}>
                  Cancelar
                </Button>
                <Button onClick={handlePay} disabled={!paymentMethod || markAsPaid.isPending}>
                  Confirmar Pagamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
