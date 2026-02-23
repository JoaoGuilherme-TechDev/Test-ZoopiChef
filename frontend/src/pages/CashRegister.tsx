import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCashSession, CashClosingSummary } from '@/hooks/useCashSession';
import { useCashMovements } from '@/hooks/useCashMovements';
import { useProfile } from '@/hooks/useProfile';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Wallet, DollarSign, CreditCard, Banknote, Receipt,
  Lock, Unlock, Clock, CheckCircle, AlertCircle, History,
  Loader2, Printer, TrendingUp, Package, Truck, XCircle, RefreshCw,
  ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { printCashClosingReceipt } from '@/components/cash/CashClosingPrint';
import { printCashSupplyReceipt } from '@/components/cash/CashSupplyPrint';
import { WithdrawalDialog } from '@/components/cash/WithdrawalDialog';
import { SupplyDialog } from '@/components/cash/SupplyDialog';
import { toast } from 'sonner';

export default function CashRegister() {
  const { 
    openSession, 
    isLoading, 
    sessionHistory, 
    cashSummary,
    openCash, 
    closeCash, 
    isCashOpen 
  } = useCashSession();
  const { movements, totals: movementTotals } = useCashMovements();
  const { data: profile } = useProfile();
  const { data: company } = useCompany();

  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [differenceReason, setDifferenceReason] = useState('');

  // Calcular diferença
  const closingBalanceNum = parseFloat(closingBalance) || 0;
  const expectedCash = cashSummary?.expectedCash || 0;
  const difference = closingBalanceNum - expectedCash;
  const hasDifference = closingBalance && Math.abs(difference) > 0.01;

  const handleOpenCash = async () => {
    await openCash.mutateAsync({
      openingBalance: parseFloat(openingBalance) || 0,
      notes: notes || undefined,
    });
    setOpenDialogOpen(false);
    setOpeningBalance('');
    setNotes('');
  };

  const handleCloseCash = async () => {
    const closingValue = parseFloat(closingBalance) || 0;
    
    // Validar motivo da diferença se necessário
    if (hasDifference && !differenceReason.trim()) {
      toast.error('Informe o motivo da diferença de caixa');
      return;
    }
    
    await closeCash.mutateAsync({
      closingBalance: closingValue,
      notes: notes || undefined,
      differenceReason: differenceReason.trim() || undefined,
      printReceipt: true,
      summarySnapshot: cashSummary,
    });
    setCloseDialogOpen(false);
    setClosingBalance('');
    setNotes('');
    setDifferenceReason('');
  };

  const handlePrintClosing = () => {
    if (!openSession || !cashSummary || !profile || !company) return;
    
    const closingValue = parseFloat(closingBalance) || 0;
    
    printCashClosingReceipt({
      session: openSession,
      summary: cashSummary,
      closingBalance: closingValue,
      operatorName: profile.full_name || 'Operador',
      companyName: company.name || 'Empresa',
    });
  };

  const handleReprintSupply = () => {
    if (!openSession || !profile || !company) return;
    
    printCashSupplyReceipt({
      session: openSession,
      operatorName: profile.full_name || 'Operador',
      companyName: company.name || 'Empresa',
      notes: openSession.notes || undefined,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Controle de Caixa</h1>
            <p className="text-muted-foreground">
              Abertura, fechamento e movimentação do caixa
            </p>
          </div>
          
          {isCashOpen ? (
            <Button variant="destructive" size="lg" onClick={() => setCloseDialogOpen(true)}>
              <Lock className="h-5 w-5 mr-2" />
              Fechar Caixa
            </Button>
          ) : (
            <Button size="lg" onClick={() => setOpenDialogOpen(true)}>
              <Unlock className="h-5 w-5 mr-2" />
              Abrir Caixa
            </Button>
          )}
        </div>

        {/* Status do Caixa */}
        <Card className={isCashOpen ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {isCashOpen ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Caixa Aberto
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Caixa Fechado
                  </>
                )}
              </CardTitle>
              {openSession && (
                <Badge variant="outline">
                  Aberto às {format(new Date(openSession.opened_at), "HH:mm 'de' dd/MM", { locale: ptBR })}
                </Badge>
              )}
            </div>
          </CardHeader>
          {openSession && (
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Troco inicial: {formatCurrency(openSession.opening_balance)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReprintSupply}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reimprimir Suprimento
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSupplyDialogOpen(true)}
                  className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  Suprimento
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setWithdrawalDialogOpen(true)}
                  className="gap-2 border-red-500 text-red-600 hover:bg-red-50"
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  Sangria
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Resumo do Caixa Atual */}
        {isCashOpen && cashSummary && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Vendas</CardTitle>
                  <Receipt className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">{formatCurrency(cashSummary.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">{cashSummary.totalOrders} pedidos</p>
                </CardContent>
              </Card>

              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-500">{formatCurrency(cashSummary.avgTicket)}</div>
                </CardContent>
              </Card>

              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dinheiro</CardTitle>
                  <Banknote className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-500">{formatCurrency(cashSummary.payments.dinheiro.total)}</div>
                  <p className="text-xs text-muted-foreground">
                    Esperado em caixa: {formatCurrency(cashSummary.expectedCash)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fiado</CardTitle>
                  <Wallet className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-500">{formatCurrency(cashSummary.payments.fiado.total)}</div>
                  <p className="text-xs text-muted-foreground">
                    Não entra no caixa
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detalhamento por forma de pagamento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Detalhamento por Forma de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                  <div className="p-4 bg-green-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Dinheiro</p>
                    <p className="text-xl font-bold text-green-500">{formatCurrency(cashSummary.payments.dinheiro.total)}</p>
                    <p className="text-xs text-muted-foreground">{cashSummary.payments.dinheiro.count} pedidos</p>
                  </div>
                  <div className="p-4 bg-purple-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">PIX</p>
                    <p className="text-xl font-bold text-purple-500">{formatCurrency(cashSummary.payments.pix.total)}</p>
                    <p className="text-xs text-muted-foreground">{cashSummary.payments.pix.count} pedidos</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Cartão Crédito</p>
                    <p className="text-xl font-bold text-blue-500">{formatCurrency(cashSummary.payments.cartao_credito.total)}</p>
                    <p className="text-xs text-muted-foreground">{cashSummary.payments.cartao_credito.count} pedidos</p>
                  </div>
                  <div className="p-4 bg-cyan-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Cartão Débito</p>
                    <p className="text-xl font-bold text-cyan-500">{formatCurrency(cashSummary.payments.cartao_debito.total)}</p>
                    <p className="text-xs text-muted-foreground">{cashSummary.payments.cartao_debito.count} pedidos</p>
                  </div>
                  <div className="p-4 bg-yellow-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Fiado</p>
                    <p className="text-xl font-bold text-yellow-500">{formatCurrency(cashSummary.payments.fiado.total)}</p>
                    <p className="text-xs text-muted-foreground">{cashSummary.payments.fiado.count} pedidos</p>
                  </div>
                  <div className="p-4 bg-gray-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Outros</p>
                    <p className="text-xl font-bold text-gray-500">{formatCurrency(cashSummary.payments.outros.total)}</p>
                    <p className="text-xs text-muted-foreground">{cashSummary.payments.outros.count} pedidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estatísticas adicionais */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Cancelados */}
              {cashSummary.cancelled.count > 0 && (
                <Card className="border-red-500/30 bg-red-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-500">
                      <XCircle className="h-5 w-5" />
                      Cancelados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-500">{cashSummary.cancelled.count} pedidos</p>
                    <p className="text-muted-foreground">{formatCurrency(cashSummary.cancelled.total)} em valor</p>
                  </CardContent>
                </Card>
              )}

              {/* Taxas de entrega */}
              {cashSummary.deliveryFees > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Taxa de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(cashSummary.deliveryFees)}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Top Produtos */}
            {cashSummary.topProducts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produtos Mais Vendidos na Sessão
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cashSummary.topProducts.slice(0, 5).map((product, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span>{product.name}</span>
                        <div className="flex gap-4">
                          <Badge variant="secondary">{product.quantity}x</Badge>
                          <span className="font-medium">{formatCurrency(product.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Histórico de Sessões */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Caixas
            </CardTitle>
            <CardDescription>Últimas 30 sessões de caixa</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Abertura</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead>Troco Inicial</TableHead>
                  <TableHead>Contado</TableHead>
                  <TableHead>Esperado</TableHead>
                  <TableHead>Diferença</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionHistory.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="text-sm">
                      {format(new Date(session.opened_at), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {session.closed_at 
                        ? format(new Date(session.closed_at), "dd/MM HH:mm", { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{formatCurrency(session.opening_balance)}</TableCell>
                    <TableCell>
                      {session.closing_balance !== null 
                        ? formatCurrency(session.closing_balance)
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {session.expected_balance !== null 
                        ? formatCurrency(session.expected_balance)
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {session.difference !== null ? (
                        <span className={session.difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {session.difference >= 0 ? '+' : ''}{formatCurrency(session.difference)}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={session.status === 'open' ? 'default' : 'secondary'}>
                        {session.status === 'open' ? 'Aberto' : 'Fechado'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {sessionHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhuma sessão de caixa registrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Abrir Caixa */}
      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-green-500" />
              Abrir Caixa
            </DialogTitle>
            <DialogDescription>
              Informe o valor inicial em dinheiro (troco) no caixa
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Troco Inicial (R$)</Label>
              <Input
                id="openingBalance"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="text-lg"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Informe o valor em dinheiro disponível para troco
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Observações sobre a abertura..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpenCash} disabled={openCash.isPending}>
              {openCash.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Unlock className="h-4 w-4 mr-2" />
              )}
              Abrir Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Fechar Caixa */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-500" />
              Fechar Caixa
            </DialogTitle>
            <DialogDescription>
              Resumo completo da sessão e conferência
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {cashSummary && (
              <>
                {/* Resumo Geral */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold">Resumo Geral</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Pedidos</p>
                      <p className="text-xl font-bold">{cashSummary.totalOrders}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Receita Total</p>
                      <p className="text-xl font-bold text-green-500">{formatCurrency(cashSummary.totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ticket Médio</p>
                      <p className="text-xl font-bold">{formatCurrency(cashSummary.avgTicket)}</p>
                    </div>
                  </div>
                </div>

                {/* Pagamentos */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold">Por Forma de Pagamento</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Dinheiro:</span>
                      <span className="font-medium">{formatCurrency(cashSummary.payments.dinheiro.total)} ({cashSummary.payments.dinheiro.count})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PIX:</span>
                      <span className="font-medium">{formatCurrency(cashSummary.payments.pix.total)} ({cashSummary.payments.pix.count})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cartão Crédito:</span>
                      <span className="font-medium">{formatCurrency(cashSummary.payments.cartao_credito.total)} ({cashSummary.payments.cartao_credito.count})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cartão Débito:</span>
                      <span className="font-medium">{formatCurrency(cashSummary.payments.cartao_debito.total)} ({cashSummary.payments.cartao_debito.count})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fiado:</span>
                      <span className="font-medium text-yellow-500">{formatCurrency(cashSummary.payments.fiado.total)} ({cashSummary.payments.fiado.count})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Outros:</span>
                      <span className="font-medium">{formatCurrency(cashSummary.payments.outros.total)} ({cashSummary.payments.outros.count})</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span>Taxa Entrega:</span>
                    <span>{formatCurrency(cashSummary.deliveryFees)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Troco Dado:</span>
                    <span>{formatCurrency(cashSummary.changeGiven)}</span>
                  </div>
                  {cashSummary.cancelled.count > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>Cancelados:</span>
                      <span>{formatCurrency(cashSummary.cancelled.total)} ({cashSummary.cancelled.count})</span>
                    </div>
                  )}
                </div>

                {/* Conferência de Caixa */}
                <div className="bg-green-500/10 p-4 rounded-lg space-y-2 border border-green-500/30">
                  <h4 className="font-semibold text-green-500">Conferência de Caixa</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Troco Inicial:</span>
                      <span>{formatCurrency(cashSummary.openingBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>(+) Dinheiro recebido:</span>
                      <span className="text-green-500">{formatCurrency(cashSummary.payments.dinheiro.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>(-) Troco dado:</span>
                      <span className="text-red-500">-{formatCurrency(cashSummary.changeGiven)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>ESPERADO EM CAIXA:</span>
                      <span className="text-green-500">{formatCurrency(cashSummary.expectedCash)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="closingBalance" className="text-lg font-semibold">
                Valor Contado no Caixa (R$)
              </Label>
              <Input
                id="closingBalance"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                className="text-xl h-14"
                autoFocus
              />
              {cashSummary && closingBalance && (
                <div className={`p-3 rounded-lg ${
                  parseFloat(closingBalance) - cashSummary.expectedCash >= 0 
                    ? 'bg-green-500/20 text-green-500' 
                    : 'bg-red-500/20 text-red-500'
                }`}>
                  <span className="font-bold">
                    Diferença: {formatCurrency(parseFloat(closingBalance) - cashSummary.expectedCash)}
                  </span>
                </div>
              )}
            </div>

            {/* Campo obrigatório para motivo da diferença */}
            {hasDifference && (
              <div className="space-y-2">
                <Label htmlFor="differenceReason" className="text-lg font-semibold text-amber-600">
                  Motivo da Diferença *
                </Label>
                <Textarea
                  id="differenceReason"
                  placeholder="Explique o motivo da diferença de caixa..."
                  value={differenceReason}
                  onChange={(e) => setDifferenceReason(e.target.value)}
                  className="border-amber-500"
                  rows={2}
                />
                <p className="text-xs text-amber-600">
                  Campo obrigatório quando há diferença entre o valor esperado e o contado
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="closeNotes">Observações (opcional)</Label>
              <Textarea
                id="closeNotes"
                placeholder="Observações sobre o fechamento..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {hasDifference && !differenceReason.trim() && (
              <div className="text-sm text-amber-600 mr-auto flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Informe o motivo da diferença
              </div>
            )}
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="secondary" 
              onClick={handlePrintClosing}
              disabled={!closingBalance}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Prévia
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCloseCash} 
              disabled={closeCash.isPending || !closingBalance || (hasDifference && !differenceReason.trim())}
            >
              {closeCash.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  <Printer className="h-4 w-4 mr-2" />
                </>
              )}
              Fechar e Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Suprimento */}
      <SupplyDialog open={supplyDialogOpen} onOpenChange={setSupplyDialogOpen} />

      {/* Dialog Sangria */}
      <WithdrawalDialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen} />
    </DashboardLayout>
  );
}
