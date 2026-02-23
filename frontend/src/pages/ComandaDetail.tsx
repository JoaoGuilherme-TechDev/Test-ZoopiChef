import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Plus,
  Receipt,
  CreditCard,
  RefreshCw,
  Tag,
  Clock,
  Percent,
  X,
  Merge,
  ArrowRightLeft,
  Printer,
  QrCode,
  DoorOpen,
} from 'lucide-react';
import { useComanda, useComandaMutations, useComandaSettings } from '@/hooks/useComandas';
import { useComandaItems } from '@/hooks/useComandaItems';
import { useComandaPayments } from '@/hooks/useComandaPayments';
import { ComandaAddItemDialog } from '@/components/comandas/ComandaAddItemDialog';
import { ComandaRodizioActivateDialog } from '@/components/comandas/ComandaRodizioActivateDialog';
import { ComandaRodizioMenuDialog } from '@/components/comandas/ComandaRodizioMenuDialog';
import { ComandaPaymentDialog } from '@/components/comandas/ComandaPaymentDialog';
import { ComandaCancelItemDialog } from '@/components/comandas/ComandaCancelItemDialog';
import { ComandaTransferDialog } from '@/components/comandas/ComandaTransferDialog';
import { ComandaMergeDialog } from '@/components/comandas/ComandaMergeDialog';
import { ComandaQRCodeDialog } from '@/components/comandas/ComandaQRCodeDialog';
import { ComandaCloseDialog } from '@/components/comandas/ComandaCloseDialog';
import { useCompanyTableSettings } from '@/hooks/useCompanyTableSettings';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { printComandaBillDirect, ComandaBillData } from '@/lib/print/comandaBill';
import { useActiveRodizioSession } from '@/hooks/useRodizio';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ComandaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { company } = useCompanyContext();
  const { data: comanda, isLoading: comandaLoading } = useComanda(id || null);
  const { groupedItems, activeItems, isLoading: itemsLoading } = useComandaItems(id || null);
  const { payments, totalPaid } = useComandaPayments(id || null);
  const { settings } = useComandaSettings();
  const { data: tableSettings } = useCompanyTableSettings();
  const { requestBill, reopenComanda, closeComanda, releaseComanda } = useComandaMutations();

  // Rodízio: precisamos consultar a sessão ativa sem violar regras de hooks.
  // Usamos o ID da rota como fallback (antes de comanda carregar).
  const { data: activeRodizioSession } = useActiveRodizioSession(undefined, id || undefined);

  const [timer, setTimer] = useState('00:00:00');
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [rodizioOpen, setRodizioOpen] = useState(false);
  const [rodizioMenuOpen, setRodizioMenuOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelItemOpen, setCancelItemOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [qrCodeOpen, setQrCodeOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Timer update
  useEffect(() => {
    if (!comanda) return;

    const updateTimer = () => {
      const now = new Date();
      const opened = new Date(comanda.opened_at);
      const diff = Math.floor((now.getTime() - opened.getTime()) / 1000);

      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      setTimer(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [comanda?.opened_at]);

  if (comandaLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!comanda) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">Comanda não encontrada</p>
          <Button variant="link" onClick={() => navigate('/comandas')}>
            Voltar para o mapa
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const balance = Number(comanda.total_amount) - Number(comanda.paid_amount);
  const isLocked = comanda.status === 'requested_bill' || comanda.status === 'closed';
  const canClose = balance <= 0 || settings?.allow_close_with_balance;

  const buildBillData = (): ComandaBillData => {
    const subtotalCents = activeItems.reduce(
      (sum, item) => sum + Math.round(item.qty * item.unit_price_snapshot * 100),
      0
    );
    const serviceFeeCents = comanda.apply_service_fee
      ? Math.round(subtotalCents * (comanda.service_fee_percent / 100))
      : 0;
    const totalCents =
      subtotalCents +
      serviceFeeCents +
      Math.round(Number(comanda.surcharge_value) * 100) -
      Math.round(Number(comanda.discount_value) * 100);
    const paidCents = Math.round(Number(comanda.paid_amount) * 100);

    return {
      comandaNumber: comanda.command_number,
      comandaName: comanda.name,
      companyName: company?.name || 'Estabelecimento',
      openedAt: comanda.opened_at,
      items: activeItems.map((item) => ({
        product_name: item.product_name_snapshot,
        quantity: item.qty,
        unit_price_cents: Math.round(item.unit_price_snapshot * 100),
        total_price_cents: Math.round(item.qty * item.unit_price_snapshot * 100),
        notes: item.notes,
      })),
      subtotalCents,
      serviceFeeCents,
      serviceFeePercent: comanda.service_fee_percent,
      discountCents: Math.round(Number(comanda.discount_value) * 100),
      surchargeCents: Math.round(Number(comanda.surcharge_value) * 100),
      totalCents,
      paidCents,
      balanceCents: totalCents - paidCents,
    };
  };

  const handlePrintBill = async () => {
    if (!company) return;

    setIsPrinting(true);
    try {
      const billData = buildBillData();
      const result = await printComandaBillDirect(billData, company?.default_printer, company?.id);

      if (result.success) {
        if (result.warning) {
          toast.success('Pré-conta enviada para impressão', {
            description: 'Aviso: ' + result.warning,
          });
        } else {
          toast.success('Pré-conta enviada para impressão');
        }
      } else {
        toast.error(result.error || 'Erro ao imprimir pré-conta');
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleRequestBill = async () => {
    try {
      await requestBill.mutateAsync(comanda.id);
      toast.success('Conta solicitada! Lançamentos bloqueados.');

      // Imprimir pré-conta automaticamente (sempre via impressão direta/fila, sem abrir diálogo do Windows)
      if (company) {
        const billData = buildBillData();
        const result = await printComandaBillDirect(billData, company?.default_printer, company?.id);
        if (!result.success) {
          toast.error(result.error || 'Erro ao imprimir pré-conta');
        } else if (result.warning) {
          console.warn('[ComandaDetail] Print warning:', result.warning);
        }
      }
    } catch (error) {
      toast.error('Erro ao solicitar conta');
    }
  };

  const handleReopen = async () => {
    try {
      await reopenComanda.mutateAsync(comanda.id);
      toast.success('Comanda reaberta para lançamentos');
    } catch (error) {
      toast.error('Erro ao reabrir comanda');
    }
  };

  const handleClose = async () => {
    if (!canClose) {
      toast.error('Há saldo pendente. Receba o pagamento antes de fechar.');
      return;
    }

    // Check if we need to request table number
    if (tableSettings?.request_table_number) {
      setCloseDialogOpen(true);
      return;
    }

    try {
      await closeComanda.mutateAsync({ comandaId: comanda.id });
      toast.success('Comanda fechada com sucesso!');
      navigate('/comandas');
    } catch (error) {
      toast.error('Erro ao fechar comanda');
    }
  };

  const handleCloseConfirm = async (tableNumber: string) => {
    try {
      await closeComanda.mutateAsync({ comandaId: comanda.id, tableNumber });
      toast.success('Comanda fechada com sucesso!');
      navigate('/comandas');
    } catch (error) {
      toast.error('Erro ao fechar comanda');
    }
  };

  const handleRelease = async () => {
    try {
      await releaseComanda.mutateAsync(comanda.id);
      toast.success('Comanda liberada com sucesso!');
      navigate('/comandas');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao liberar comanda');
    }
  };

  const handleCancelItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setCancelItemOpen(true);
  };

  // Find if selected item is printed
  const selectedItem = activeItems.find(item => item.id === selectedItemId);
  const selectedItemIsPrinted = selectedItem?.is_printed || false;

  const handleTransferItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setTransferOpen(true);
  };

  // Calculate subtotals
  const itemsSubtotal = activeItems.reduce(
    (sum, item) => sum + Number(item.qty) * Number(item.unit_price_snapshot),
    0
  );
  const serviceFee = comanda.apply_service_fee
    ? itemsSubtotal * (comanda.service_fee_percent / 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/comandas')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div>
              <div className="flex items-center gap-3">
                <Tag className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">
                  Comanda {comanda.command_number}
                </h1>
                {comanda.name && (
                  <span className="text-xl text-muted-foreground">
                    — {comanda.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {timer}
                </div>
                {comanda.apply_service_fee && (
                  <Badge variant="outline" className="gap-1">
                    <Percent className="h-3 w-3" />
                    {comanda.service_fee_percent}%
                  </Badge>
                )}
                <Badge
                  variant={comanda.status === 'requested_bill' ? 'destructive' : 'secondary'}
                >
                  {comanda.status === 'open' && 'Em consumo'}
                  {comanda.status === 'no_activity' && 'Sem consumo'}
                  {comanda.status === 'requested_bill' && 'Pediu conta'}
                  {comanda.status === 'closed' && 'Fechada'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setQrCodeOpen(true)}>
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMergeOpen(true)}>
              <Merge className="h-4 w-4 mr-2" />
              Juntar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintBill}
              disabled={isPrinting}
            >
              <Printer className="h-4 w-4 mr-2" />
              {isPrinting ? 'Imprimindo...' : 'Imprimir'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Itens</CardTitle>
                {!isLocked && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (activeRodizioSession) setRodizioMenuOpen(true);
                        else setRodizioOpen(true);
                      }}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Lançar Rodízio
                    </Button>
                    <Button onClick={() => setAddItemOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Lançar Item
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {itemsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-12 animate-pulse bg-muted rounded" />
                    ))}
                  </div>
                ) : groupedItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum item lançado</p>
                    {!isLocked && (
                      <Button
                        variant="link"
                        onClick={() => setAddItemOpen(true)}
                        className="mt-2"
                      >
                        Lançar primeiro item
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupedItems.map((group) => (
                      <div
                        key={group.key}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {group.totalQty}x {group.product_name}
                          </div>
                          {group.notes && (
                            <div className="text-sm text-muted-foreground">
                              Obs: {group.notes}
                            </div>
                          )}
                          {group.options_json && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatOptions(group.options_json)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-medium">
                              R$ {(group.totalQty * group.unit_price).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              R$ {group.unit_price.toFixed(2)} un
                            </div>
                          </div>
                          {!isLocked && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleTransferItem(group.items[0].id)}
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleCancelItem(group.items[0].id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payments */}
            {payments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Pagamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-900/20"
                      >
                        <div>
                          <span className="font-medium">{payment.payment_method}</span>
                          {payment.paid_by_name && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({payment.paid_by_name})
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-green-600">
                          R$ {Number(payment.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary & Actions */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>R$ {itemsSubtotal.toFixed(2)}</span>
                </div>

                {comanda.apply_service_fee && (
                  <div className="flex justify-between text-sm">
                    <span>Taxa ({comanda.service_fee_percent}%)</span>
                    <span>R$ {serviceFee.toFixed(2)}</span>
                  </div>
                )}

                {Number(comanda.discount_value) > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Desconto</span>
                    <span>- R$ {Number(comanda.discount_value).toFixed(2)}</span>
                  </div>
                )}

                {Number(comanda.surcharge_value) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Acréscimo</span>
                    <span>R$ {Number(comanda.surcharge_value).toFixed(2)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>R$ {Number(comanda.total_amount).toFixed(2)}</span>
                </div>

                {totalPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Pago</span>
                      <span>R$ {totalPaid.toFixed(2)}</span>
                    </div>
                    <div
                      className={cn(
                        'flex justify-between font-bold',
                        balance > 0 ? 'text-red-600' : 'text-green-600'
                      )}
                    >
                      <span>Saldo</span>
                      <span>R$ {balance.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                {comanda.status === 'open' && (
                  <>
                    {/* Show release button when no items */}
                    {activeItems.length === 0 && (
                      <Button
                        className="w-full"
                        variant="secondary"
                        onClick={handleRelease}
                        disabled={releaseComanda.isPending}
                      >
                        <DoorOpen className="h-4 w-4 mr-2" />
                        Liberar Mesa
                      </Button>
                    )}
                    
                    {activeItems.length > 0 && (
                      <>
                        <Button
                          className="w-full"
                          variant="destructive"
                          onClick={handleRequestBill}
                          disabled={requestBill.isPending}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          Pedir Conta
                        </Button>
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => setPaymentOpen(true)}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Receber Pagamento
                        </Button>
                      </>
                    )}
                  </>
                )}

                {comanda.status === 'requested_bill' && (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => setPaymentOpen(true)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Receber Pagamento
                    </Button>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleReopen}
                      disabled={reopenComanda.isPending}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reabrir Comanda
                    </Button>
                    {canClose && (
                      <Button
                        className="w-full"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={closeComanda.isPending}
                      >
                        Fechar Comanda
                      </Button>
                    )}
                  </>
                )}

                {comanda.status === 'closed' && (
                  <div className="text-center text-muted-foreground">
                    <p>Comanda fechada</p>
                    <p className="text-xs mt-1">
                      {new Date(comanda.closed_at!).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ComandaAddItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        comandaId={comanda.id}
        commandNumber={comanda.command_number}
        commandName={comanda.name}
        onSuccess={() => {
          // Don't close - let user continue adding items
        }}
      />

      <ComandaRodizioActivateDialog
        open={rodizioOpen}
        onOpenChange={setRodizioOpen}
        comandaId={comanda.id}
        onSuccess={() => {
          setRodizioMenuOpen(true);
        }}
      />

      {company?.id && activeRodizioSession && (
        <ComandaRodizioMenuDialog
          open={rodizioMenuOpen}
          onOpenChange={setRodizioMenuOpen}
          companyId={company.id}
          comandaId={comanda.id}
          comandaNumber={comanda.command_number}
          comandaName={comanda.name}
          rodizioSession={activeRodizioSession as any}
        />
      )}

      <ComandaPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        comandaId={comanda.id}
        balance={balance}
      />

      <ComandaCancelItemDialog
        open={cancelItemOpen}
        onOpenChange={setCancelItemOpen}
        itemId={selectedItemId}
        isPrinted={selectedItemIsPrinted}
        allowDeletePrintedItems={tableSettings?.allow_mobile_delete_printed_items ?? true}
        onSuccess={() => {
          setCancelItemOpen(false);
          setSelectedItemId(null);
        }}
      />

      <ComandaTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        itemId={selectedItemId}
        sourceComandaId={comanda.id}
        onSuccess={() => {
          setTransferOpen(false);
          setSelectedItemId(null);
        }}
      />

      <ComandaMergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        currentComandaId={comanda.id}
        onSuccess={() => setMergeOpen(false)}
      />

      <ComandaQRCodeDialog
        open={qrCodeOpen}
        onOpenChange={setQrCodeOpen}
        comandaNumber={comanda.command_number}
        comandaName={comanda.name}
      />

      <ComandaCloseDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        onConfirm={handleCloseConfirm}
        requestTableNumber={tableSettings?.request_table_number || false}
        isPending={closeComanda.isPending}
      />
    </DashboardLayout>
  );
}

function formatOptions(options: any): string {
  if (!options) return '';

  const parts: string[] = [];

  if (options.flavors?.length) {
    parts.push(`Sabores: ${options.flavors.map((f: any) => f.name).join(', ')}`);
  }
  if (options.border) {
    parts.push(`Borda: ${options.border}`);
  }
  if (options.optionals?.length) {
    parts.push(`+ ${options.optionals.map((o: any) => o.name).join(', ')}`);
  }

  return parts.join(' | ');
}
