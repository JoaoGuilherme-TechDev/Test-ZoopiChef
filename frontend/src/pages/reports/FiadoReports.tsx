import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompany } from '@/hooks/useCompany';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Wallet, DollarSign, User, Loader2, FileText, Download, CalendarIcon,
  AlertTriangle, Clock, Ban, TrendingUp, Filter, Printer, ChevronRight
} from 'lucide-react';
import { format, differenceInDays, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CustomerDebt {
  id: string;
  name: string;
  whatsapp: string;
  credit_balance: number;
  credit_limit: number | null;
  allow_credit: boolean;
  last_order_at: string | null;
  oldest_debt_date: string | null;
  total_transactions: number;
}

interface DebtTransaction {
  id: string;
  customer_id: string;
  customer_name: string;
  order_id: string | null;
  transaction_type: string;
  amount: number;
  balance_after: number;
  created_at: string;
  notes: string | null;
}

export default function FiadoReports() {
  const { data: company } = useCompany();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'with_balance' | 'blocked' | 'over_limit'>('with_balance');
  const [daysOverdueFilter, setDaysOverdueFilter] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'synthetic' | 'analytical'>('synthetic');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Fetch all customers with credit data
  const { data: customersWithDebt = [], isLoading } = useQuery({
    queryKey: ['fiado-report-customers', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('customers')
        .select(`
          id, name, whatsapp, credit_balance, credit_limit, allow_credit,
          orders(created_at)
        `)
        .eq('company_id', company.id)
        .order('credit_balance', { ascending: false });

      if (error) throw error;

      // Get oldest debt date for each customer
      const customersData: CustomerDebt[] = await Promise.all(
        (data || []).map(async (customer) => {
          const { data: txData } = await supabase
            .from('customer_credit_transactions')
            .select('created_at')
            .eq('customer_id', customer.id)
            .eq('transaction_type', 'debit')
            .order('created_at', { ascending: true })
            .limit(1);

          const orders = customer.orders as any[] || [];
          const lastOrder = orders.length > 0 
            ? orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at 
            : null;

          return {
            id: customer.id,
            name: customer.name,
            whatsapp: customer.whatsapp,
            credit_balance: Number(customer.credit_balance) || 0,
            credit_limit: customer.credit_limit ? Number(customer.credit_limit) : null,
            allow_credit: customer.allow_credit,
            last_order_at: lastOrder,
            oldest_debt_date: txData?.[0]?.created_at || null,
            total_transactions: 0,
          };
        })
      );

      return customersData;
    },
    enabled: !!company?.id,
  });

  // Fetch transactions for selected customer
  const { data: customerTransactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['fiado-customer-transactions', selectedCustomerId, startDate, endDate],
    queryFn: async () => {
      if (!selectedCustomerId) return [];

      let query = supabase
        .from('customer_credit_transactions')
        .select(`
          id, customer_id, order_id, transaction_type, amount, balance_after, created_at, notes,
          customer:customers!customer_credit_transactions_customer_id_fkey(name)
        `)
        .eq('customer_id', selectedCustomerId)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(tx => ({
        ...tx,
        customer_name: (tx.customer as any)?.name || '',
      })) as DebtTransaction[];
    },
    enabled: !!selectedCustomerId,
  });

  // Calculate days overdue for each customer
  const customersWithDaysOverdue = useMemo(() => {
    return customersWithDebt.map(customer => {
      let daysOverdue = 0;
      if (customer.oldest_debt_date && customer.credit_balance > 0) {
        daysOverdue = differenceInDays(new Date(), new Date(customer.oldest_debt_date));
      }
      return { ...customer, daysOverdue };
    });
  }, [customersWithDebt]);

  // Apply filters
  const filteredCustomers = useMemo(() => {
    let filtered = customersWithDaysOverdue;

    // Status filter
    switch (statusFilter) {
      case 'with_balance':
        filtered = filtered.filter(c => c.credit_balance > 0);
        break;
      case 'blocked':
        filtered = filtered.filter(c => !c.allow_credit);
        break;
      case 'over_limit':
        filtered = filtered.filter(c => 
          c.credit_limit !== null && c.credit_balance > c.credit_limit
        );
        break;
    }

    // Days overdue filter
    if (daysOverdueFilter !== 'all') {
      const days = parseInt(daysOverdueFilter);
      filtered = filtered.filter(c => c.daysOverdue >= days);
    }

    return filtered;
  }, [customersWithDaysOverdue, statusFilter, daysOverdueFilter]);

  // Totals
  const totals = useMemo(() => {
    const withBalance = customersWithDaysOverdue.filter(c => c.credit_balance > 0);
    return {
      totalDebt: withBalance.reduce((sum, c) => sum + c.credit_balance, 0),
      customersCount: withBalance.length,
      blockedCount: customersWithDaysOverdue.filter(c => !c.allow_credit && c.credit_balance > 0).length,
      overdueCount: customersWithDaysOverdue.filter(c => c.daysOverdue > 30).length,
    };
  }, [customersWithDaysOverdue]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getOverdueBadge = (days: number) => {
    if (days === 0) return null;
    if (days <= 7) return <Badge variant="outline" className="text-yellow-600 border-yellow-500">+{days}d</Badge>;
    if (days <= 30) return <Badge variant="outline" className="text-orange-600 border-orange-500">+{days}d</Badge>;
    return <Badge variant="destructive">+{days}d</Badge>;
  };

  const selectedCustomer = customersWithDaysOverdue.find(c => c.id === selectedCustomerId);

  const handlePrintReport = () => {
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Fiado</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          h1 { margin: 0; font-size: 18px; }
          .date { color: #666; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .total { font-weight: bold; background-color: #f0f0f0; }
          .right { text-align: right; }
          .overdue { color: red; }
          @media print { @page { size: A4; margin: 10mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório de Fiado - ${reportType === 'synthetic' ? 'Sintético' : 'Analítico'}</h1>
          <p class="date">Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
          <p class="date">Filtro: ${statusFilter === 'with_balance' ? 'Com saldo' : statusFilter === 'blocked' ? 'Bloqueados' : statusFilter === 'over_limit' ? 'Acima do limite' : 'Todos'}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>WhatsApp</th>
              <th class="right">Saldo Devedor</th>
              <th class="right">Limite</th>
              <th>Dias Vencido</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredCustomers.map(c => `
              <tr>
                <td>${c.name}</td>
                <td>${c.whatsapp || '-'}</td>
                <td class="right">${formatCurrency(c.credit_balance)}</td>
                <td class="right">${c.credit_limit ? formatCurrency(c.credit_limit) : 'S/Limite'}</td>
                <td class="${c.daysOverdue > 30 ? 'overdue' : ''}">${c.daysOverdue > 0 ? `+${c.daysOverdue}d` : '-'}</td>
                <td>${c.allow_credit ? 'Ativo' : 'Bloqueado'}</td>
              </tr>
            `).join('')}
            <tr class="total">
              <td colspan="2">TOTAL (${filteredCustomers.length} clientes)</td>
              <td class="right">${formatCurrency(filteredCustomers.reduce((s, c) => s + c.credit_balance, 0))}</td>
              <td colspan="3"></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wallet className="h-8 w-8" />
              Relatórios de Fiado
            </h1>
            <p className="text-muted-foreground">
              Acompanhe dívidas, vencimentos e inadimplência
            </p>
          </div>
          <Button onClick={handlePrintReport} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir Relatório
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-orange-500" />
                Total a Receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totals.totalDebt)}</p>
              <p className="text-xs text-muted-foreground">{totals.customersCount} clientes</p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" />
                Com Saldo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{totals.customersCount}</p>
              <p className="text-xs text-muted-foreground">clientes com débito</p>
            </CardContent>
          </Card>

          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Ban className="h-4 w-4 text-red-500" />
                Bloqueados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{totals.blockedCount}</p>
              <p className="text-xs text-muted-foreground">sem permissão de fiado</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Vencido +30d
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{totals.overdueCount}</p>
              <p className="text-xs text-muted-foreground">clientes inadimplentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="with_balance">Com Saldo</SelectItem>
                    <SelectItem value="blocked">Bloqueados</SelectItem>
                    <SelectItem value="over_limit">Acima do Limite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dias Vencido (mínimo)</Label>
                <Select value={daysOverdueFilter} onValueChange={setDaysOverdueFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer</SelectItem>
                    <SelectItem value="7">+7 dias</SelectItem>
                    <SelectItem value="15">+15 dias</SelectItem>
                    <SelectItem value="30">+30 dias</SelectItem>
                    <SelectItem value="60">+60 dias</SelectItem>
                    <SelectItem value="90">+90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Relatório</Label>
                <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="synthetic">Sintético (Resumo)</SelectItem>
                    <SelectItem value="analytical">Analítico (Detalhado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setStatusFilter('with_balance');
                    setDaysOverdueFilter('all');
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers List */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>
              {filteredCustomers.length} cliente(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cliente encontrado com os filtros aplicados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead className="text-right">Saldo Devedor</TableHead>
                      <TableHead className="text-right">Limite</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow 
                        key={customer.id} 
                        className={cn(
                          "hover:bg-muted/50 cursor-pointer",
                          selectedCustomerId === customer.id && "bg-primary/5"
                        )}
                        onClick={() => setSelectedCustomerId(customer.id)}
                      >
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.whatsapp || '-'}</TableCell>
                        <TableCell className="text-right font-bold text-orange-600">
                          {formatCurrency(customer.credit_balance)}
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.credit_limit 
                            ? formatCurrency(customer.credit_limit) 
                            : <span className="text-muted-foreground">S/Limite</span>
                          }
                        </TableCell>
                        <TableCell>
                          {getOverdueBadge(customer.daysOverdue)}
                        </TableCell>
                        <TableCell>
                          {customer.allow_credit ? (
                            <Badge variant="outline" className="text-green-600 border-green-500">Ativo</Badge>
                          ) : (
                            <Badge variant="destructive">Bloqueado</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomerId(customer.id);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Detail Dialog */}
        <Dialog open={!!selectedCustomerId} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Extrato do Cliente
              </DialogTitle>
              <DialogDescription>
                {selectedCustomer?.name} - {selectedCustomer?.whatsapp}
              </DialogDescription>
            </DialogHeader>

            {selectedCustomer && (
              <div className="space-y-6">
                {/* Customer Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-orange-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Saldo Devedor</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(selectedCustomer.credit_balance)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Limite</p>
                    <p className="text-2xl font-bold">
                      {selectedCustomer.credit_limit 
                        ? formatCurrency(selectedCustomer.credit_limit) 
                        : 'Sem limite'
                      }
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Dias Vencido</p>
                    <p className="text-2xl font-bold">
                      {selectedCustomer.daysOverdue > 0 ? `+${selectedCustomer.daysOverdue}d` : '-'}
                    </p>
                  </div>
                </div>

                {/* Date Filters */}
                <div className="flex gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Data Inicial</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn(!startDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Data Final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn(!endDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "dd/MM/yyyy") : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button variant="ghost" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
                    Limpar
                  </Button>
                </div>

                {/* Transactions */}
                <div>
                  <h4 className="font-medium mb-3">Histórico de Transações</h4>
                  {isLoadingTransactions ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : customerTransactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhuma transação encontrada
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Saldo Após</TableHead>
                          <TableHead>Observações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={tx.transaction_type === 'debit' ? 'destructive' : 'default'}>
                                {tx.transaction_type === 'debit' ? 'Débito' : 'Pagamento'}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-medium",
                              tx.transaction_type === 'debit' ? "text-red-600" : "text-green-600"
                            )}>
                              {tx.transaction_type === 'debit' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(tx.balance_after)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {tx.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
