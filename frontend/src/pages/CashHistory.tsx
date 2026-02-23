import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCashHistory, CashHistoryFilters, CashSessionHistory } from '@/hooks/useCashHistory';
import { useProfile } from '@/hooks/useProfile';
import { useCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  History, Filter, Printer, Eye, CalendarIcon, Loader2,
  ShieldCheck, ShieldX, RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { printCashClosingReceipt } from '@/components/cash/CashClosingPrint';
import { CashClosingSummary } from '@/hooks/useCashSession';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CashSessionEditDialog } from '@/components/cash/CashSessionEditDialog';

export default function CashHistory() {
  const { data: profile } = useProfile();
  const { data: company } = useCompany();
  
  // Filters state
  const [filters, setFilters] = useState<CashHistoryFilters>({
    status: 'all',
    reviewStatus: 'all',
  });
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  
  // Dialog states
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  
  // Apply date filters
  const appliedFilters: CashHistoryFilters = {
    ...filters,
    startDate,
    endDate,
  };
  
  const { 
    sessions, 
    isLoading,
    isFetching,
    error,
    refetch,
    reviewSession,
    logReprint,
    getOrCreateChartAccounts,
    createDifferenceAdjustment,
  } = useCashHistory(appliedFilters);
  

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

  const handleReprint = async (session: any) => {
    if (session.status !== 'closed') {
      toast.error('Só é possível reimprimir sessões fechadas');
      return;
    }

    // Build summary from stored data
    const payments = session.payments_summary || {};
    const summary: CashClosingSummary = {
      totalOrders: session.total_orders || 0,
      totalRevenue: session.total_revenue || 0,
      avgTicket: session.avg_ticket || 0,
      payments: {
        dinheiro: payments.dinheiro || { count: 0, total: 0 },
        pix: payments.pix || { count: 0, total: 0 },
        cartao_credito: payments.cartao_credito || { count: 0, total: 0 },
        cartao_debito: payments.cartao_debito || { count: 0, total: 0 },
        fiado: payments.fiado || { count: 0, total: 0 },
        outros: payments.outros || { count: 0, total: 0 },
      },
      deliveryFees: session.delivery_fee_total || 0,
      discounts: 0,
      cancelled: { count: session.cancel_count || 0, total: session.cancel_total || 0 },
      changeGiven: session.change_given_total || 0,
      fiadoGenerated: payments.fiado?.total || 0,
      fiadoReceived: 0,
      openingBalance: session.opening_balance,
      expectedCash: session.expected_balance || 0,
      suppliesTotal: 0,
      withdrawalsTotal: 0,
      topProducts: [],
      delivererStats: [],
    };

    // Log reprint
    await logReprint.mutateAsync(session.id);

    // Print
    printCashClosingReceipt({
      session,
      summary,
      closingBalance: session.closing_balance || 0,
      operatorName: session.closed_by_profile?.full_name || 'Operador',
      companyName: company?.name || 'Empresa',
    });

    toast.success('Relatório de fechamento enviado para impressão');
  };

  const handleOpenReview = (sessionId: string, action: 'approved' | 'rejected') => {
    setSelectedSessionId(sessionId);
    setReviewAction(action);
    setReviewNotes('');
    setReviewDialogOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!selectedSessionId) return;

    // For rejected, notes are required
    if (reviewAction === 'rejected' && !reviewNotes.trim()) {
      toast.error('Informe o motivo da não conferência');
      return;
    }

    await reviewSession.mutateAsync({
      sessionId: selectedSessionId,
      reviewStatus: reviewAction,
      reviewNotes: reviewNotes.trim() || undefined,
    });

    setReviewDialogOpen(false);
    setSelectedSessionId(null);
  };

  const handleViewDetails = (sessionId: string) => {
    setSelectedSessionId(sessionId);
  };

  const clearFilters = () => {
    setFilters({ status: 'all', reviewStatus: 'all' });
    setStartDate(undefined);
    setEndDate(undefined);
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <History className="h-8 w-8" />
              Histórico de Caixas
            </h1>
            <p className="text-muted-foreground">
              Consulte, reimprima e confira sessões de caixa
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar histórico</AlertTitle>
            <AlertDescription>
              {(error as any)?.message || 'Não foi possível buscar os caixas. Tente novamente.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Review Status */}
              <div className="space-y-2">
                <Label>Conferência</Label>
                <Select
                  value={filters.reviewStatus}
                  onValueChange={(value) => setFilters({ ...filters, reviewStatus: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="approved">Conferido</SelectItem>
                    <SelectItem value="rejected">Não Conferido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button variant="ghost" onClick={clearFilters} className="w-full">
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sessões de Caixa</CardTitle>
            <CardDescription>
              {sessions.length} sessão(ões) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Negócio</TableHead>
                    <TableHead>Abertura</TableHead>
                    <TableHead>Fechamento</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead className="text-right">Troco Inicial</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Contado</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead>Conferência</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className="hover:bg-muted/50">
                      <TableCell className="whitespace-nowrap font-medium">
                        {session.business_date 
                          ? format(new Date(session.business_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })
                          : format(new Date(session.opened_at), "dd/MM/yyyy", { locale: ptBR })
                        }
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {format(new Date(session.opened_at), "dd/MM HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {session.closed_at 
                          ? format(new Date(session.closed_at), "dd/MM HH:mm", { locale: ptBR })
                          : <Badge variant="outline" className="border-green-500 text-green-600">Aberto</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        {session.opened_by_profile?.full_name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(session.opening_balance)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(session.total_revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(session.expected_balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(session.closing_balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        {session.difference !== null && session.difference !== undefined ? (
                          <span className={cn(
                            "font-medium",
                            session.difference > 0 && "text-green-600",
                            session.difference < 0 && "text-red-600"
                          )}>
                            {session.difference >= 0 ? '+' : ''}{formatCurrency(session.difference)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {session.status === 'closed' ? getReviewBadge(session.review_status) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDetails(session.id)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {session.status === 'closed' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReprint(session)}
                                title="Reimprimir fechamento"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              
                              {session.review_status !== 'approved' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => handleOpenReview(session.id, 'approved')}
                                  title="Marcar como conferido"
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {session.review_status !== 'rejected' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleOpenReview(session.id, 'rejected')}
                                  title="Marcar como não conferido"
                                >
                                  <ShieldX className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {sessions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Nenhuma sessão encontrada com os filtros aplicados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Session Details Dialog */}
        <CashSessionEditDialog
          sessionId={!reviewDialogOpen ? selectedSessionId : null}
          onClose={() => setSelectedSessionId(null)}
          onReprint={handleReprint}
          onReview={handleOpenReview}
        />

        {/* Review Confirmation Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {reviewAction === 'approved' ? (
                  <>
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    Confirmar Conferência
                  </>
                ) : (
                  <>
                    <ShieldX className="h-5 w-5 text-red-600" />
                    Marcar como Não Conferido
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {reviewAction === 'approved'
                  ? 'Confirma que este caixa foi conferido e está correto?'
                  : 'Informe o motivo da não conferência (obrigatório).'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Observações {reviewAction === 'rejected' && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  placeholder={reviewAction === 'approved' 
                    ? "Observações opcionais..."
                    : "Descreva o problema encontrado..."
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setReviewDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant={reviewAction === 'approved' ? 'default' : 'destructive'}
                onClick={handleConfirmReview}
                disabled={reviewSession.isPending}
              >
                {reviewSession.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {reviewAction === 'approved' ? 'Confirmar Conferência' : 'Marcar Não Conferido'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
