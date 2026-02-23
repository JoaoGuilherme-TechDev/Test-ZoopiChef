import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Loader2, Printer, ShieldCheck, Receipt, TrendingUp, CreditCard, Banknote, XCircle, Edit, Save, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-shim';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { CashSessionHistory, useCashSessionDetail } from '@/hooks/useCashHistory';
import { useCompany } from '@/hooks/useCompany';
import { useProfile } from '@/hooks/useProfile';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CashSessionEditDialogProps {
  sessionId: string | null;
  onClose: () => void;
  onReprint: (session: CashSessionHistory) => void;
  onReview: (sessionId: string, action: 'approved' | 'rejected') => void;
}

interface PaymentAdjustment {
  fromMethod: string;
  toMethod: string;
  amount: number;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão Crédito',
  cartao_debito: 'Cartão Débito',
  fiado: 'Fiado',
  outros: 'Outros',
};

export function CashSessionEditDialog({
  sessionId,
  onClose,
  onReprint,
  onReview,
}: CashSessionEditDialogProps) {
  const { data: company } = useCompany();
  const { data: profile } = useProfile();
  const { accounts: chartAccounts } = useChartOfAccounts();
  const queryClient = useQueryClient();
  
  const {
    session: selectedSession,
    adjustments: sessionAdjustments,
    auditLogs: sessionAuditLogs,
    isLoading: isLoadingDetail,
    refetch,
  } = useCashSessionDetail(sessionId);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedPayments, setEditedPayments] = useState<Record<string, { count: number; total: number }>>({});
  const [paymentAdjustments, setPaymentAdjustments] = useState<PaymentAdjustment[]>([]);
  const [differenceChartAccountId, setDifferenceChartAccountId] = useState<string>('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [markAsReviewed, setMarkAsReviewed] = useState(false);

  // Get expense and income accounts for shortage/surplus
  const expenseAccounts = chartAccounts.filter(a => a.account_type === 'expense' && a.is_active);
  const incomeAccounts = chartAccounts.filter(a => a.account_type === 'income' && a.is_active);

  // Initialize edited payments when session loads
  useEffect(() => {
    if (selectedSession?.payments_summary) {
      setEditedPayments(JSON.parse(JSON.stringify(selectedSession.payments_summary)));
    } else {
      setEditedPayments({});
    }
    setPaymentAdjustments([]);
    setDifferenceChartAccountId('');
    setAdjustmentNotes('');
    setIsEditing(false);
    setMarkAsReviewed(false);
  }, [selectedSession?.id]);

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getReviewBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Conferido</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Não Conferido</Badge>;
      default:
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pendente</Badge>;
    }
  };

  const addPaymentAdjustment = () => {
    setPaymentAdjustments([...paymentAdjustments, { fromMethod: '', toMethod: '', amount: 0 }]);
  };

  const updatePaymentAdjustment = (index: number, field: keyof PaymentAdjustment, value: string | number) => {
    const updated = [...paymentAdjustments];
    updated[index] = { ...updated[index], [field]: value };
    setPaymentAdjustments(updated);
  };

  const removePaymentAdjustment = (index: number) => {
    setPaymentAdjustments(paymentAdjustments.filter((_, i) => i !== index));
  };

  // Update payment value directly
  const updatePaymentValue = (method: string, field: 'total' | 'count', value: number) => {
    setEditedPayments(prev => ({
      ...prev,
      [method]: {
        ...prev[method],
        [field]: value,
      },
    }));
  };

  const calculateAdjustedPayments = () => {
    // Start with edited payments (which may have direct edits)
    const adjusted = JSON.parse(JSON.stringify(editedPayments));
    
    // Apply transfer adjustments
    paymentAdjustments.forEach(adj => {
      if (adj.fromMethod && adj.toMethod && adj.amount > 0) {
        if (adjusted[adj.fromMethod]) {
          adjusted[adj.fromMethod].total -= adj.amount;
        }
        if (!adjusted[adj.toMethod]) {
          adjusted[adj.toMethod] = { count: 0, total: 0 };
        }
        adjusted[adj.toMethod].total += adj.amount;
      }
    });

    return adjusted;
  };

  // Check if difference requires chart account selection
  const hasDifference = selectedSession?.difference !== null && 
                         selectedSession?.difference !== undefined && 
                         Math.abs(selectedSession.difference) > 0.01;

  // Check if we can proceed with review
  const canMarkAsReviewed = !hasDifference || differenceChartAccountId;

  const handleSaveAdjustments = async (shouldMarkReviewed: boolean = false) => {
    if (!selectedSession || !company?.id || !profile?.id) return;

    // Validate chart account if there's a difference
    if (hasDifference && shouldMarkReviewed && !differenceChartAccountId) {
      toast.error('Selecione o plano de contas para a diferença de caixa');
      return;
    }

    setIsSaving(true);
    try {
      const adjustedPayments = calculateAdjustedPayments();
      
      // Update payments_summary
      const { error: updateError } = await supabase
        .from('cash_sessions')
        .update({
          payments_summary: adjustedPayments,
        })
        .eq('id', selectedSession.id);

      if (updateError) throw updateError;

      // If there's a difference and chart account selected, create adjustment
      if (hasDifference && differenceChartAccountId) {
        const adjustmentType = selectedSession.difference! > 0 ? 'sobra' : 'falta';

        // Check if adjustment already exists
        const { data: existingAdj } = await supabase
          .from('cash_adjustments')
          .select('id')
          .eq('cash_session_id', selectedSession.id)
          .eq('adjustment_type', adjustmentType)
          .maybeSingle();

        if (!existingAdj) {
          const { error: adjError } = await supabase
            .from('cash_adjustments')
            .insert({
              company_id: company.id,
              cash_session_id: selectedSession.id,
              adjustment_type: adjustmentType,
              amount: Math.abs(selectedSession.difference!),
              reason: adjustmentNotes || `${adjustmentType === 'sobra' ? 'Sobra' : 'Falta'} de caixa - ajuste manual`,
              created_by: profile.id,
              chart_account_id: differenceChartAccountId,
            });

          if (adjError) throw adjError;
        }
      }

      // Log payment adjustments in audit
      const changesDetails: any = {};
      
      // Check if payments were edited
      const originalPayments = selectedSession.payments_summary || {};
      const hasPaymentChanges = Object.entries(adjustedPayments).some(([key, val]: [string, any]) => {
        const orig = (originalPayments as any)[key];
        return !orig || orig.total !== val.total || orig.count !== val.count;
      });

      if (hasPaymentChanges) {
        changesDetails.payment_adjustments = paymentAdjustments;
        changesDetails.edited_payments = adjustedPayments;
      }
      
      if (differenceChartAccountId) {
        changesDetails.chart_account_linked = differenceChartAccountId;
      }

      if (Object.keys(changesDetails).length > 0 || adjustmentNotes) {
        const { error: auditError } = await supabase
          .from('cash_session_audit_logs')
          .insert([{
            company_id: company.id,
            cash_session_id: selectedSession.id,
            action: 'payment_adjustment',
            performed_by: profile.id,
            details: {
              ...changesDetails,
              notes: adjustmentNotes,
            } as any,
          }]);

        if (auditError) console.error('Failed to create audit log:', auditError);
      }

      // Mark as reviewed if requested
      if (shouldMarkReviewed) {
        const { error: reviewError } = await supabase
          .from('cash_sessions')
          .update({
            review_status: 'approved',
            reviewed_by: profile.id,
            reviewed_at: new Date().toISOString(),
            review_notes: adjustmentNotes || 'Conferido após ajustes',
          })
          .eq('id', selectedSession.id);

        if (reviewError) throw reviewError;

        // Log review action
        await supabase
          .from('cash_session_audit_logs')
          .insert([{
            company_id: company.id,
            cash_session_id: selectedSession.id,
            action: 'review_approved',
            performed_by: profile.id,
            details: { review_notes: adjustmentNotes },
          }]);

        toast.success('Caixa conferido e aprovado com sucesso!');
      } else {
        toast.success('Ajustes salvos com sucesso');
      }

      queryClient.invalidateQueries({ queryKey: ['cash-history'] });
      queryClient.invalidateQueries({ queryKey: ['cash-session-detail', selectedSession.id] });
      queryClient.invalidateQueries({ queryKey: ['cash-adjustments'] });
      refetch();
      setIsEditing(false);
      setPaymentAdjustments([]);
      
      if (shouldMarkReviewed) {
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar ajustes');
    } finally {
      setIsSaving(false);
    }
  };

  if (!sessionId) return null;

  return (
    <Dialog open={!!sessionId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Detalhes do Caixa
            {selectedSession?.status === 'closed' && selectedSession.review_status !== 'approved' && (
              <Button
                size="sm"
                variant={isEditing ? 'default' : 'outline'}
                className="ml-4"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-4 w-4 mr-1" />
                {isEditing ? 'Cancelar Edição' : 'Editar'}
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            {selectedSession?.opened_at && (
              <>Aberto em {format(new Date(selectedSession.opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoadingDetail ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : selectedSession && (
          <div className="space-y-6">
            {/* Status and Review */}
            <div className="flex items-center gap-4">
              <Badge variant={selectedSession.status === 'open' ? 'default' : 'secondary'}>
                {selectedSession.status === 'open' ? 'Aberto' : 'Fechado'}
              </Badge>
              {selectedSession.status === 'closed' && getReviewBadge(selectedSession.review_status)}
              {selectedSession.review_notes && (
                <span className="text-sm text-muted-foreground">
                  Obs: {selectedSession.review_notes}
                </span>
              )}
            </div>

            {/* Period Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Período</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Abertura:</span>
                  <p className="font-medium">{format(new Date(selectedSession.opened_at), "dd/MM/yyyy HH:mm")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fechamento:</span>
                  <p className="font-medium">
                    {selectedSession.closed_at 
                      ? format(new Date(selectedSession.closed_at), "dd/MM/yyyy HH:mm")
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Operador Abertura:</span>
                  <p className="font-medium">{selectedSession.opened_by_profile?.full_name || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Operador Fechamento:</span>
                  <p className="font-medium">{selectedSession.closed_by_profile?.full_name || '-'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Receita Total</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(selectedSession.total_revenue)}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                  <p className="text-xl font-bold text-blue-600">{selectedSession.total_orders || 0}</p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(selectedSession.avg_ticket)}</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Taxa Entrega</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(selectedSession.delivery_fee_total)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods - Editable */}
            {selectedSession.payments_summary && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Recebimentos por Forma de Pagamento
                    {isEditing && (
                      <Badge variant="outline" className="ml-2 text-xs bg-yellow-500/10 border-yellow-500 text-yellow-600">
                        Modo Edição
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Direct editing of payment values */}
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(editedPayments).map(([method, data]: [string, any]) => (
                          <div key={method} className="p-3 rounded-lg bg-muted/50 border-2 border-dashed border-primary/30 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase">
                              {PAYMENT_METHOD_LABELS[method] || method}
                            </p>
                            <div className="space-y-1">
                              <Label className="text-xs">Valor (R$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="h-8"
                                value={data.total || 0}
                                onChange={(e) => updatePaymentValue(method, 'total', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Qtd Pedidos</Label>
                              <Input
                                type="number"
                                min="0"
                                className="h-8"
                                value={data.count || 0}
                                onChange={(e) => updatePaymentValue(method, 'count', parseInt(e.target.value) || 0)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Transfer adjustments */}
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4" />
                            Transferir entre Formas de Pagamento
                          </h4>
                          <Button size="sm" variant="outline" onClick={addPaymentAdjustment}>
                            + Adicionar Transferência
                          </Button>
                        </div>

                        {paymentAdjustments.map((adj, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                            <div className="flex-1">
                              <Label className="text-xs">De</Label>
                              <Select
                                value={adj.fromMethod}
                                onValueChange={(v) => updatePaymentAdjustment(index, 'fromMethod', v)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs">Para</Label>
                              <Select
                                value={adj.toMethod}
                                onValueChange={(v) => updatePaymentAdjustment(index, 'toMethod', v)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="w-32">
                              <Label className="text-xs">Valor</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="h-8"
                                value={adj.amount || ''}
                                onChange={(e) => updatePaymentAdjustment(index, 'amount', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive mt-4"
                              onClick={() => removePaymentAdjustment(index)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {Object.entries(selectedSession.payments_summary).map(([method, data]: [string, any]) => (
                        <div key={method} className="p-3 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground capitalize">{PAYMENT_METHOD_LABELS[method] || method}</p>
                          <p className="font-bold">{formatCurrency(data.total)}</p>
                          <p className="text-xs text-muted-foreground">{data.count} pedidos</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cash Reconciliation */}
            <Card className={cn(
              "border-2",
              selectedSession.difference === 0 && "border-green-500/50",
              selectedSession.difference && selectedSession.difference > 0 && "border-green-500/50",
              selectedSession.difference && selectedSession.difference < 0 && "border-red-500/50"
            )}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Conferência de Caixa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Troco Inicial</p>
                    <p className="text-lg font-bold">{formatCurrency(selectedSession.opening_balance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Esperado</p>
                    <p className="text-lg font-bold">{formatCurrency(selectedSession.expected_balance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dinheiro Contado</p>
                    <p className="text-lg font-bold">{formatCurrency(selectedSession.closing_balance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Diferença</p>
                    <p className={cn(
                      "text-lg font-bold",
                      selectedSession.difference === 0 && "text-green-600",
                      selectedSession.difference && selectedSession.difference > 0 && "text-green-600",
                      selectedSession.difference && selectedSession.difference < 0 && "text-red-600"
                    )}>
                      {selectedSession.difference !== null && selectedSession.difference !== undefined
                        ? `${selectedSession.difference >= 0 ? '+' : ''}${formatCurrency(selectedSession.difference)}`
                        : '-'
                      }
                    </p>
                    {selectedSession.difference !== 0 && selectedSession.difference !== null && (
                      <Badge variant={selectedSession.difference > 0 ? 'default' : 'destructive'} className="mt-1">
                        {selectedSession.difference > 0 ? 'SOBRA' : 'FALTA'}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Motivo Diferença</p>
                    <p className="text-sm">{selectedSession.difference_reason || '-'}</p>
                  </div>
                </div>

                {/* Chart account selection for difference - REQUIRED when has difference */}
                {hasDifference && (
                  <div className={cn(
                    "pt-4 border-t space-y-4",
                    !isEditing && "opacity-75"
                  )}>
                    <div className="flex items-center gap-2">
                      <AlertCircle className={cn(
                        "h-4 w-4",
                        selectedSession.difference! > 0 ? "text-green-600" : "text-red-600"
                      )} />
                      <h4 className="text-sm font-medium">
                        {selectedSession.difference! > 0 ? 'Sobra' : 'Falta'} de Caixa - Vincular ao Plano de Contas
                        <span className="text-red-500 ml-1">*</span>
                      </h4>
                    </div>
                    
                    {!isEditing && (
                      <Alert variant="destructive" className="bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-300">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Para conferir este caixa, clique em "Editar" e vincule a diferença ao plano de contas.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {isEditing && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            Conta Contábil
                            <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={differenceChartAccountId}
                            onValueChange={setDifferenceChartAccountId}
                          >
                            <SelectTrigger className={cn(!differenceChartAccountId && "border-red-500")}>
                              <SelectValue placeholder="Selecione a conta (obrigatório)" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedSession.difference! > 0 ? (
                                <>
                                  <SelectItem value="__header_income" disabled className="font-bold text-muted-foreground">
                                    Receitas (Sobra)
                                  </SelectItem>
                                  {incomeAccounts.length === 0 ? (
                                    <SelectItem value="__empty" disabled className="text-muted-foreground">
                                      Nenhuma conta de receita cadastrada
                                    </SelectItem>
                                  ) : (
                                    incomeAccounts.map((account) => (
                                      <SelectItem key={account.id} value={account.id}>
                                        {account.code} - {account.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </>
                              ) : (
                                <>
                                  <SelectItem value="__header_expense" disabled className="font-bold text-muted-foreground">
                                    Despesas (Falta)
                                  </SelectItem>
                                  {expenseAccounts.length === 0 ? (
                                    <SelectItem value="__empty" disabled className="text-muted-foreground">
                                      Nenhuma conta de despesa cadastrada
                                    </SelectItem>
                                  ) : (
                                    expenseAccounts.map((account) => (
                                      <SelectItem key={account.id} value={account.id}>
                                        {account.code} - {account.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          {!differenceChartAccountId && isEditing && (
                            <p className="text-xs text-red-500">
                              Obrigatório para conferir o caixa
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Observações</Label>
                          <Textarea
                            value={adjustmentNotes}
                            onChange={(e) => setAdjustmentNotes(e.target.value)}
                            placeholder="Motivo do ajuste ou observações..."
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cancelled Orders */}
            {(selectedSession.cancel_count || 0) > 0 && (
              <Card className="border-red-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    Cancelados
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-8">
                  <div>
                    <p className="text-sm text-muted-foreground">Quantidade</p>
                    <p className="text-lg font-bold text-red-600">{selectedSession.cancel_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(selectedSession.cancel_total)}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Adjustments */}
            {sessionAdjustments.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Ajustes Registrados</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionAdjustments.map((adj: any) => (
                        <TableRow key={adj.id}>
                          <TableCell>
                            <Badge variant={adj.adjustment_type === 'sobra' ? 'default' : 'destructive'}>
                              {adj.adjustment_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(adj.amount)}</TableCell>
                          <TableCell>{adj.reason}</TableCell>
                          <TableCell>{format(new Date(adj.created_at), "dd/MM HH:mm")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Audit Log */}
            {sessionAuditLogs.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Histórico de Ações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sessionAuditLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center gap-3 text-sm p-2 bg-muted/30 rounded">
                        <Badge variant="outline">{log.action}</Badge>
                        <span className="text-muted-foreground">
                          {format(new Date(log.performed_at), "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEditing && (
            <>
              <Button
                variant="outline"
                onClick={() => handleSaveAdjustments(false)}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Ajustes
              </Button>
              <Button
                variant="default"
                onClick={() => handleSaveAdjustments(true)}
                disabled={isSaving || !canMarkAsReviewed}
                className="gap-2"
                title={!canMarkAsReviewed ? 'Selecione o plano de contas para a diferença' : ''}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Salvar e Conferir
              </Button>
            </>
          )}
          {selectedSession?.status === 'closed' && !isEditing && (
            <>
              <Button
                variant="outline"
                onClick={() => onReprint(selectedSession)}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Reimprimir
              </Button>
              {selectedSession.review_status !== 'approved' && (
                <>
                  {hasDifference ? (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="gap-2 border-yellow-500 text-yellow-600 hover:bg-yellow-500/10"
                    >
                      <Edit className="h-4 w-4" />
                      Editar para Conferir
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      onClick={() => onReview(selectedSession.id, 'approved')}
                      className="gap-2"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Marcar Conferido
                    </Button>
                  )}
                </>
              )}
            </>
          )}
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
