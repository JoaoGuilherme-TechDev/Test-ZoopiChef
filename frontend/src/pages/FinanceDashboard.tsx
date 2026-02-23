import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useCashSession } from '@/hooks/useCashSession';
import { useAccountsPayable } from '@/hooks/useAccountsPayable';
import { useCustomersWithFiado } from '@/hooks/useCustomerLedger';
import { 
  Wallet, Calculator, FileText, Users, 
  Lock, Unlock, ArrowRight, TrendingUp, AlertCircle
} from 'lucide-react';

export default function FinanceDashboard() {
  const navigate = useNavigate();
  const { isCashOpen, openSession, cashSummary } = useCashSession();
  const { totals: accountsTotals } = useAccountsPayable({});
  const { totalFiado, customers: customersWithFiado } = useCustomersWithFiado();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">
            Controle de caixa, contas a pagar e fiado
          </p>
        </div>

        {/* Status do Caixa - Destaque */}
        <Card className={isCashOpen ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {isCashOpen ? (
                  <>
                    <Unlock className="h-5 w-5 text-green-500" />
                    Caixa Aberto
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 text-red-500" />
                    Caixa Fechado
                  </>
                )}
              </CardTitle>
              <Button onClick={() => navigate('/cash-register')}>
                Ir para Caixa
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          {isCashOpen && cashSummary && (
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos</p>
                  <p className="text-2xl font-bold">{cashSummary.totalOrders}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receita</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(cashSummary.totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold">{formatCurrency(cashSummary.avgTicket)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Em Dinheiro</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(cashSummary.expectedCash)}</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Módulos Financeiros */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Controle de Caixa */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/cash-register')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Controle de Caixa
              </CardTitle>
              <CardDescription>
                Abertura, fechamento, suprimentos e sangrias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {isCashOpen 
                  ? `Aberto desde ${new Date(openSession!.opened_at).toLocaleString('pt-BR')}`
                  : 'Nenhum caixa aberto'
                }
              </p>
            </CardContent>
          </Card>

          {/* Histórico de Fechamentos */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/cash-history')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Histórico de Caixas
              </CardTitle>
              <CardDescription>
                Consulte fechamentos anteriores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ver histórico de fechamentos
              </p>
            </CardContent>
          </Card>

          {/* Contas a Pagar */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/accounts-payable')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-orange-500" />
                Contas a Pagar
              </CardTitle>
              <CardDescription>
                Despesas e pagamentos pendentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em aberto</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(accountsTotals.open)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(accountsTotals.total)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fiado */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/customer-credits')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-yellow-500" />
                Fiado (Conta Corrente)
              </CardTitle>
              <CardDescription>
                Clientes com saldo devedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total em Fiado</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {formatCurrency(totalFiado)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clientes</p>
                  <p className="text-xl font-bold">
                    {customersWithFiado.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aviso se caixa fechado */}
          {!isCashOpen && (
            <Card className="border-yellow-500/50 bg-yellow-500/5 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-5 w-5" />
                  Atenção: Caixa Fechado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Com o caixa fechado, não é possível finalizar pedidos, receber pagamentos de fiado ou registrar movimentações.
                  Abra o caixa para continuar operando.
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => navigate('/cash-register')}
                >
                  Abrir Caixa Agora
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
