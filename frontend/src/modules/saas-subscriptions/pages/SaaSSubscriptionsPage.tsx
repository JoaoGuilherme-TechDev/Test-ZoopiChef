import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSaaSSubscription } from '../hooks/useSaaSSubscription';
import { useSaaSPlans } from '../hooks/useSaaSPlans';
import { SUBSCRIPTION_STATUS_LABELS } from '../types';
import { SupportButtonsSection } from '../components/SupportButtonsSection';
import { 
  CreditCard, 
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Calendar,
  DollarSign
} from 'lucide-react';

const STATUS_CONFIG = {
  active: { color: 'bg-green-500', icon: CheckCircle },
  trialing: { color: 'bg-blue-500', icon: Clock },
  canceled: { color: 'bg-red-500', icon: XCircle },
  past_due: { color: 'bg-yellow-500', icon: Clock },
};

export function SaaSSubscriptionsPage() {
  const { subscription, invoices, isLoading } = useSaaSSubscription();
  const { plans } = useSaaSPlans();

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const currentPlan = plans.find(p => p.id === subscription?.plan_id);

  if (isLoading) {
    return (
      <DashboardLayout title="Minha Assinatura">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const status = subscription?.status || 'pending';
  const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  const StatusIcon = statusConfig?.icon || Clock;

  return (
    <DashboardLayout title="Minha Assinatura">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Minha Assinatura</h1>
        </div>

        {/* Current Subscription */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Plano Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{currentPlan?.name || 'Plano'}</h3>
                    <p className="text-muted-foreground">{currentPlan?.description}</p>
                  </div>
                  <Badge className={statusConfig?.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {SUBSCRIPTION_STATUS_LABELS[status as keyof typeof SUBSCRIPTION_STATUS_LABELS]}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Mensal</p>
                      <p className="font-bold text-lg">{formatCurrency(currentPlan?.price_cents || 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Início</p>
                      <p className="font-medium">{formatDate(subscription.current_period_start)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Próxima Cobrança</p>
                      <p className="font-medium">{formatDate(subscription.current_period_end)}</p>
                    </div>
                  </div>
                </div>

                {currentPlan?.features && (
                  <div>
                    <h4 className="font-medium mb-2">Recursos Inclusos</h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {(currentPlan.features as string[]).map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline">Alterar Plano</Button>
                  <Button variant="outline" className="text-red-500 hover:text-red-600">
                    Cancelar Assinatura
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Você ainda não possui uma assinatura ativa</p>
                <Button>Ver Planos Disponíveis</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Planos Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.filter(p => p.is_active).map((plan) => (
                <Card 
                  key={plan.id} 
                  className={plan.id === subscription?.plan_id ? 'border-primary' : ''}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-4">
                      {formatCurrency(plan.price_cents)}
                      <span className="text-sm font-normal text-muted-foreground">/mês</span>
                    </div>
                    
                    {plan.features && (
                      <ul className="space-y-2 mb-4">
                        {(plan.features as string[]).slice(0, 5).map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button 
                      className="w-full"
                      variant={plan.id === subscription?.plan_id ? 'secondary' : 'default'}
                      disabled={plan.id === subscription?.plan_id}
                    >
                      {plan.id === subscription?.plan_id ? 'Plano Atual' : 'Selecionar'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Histórico de Faturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma fatura registrada
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Fatura #{invoice.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        Vencimento: {formatDate(invoice.due_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold">{formatCurrency(invoice.amount_cents)}</span>
                      <Badge className={invoice.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'}>
                        {invoice.status === 'paid' ? 'Pago' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suporte */}
        <SupportButtonsSection />
      </div>
    </DashboardLayout>
  );
}
