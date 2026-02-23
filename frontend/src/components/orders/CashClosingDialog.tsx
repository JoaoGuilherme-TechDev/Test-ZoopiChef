import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { useCashSession } from '@/hooks/useCashSession';
import { useProfile } from '@/hooks/useProfile';
import { useCompany } from '@/hooks/useCompany';
import { useCompanyTableSettings } from '@/hooks/useCompanyTableSettings';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Printer, Loader2, DollarSign, ArrowUp, ArrowDown, 
  Minus, TrendingUp, Receipt, Users, Package, AlertTriangle
} from 'lucide-react';
import { printCashClosing, CashClosingPrintData } from '@/lib/print/cashClosing';

interface CashClosingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CashClosingDialog({ open, onOpenChange }: CashClosingDialogProps) {
  const { openSession, cashSummary, closeCash, isLoading: isSessionLoading } = useCashSession();
  const { data: profile } = useProfile();
  const { data: company } = useCompany();
  const { data: tableSettings } = useCompanyTableSettings();
  
  // Check if blind mode - operator cannot see revenue
  const isBlindMode = tableSettings?.cash_register_mode === 'blind';
  
  const [closingBalance, setClosingBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [differenceReason, setDifferenceReason] = useState('');
  const [weatherNote, setWeatherNote] = useState('');
  const [shouldPrint, setShouldPrint] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [openedByName, setOpenedByName] = useState('');

  // Calculate difference
  const closingBalanceNum = parseFloat(closingBalance) || 0;
  const expectedCash = cashSummary?.expectedCash || 0;
  const difference = closingBalanceNum - expectedCash;

  // Validation states
  const hasValidClosingBalance = closingBalance !== '' && !isNaN(parseFloat(closingBalance)) && parseFloat(closingBalance) >= 0;
  const needsDifferenceReason = hasValidClosingBalance && Math.abs(difference) > 0.01;
  const hasDifferenceReason = differenceReason.trim().length > 0;
  
  // Button enable logic
  const canClose = 
    !!openSession && 
    openSession.status === 'open' && 
    hasValidClosingBalance && 
    (!needsDifferenceReason || hasDifferenceReason) && 
    !isClosing;

  // Disable reason for UI feedback
  const getDisableReason = (): string | null => {
    if (isClosing) return 'Aguarde, processando...';
    if (!openSession) return 'Nenhum caixa aberto';
    if (openSession.status !== 'open') return 'Caixa já está fechado';
    if (!hasValidClosingBalance) return 'Informe o dinheiro contado';
    if (needsDifferenceReason && !hasDifferenceReason) return 'Informe o motivo da diferença';
    return null;
  };
  
  const disableReason = getDisableReason();

  // Fetch opened by name
  useEffect(() => {
    const fetchOpenedBy = async () => {
      if (openSession?.opened_by) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', openSession.opened_by)
          .single();
        setOpenedByName(data?.full_name || 'Desconhecido');
      }
    };
    if (open && openSession) {
      fetchOpenedBy();
    }
  }, [open, openSession]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleClose = async () => {
    if (!canClose) {
      toast.error(disableReason || 'Não é possível fechar o caixa');
      return;
    }

    setIsClosing(true);
    try {
      // Close the cash session with summary snapshot for printing
      await closeCash.mutateAsync({
        closingBalance: closingBalanceNum,
        notes: notes.trim() || undefined,
        differenceReason: differenceReason.trim() || undefined,
        weatherNote: weatherNote.trim() || undefined,
        printReceipt: shouldPrint,
        summarySnapshot: cashSummary,
      });

      // Additional manual print if needed
      if (shouldPrint && cashSummary && openSession && company) {
        const printData: CashClosingPrintData = {
          sessionId: openSession.id,
          openedAt: openSession.opened_at,
          closedAt: new Date().toISOString(),
          openedByName,
          closedByName: profile?.full_name || 'Operador',
          companyName: company.name || 'Empresa',
          summary: cashSummary,
          closingBalance: closingBalanceNum,
          difference,
          differenceReason: differenceReason || undefined,
          blindMode: isBlindMode,
        };
        
        printCashClosing(printData);
      }

      toast.success('Caixa fechado com sucesso!');
      onOpenChange(false);
      
      // Reset form
      setClosingBalance('');
      setNotes('');
      setDifferenceReason('');
      setWeatherNote('');
    } catch (error) {
      console.error('Error closing cash:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fechar caixa');
    } finally {
      setIsClosing(false);
    }
  };

  if (!openSession || !cashSummary) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Fechar Caixa
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1">
              <div className="font-medium text-foreground">
                Data de Negócio: {openSession.business_date 
                  ? format(new Date(openSession.business_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })
                  : format(new Date(openSession.opened_at), "dd/MM/yyyy", { locale: ptBR })
                }
              </div>
              <div className="text-xs text-muted-foreground">
                Período: {format(new Date(openSession.opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} até agora
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Pedidos</div>
                  <div className="text-2xl font-bold">{cashSummary.totalOrders}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Receita</div>
                  <div className="text-2xl font-bold text-green-600">
                    {isBlindMode ? '••••••' : formatCurrency(cashSummary.totalRevenue)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Ticket Médio</div>
                  <div className="text-2xl font-bold">
                    {isBlindMode ? '••••••' : formatCurrency(cashSummary.avgTicket)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Blind Mode Alert */}
            {isBlindMode && (
              <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Modo Caixa Cego</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Os valores de faturamento estão ocultos. Conte o dinheiro na gaveta.
                </p>
              </div>
            )}

            {/* Payment Methods - hidden in blind mode */}
            {!isBlindMode && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Por Forma de Pagamento
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Dinheiro ({cashSummary.payments.dinheiro.count}x)</span>
                    <span className="font-semibold">{formatCurrency(cashSummary.payments.dinheiro.total)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>PIX ({cashSummary.payments.pix.count}x)</span>
                    <span className="font-semibold">{formatCurrency(cashSummary.payments.pix.total)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Crédito ({cashSummary.payments.cartao_credito.count}x)</span>
                    <span className="font-semibold">{formatCurrency(cashSummary.payments.cartao_credito.total)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Débito ({cashSummary.payments.cartao_debito.count}x)</span>
                    <span className="font-semibold">{formatCurrency(cashSummary.payments.cartao_debito.total)}</span>
                  </div>
                  {cashSummary.payments.fiado.count > 0 && (
                    <div className="flex justify-between p-2 bg-orange-500/10 rounded border border-orange-500/20">
                      <span>Fiado ({cashSummary.payments.fiado.count}x)</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(cashSummary.payments.fiado.total)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cancellations */}
            {cashSummary.cancelled.count > 0 && (
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Cancelamentos</span>
                </div>
                <div className="text-sm">
                  {cashSummary.cancelled.count} pedidos - {formatCurrency(cashSummary.cancelled.total)}
                </div>
              </div>
            )}

            {/* Top Products */}
            {cashSummary.topProducts.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Top Produtos
                </h4>
                <div className="space-y-1">
                  {cashSummary.topProducts.slice(0, 5).map((p, i) => (
                    <div key={p.name} className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                      <span>{i + 1}. {p.name} ({p.quantity}x)</span>
                      <span className="font-medium">{formatCurrency(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deliverers */}
            {cashSummary.delivererStats.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Entregadores
                </h4>
                <div className="space-y-1">
                  {cashSummary.delivererStats.map((d) => (
                    <div key={d.name} className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                      <span>{d.name} ({d.deliveries} entregas)</span>
                      <span className="font-medium">{formatCurrency(d.totalValue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Cash Reconciliation */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Acerto de Caixa
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Troco Inicial (Abertura)</Label>
                  <div className="p-3 bg-muted/50 rounded font-semibold">
                    {formatCurrency(cashSummary.openingBalance)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Vendas Dinheiro</Label>
                  <div className="p-3 bg-muted/50 rounded font-semibold text-green-600">
                    {isBlindMode ? '••••••' : formatCurrency(cashSummary.payments.dinheiro.total)}
                  </div>
                </div>
              </div>

              {/* Suprimentos e Sangrias */}
              {(cashSummary.suppliesTotal > 0 || cashSummary.withdrawalsTotal > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  {cashSummary.suppliesTotal > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ArrowUp className="h-3 w-3 text-green-500" />
                        Suprimentos
                      </Label>
                      <div className="p-3 bg-green-500/10 rounded font-semibold text-green-600 border border-green-500/20">
                        + {formatCurrency(cashSummary.suppliesTotal)}
                      </div>
                    </div>
                  )}
                  {cashSummary.withdrawalsTotal > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ArrowDown className="h-3 w-3 text-red-500" />
                        Sangrias
                      </Label>
                      <div className="p-3 bg-red-500/10 rounded font-semibold text-red-600 border border-red-500/20">
                        - {formatCurrency(cashSummary.withdrawalsTotal)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Troco Dado */}
              {cashSummary.changeGiven > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ArrowDown className="h-3 w-3 text-orange-500" />
                    Troco Dado aos Clientes
                  </Label>
                  <div className="p-3 bg-orange-500/10 rounded font-semibold text-orange-600 border border-orange-500/20">
                    - {formatCurrency(cashSummary.changeGiven)}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="font-bold">Saldo Esperado na Gaveta</Label>
                <div className="p-3 bg-primary/10 rounded font-bold text-lg border border-primary/30">
                  {isBlindMode ? '••••••' : formatCurrency(expectedCash)}
                </div>
                <p className="text-xs text-muted-foreground">
                  = Abertura + Vendas Dinheiro + Suprimentos - Sangrias - Troco
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="closingBalance">Dinheiro Contado no Caixa *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="closingBalance"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                    className="pl-10 text-lg"
                  />
                </div>
              </div>

              {/* Difference Display */}
              {closingBalance && (
                <div className={`p-4 rounded-lg border-2 ${
                  difference > 0 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : difference < 0 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-muted/50 border-border'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {difference > 0 ? (
                        <ArrowUp className="h-5 w-5 text-green-600" />
                      ) : difference < 0 ? (
                        <ArrowDown className="h-5 w-5 text-red-600" />
                      ) : (
                        <Minus className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">
                        {difference > 0 ? 'SOBRA' : difference < 0 ? 'FALTA' : 'SEM DIFERENÇA'}
                      </span>
                    </div>
                    <span className={`text-xl font-bold ${
                      difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : ''
                    }`}>
                      {formatCurrency(Math.abs(difference))}
                    </span>
                  </div>
                </div>
              )}

              {/* Difference Reason */}
              {closingBalance && difference !== 0 && (
                <div className="space-y-2">
                  <Label htmlFor="differenceReason">Motivo da Diferença *</Label>
                  <Textarea
                    id="differenceReason"
                    value={differenceReason}
                    onChange={(e) => setDifferenceReason(e.target.value)}
                    placeholder="Explique o motivo da diferença..."
                    rows={2}
                  />
                </div>
              )}

              {/* Weather Note - only if enabled in settings */}
              {tableSettings?.show_weather_on_closing && (
                <div className="space-y-2">
                  <Label htmlFor="weatherNote">Condição do Clima (opcional)</Label>
                  <Input
                    id="weatherNote"
                    value={weatherNote}
                    onChange={(e) => setWeatherNote(e.target.value)}
                    placeholder="Ex: Chuva forte, muito calor, frio..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Pode ajudar a justificar dias de baixo ou alto movimento
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguma observação sobre o fechamento..."
                  rows={2}
                />
              </div>

              {/* Print Checkbox */}
              <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                <Checkbox
                  id="shouldPrint"
                  checked={shouldPrint}
                  onCheckedChange={(checked) => setShouldPrint(checked === true)}
                />
                <Label htmlFor="shouldPrint" className="flex items-center gap-2 cursor-pointer">
                  <Printer className="h-4 w-4" />
                  Imprimir relatório de fechamento
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t flex-col sm:flex-row gap-2">
          {/* Show disable reason */}
          {disableReason && (
            <div className="flex items-center gap-2 text-sm text-amber-600 mr-auto">
              <AlertTriangle className="h-4 w-4" />
              <span>{disableReason}</span>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleClose} 
              disabled={!canClose}
              className="min-w-[180px]"
            >
              {isClosing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fechando...
                </>
              ) : (
                <>
                  {shouldPrint && <Printer className="h-4 w-4 mr-2" />}
                  Fechar {shouldPrint && 'e Imprimir'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
