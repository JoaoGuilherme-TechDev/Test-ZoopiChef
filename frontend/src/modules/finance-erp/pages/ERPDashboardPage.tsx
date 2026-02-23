import { useState } from 'react';
import { useERPDashboard, useERPFilters } from '../hooks';
import { ERPFiltersBar, ERPStatsCard } from '../components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  CreditCard,
  Wallet,
  Calendar,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAccountsPayable } from '@/hooks/useAccountsPayable';
import { useERPReceivables } from '../hooks/useERPReceivables';
import { format } from 'date-fns';

export function ERPDashboardPage() {
  const { filters, setDateRange } = useERPFilters();
  const { data, isLoading } = useERPDashboard();
  const { accounts: payables, isLoading: payablesLoading } = useAccountsPayable({ status: 'pending' });
  const { receivables, isLoading: receivablesLoading } = useERPReceivables();
  
  const [receivablesModalOpen, setReceivablesModalOpen] = useState(false);
  const [payablesModalOpen, setPayablesModalOpen] = useState(false);
  const [cashModalOpen, setCashModalOpen] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const openReceivables = receivables?.filter(r => r.status === 'aberto' || r.status === 'parcial') || [];
  const openPayables = payables?.filter(p => p.status === 'pending') || [];

  if (isLoading) {
    return (
      <DashboardLayout title="ERP Financeiro">
        <div className="p-6">Carregando dashboard...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="ERP Financeiro">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Financeiro (ERP)</h1>
      </div>

      <ERPFiltersBar
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(date) => setDateRange(date, filters.endDate)}
        onEndDateChange={(date) => setDateRange(filters.startDate, date)}
      />

      {/* Resumo do Dia e Mês */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ERPStatsCard
          title="Receita Hoje"
          value={formatCurrency(data?.receita_hoje || 0)}
          icon={DollarSign}
          className="bg-green-500/10"
        />
        <ERPStatsCard
          title="Receita do Mês"
          value={formatCurrency(data?.receita_mes || 0)}
          icon={Calendar}
        />
        <ERPStatsCard
          title="CMV do Mês"
          value={formatCurrency(data?.cmv_mes || 0)}
          icon={TrendingDown}
        />
        <ERPStatsCard
          title="Lucro do Mês"
          value={formatCurrency(data?.lucro_mes || 0)}
          icon={TrendingUp}
          className={(data?.lucro_mes || 0) >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}
        />
      </div>

      {/* Contas e Caixa - Clickable cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          onClick={() => setReceivablesModalOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Contas a Receber</CardTitle>
            <Receipt className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data?.contas_receber_abertas || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Em aberto ({openReceivables.length} itens)
            </p>
            <Link to="/erp/receivables">
              <Button variant="link" className="p-0 mt-2">
                Ver detalhes →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          onClick={() => setPayablesModalOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Contas a Pagar</CardTitle>
            <CreditCard className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data?.contas_pagar_abertas || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Em aberto ({openPayables.length} itens)
            </p>
            <Link to="/erp/payables">
              <Button variant="link" className="p-0 mt-2">
                Ver detalhes →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Contas a Pagar</CardTitle>
            <CreditCard className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data?.contas_pagar_abertas || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Em aberto
            </p>
            <Link to="/erp/payables">
              <Button variant="link" className="p-0 mt-2">
                Ver detalhes →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          onClick={() => setCashModalOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Caixa Atual</CardTitle>
            <Wallet className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.caixa_atual || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Sessão aberta
            </p>
            <Link to="/cash-register">
              <Button variant="link" className="p-0 mt-2">
                Ver caixa →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Fluxo Projetado */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa Projetado (7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${(data?.fluxo_projetado_7d || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data?.fluxo_projetado_7d || 0)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Entradas - Saídas previstas nos próximos 7 dias
          </p>
          <Link to="/erp/cash-flow">
            <Button variant="link" className="p-0 mt-2">
              Ver projeção completa →
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Links Rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
            <Link to="/erp/sales-report">
              <Button variant="outline" className="w-full justify-start">
                📊 Relatório de Vendas
              </Button>
            </Link>
            <Link to="/erp/top-products">
              <Button variant="outline" className="w-full justify-start">
                🏆 Produtos Mais Vendidos
              </Button>
            </Link>
            <Link to="/erp/discounts">
              <Button variant="outline" className="w-full justify-start">
                🏷️ Descontos
              </Button>
            </Link>
            <Link to="/erp/delivery-fees">
              <Button variant="outline" className="w-full justify-start">
                🚚 Taxas de Entrega
              </Button>
            </Link>
            <Link to="/erp/dre">
              <Button variant="outline" className="w-full justify-start">
                📈 DRE Simples
              </Button>
            </Link>
            <Link to="/erp/dre-advanced">
              <Button variant="outline" className="w-full justify-start">
                📊 DRE Avançado
              </Button>
            </Link>
            <Link to="/erp/cmv">
              <Button variant="outline" className="w-full justify-start">
                💰 CMV
              </Button>
            </Link>
            <Link to="/erp/cash-flow">
              <Button variant="outline" className="w-full justify-start">
                💵 Fluxo de Caixa
              </Button>
            </Link>
            <Link to="/erp/cost-centers">
              <Button variant="outline" className="w-full justify-start">
                🏢 Centros de Custo
              </Button>
            </Link>
            <Link to="/erp/executive">
              <Button variant="outline" className="w-full justify-start">
                👔 Dashboard Executivo
              </Button>
            </Link>
            <Link to="/bank-reconciliation">
              <Button variant="outline" className="w-full justify-start">
                🏦 Conciliação Bancária
              </Button>
            </Link>
            <Link to="/erp/budgets">
              <Button variant="outline" className="w-full justify-start">
                🎯 Orçamentos
              </Button>
            </Link>
            <Link to="/erp/alerts">
              <Button variant="outline" className="w-full justify-start">
                🔔 Alertas Financeiros
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Modal Contas a Receber */}
      <Dialog open={receivablesModalOpen} onOpenChange={setReceivablesModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-500" />
              Contas a Receber em Aberto
            </DialogTitle>
          </DialogHeader>
          {receivablesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : openReceivables.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma conta a receber em aberto
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openReceivables.slice(0, 10).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell>{item.customer_name || '-'}</TableCell>
                    <TableCell>
                      {item.due_date ? format(new Date(item.due_date), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatCurrency(item.amount_cents / 100)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'parcial' ? 'secondary' : 'outline'}>
                        {item.status === 'aberto' ? 'Pendente' : 'Parcial'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex justify-end">
            <Link to="/erp/receivables">
              <Button>Ver todos</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Contas a Pagar */}
      <Dialog open={payablesModalOpen} onOpenChange={setPayablesModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-500" />
              Contas a Pagar em Aberto
            </DialogTitle>
          </DialogHeader>
          {payablesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : openPayables.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma conta a pagar em aberto
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openPayables.slice(0, 10).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell>{item.category_name || item.category || '-'}</TableCell>
                    <TableCell>
                      {item.due_date ? format(new Date(item.due_date), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {formatCurrency(item.amount_cents / 100)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex justify-end">
            <Link to="/erp/payables">
              <Button>Ver todos</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Caixa */}
      <Dialog open={cashModalOpen} onOpenChange={setCashModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Caixa Atual
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Saldo Atual</p>
              <p className="text-3xl font-bold">{formatCurrency(data?.caixa_atual || 0)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">Entradas</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(data?.receita_hoje || 0)}
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">Saídas</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(0)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Link to="/cash-register">
              <Button>Abrir Caixa Completo</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
