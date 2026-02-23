import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Check, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Loader2,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { useBankTransactions, CreateTransactionInput } from '@/hooks/useBankTransactions';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

export default function BankReconciliation() {
  const today = new Date();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  const { accounts, isLoading: loadingAccounts } = useBankAccounts();
  const { 
    transactions, 
    isLoading, 
    createTransaction,
    reconcileTransaction,
    bulkReconcile 
  } = useBankTransactions({
    bankAccountId: selectedAccountId || undefined,
    startDate,
    endDate,
    reconciled: showOnlyPending ? false : undefined,
  });

  const [formData, setFormData] = useState<CreateTransactionInput>({
    bank_account_id: '',
    transaction_date: format(today, 'yyyy-MM-dd'),
    description: '',
    amount_cents: 0,
    transaction_type: 'credit',
  });

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const pendingCount = transactions.filter(t => !t.reconciled).length;
  const totalCredits = transactions.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + t.amount_cents, 0);
  const totalDebits = transactions.filter(t => t.transaction_type === 'debit').reduce((sum, t) => sum + t.amount_cents, 0);

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    const pendingTransactions = transactions.filter(t => !t.reconciled);
    if (selectedIds.size === pendingTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingTransactions.map(t => t.id)));
    }
  };

  const handleBulkReconcile = async () => {
    if (selectedIds.size === 0) return;
    await bulkReconcile.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleCreateTransaction = async () => {
    if (!formData.bank_account_id || !formData.description || formData.amount_cents <= 0) return;
    await createTransaction.mutateAsync(formData);
    setDialogOpen(false);
    setFormData({
      bank_account_id: selectedAccountId || '',
      transaction_date: format(today, 'yyyy-MM-dd'),
      description: '',
      amount_cents: 0,
      transaction_type: 'credit',
    });
  };

  const openCreateDialog = () => {
    setFormData(prev => ({ ...prev, bank_account_id: selectedAccountId || '' }));
    setDialogOpen(true);
  };

  return (
    <DashboardLayout title="Conciliação Bancária">
      <div className="space-y-6">
        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2 min-w-[200px]">
                <Label>Conta Bancária</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.is_active).map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} {account.bank_name ? `(${account.bank_name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>

              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="pending"
                  checked={showOnlyPending}
                  onCheckedChange={(checked) => setShowOnlyPending(!!checked)}
                />
                <Label htmlFor="pending">Apenas pendentes</Label>
              </div>

              <Button onClick={openCreateDialog} className="ml-auto">
                <Plus className="h-4 w-4 mr-2" />
                Nova Transação
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumo da Conta */}
        {selectedAccount && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Saldo Atual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  'text-2xl font-bold',
                  (selectedAccount.current_balance_cents || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {formatCurrency(selectedAccount.current_balance_cents || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Entradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalCredits)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Saídas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalDebits)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {pendingCount}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lista de Transações */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transações</CardTitle>
            {selectedIds.size > 0 && (
              <Button onClick={handleBulkReconcile} disabled={bulkReconcile.isPending}>
                {bulkReconcile.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Conciliar {selectedIds.size} selecionadas
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {selectedAccountId 
                  ? 'Nenhuma transação encontrada no período'
                  : 'Selecione uma conta bancária para ver as transações'
                }
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.size === transactions.filter(t => !t.reconciled).length && transactions.filter(t => !t.reconciled).length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id} className={cn(t.reconciled && 'opacity-60')}>
                      <TableCell>
                        {!t.reconciled && (
                          <Checkbox
                            checked={selectedIds.has(t.id)}
                            onCheckedChange={() => handleToggleSelect(t.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell>{format(new Date(t.transaction_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        {t.transaction_type === 'credit' ? (
                          <ArrowDownCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowUpCircle className="h-4 w-4 text-red-500" />
                        )}
                        {t.description}
                      </TableCell>
                      <TableCell>{t.category || '-'}</TableCell>
                      <TableCell className={cn(
                        'text-right font-medium',
                        t.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {t.transaction_type === 'debit' ? '-' : '+'}
                        {formatCurrency(t.amount_cents)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.reconciled ? 'default' : 'secondary'}>
                          {t.reconciled ? 'Conciliado' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!t.reconciled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => reconcileTransaction.mutate(t.id)}
                            disabled={reconcileTransaction.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Nova Transação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Transação Bancária</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Conta Bancária</Label>
              <Select
                value={formData.bank_account_id}
                onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.is_active).map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.transaction_type}
                  onValueChange={(value: 'credit' | 'debit') => setFormData({ ...formData, transaction_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Entrada (Crédito)</SelectItem>
                    <SelectItem value="debit">Saída (Débito)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da transação"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount_cents / 100}
                  onChange={(e) => setFormData({ ...formData, amount_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria (opcional)</Label>
                <Input
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ex: Vendas"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateTransaction}
              disabled={createTransaction.isPending || !formData.bank_account_id || !formData.description || formData.amount_cents <= 0}
            >
              {createTransaction.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
