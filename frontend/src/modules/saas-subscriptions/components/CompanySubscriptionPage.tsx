import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Check, Crown, Package, Receipt, AlertTriangle, ExternalLink } from 'lucide-react';
import { SupportButtonsSection } from './SupportButtonsSection';
import { useCompanySubscription, Plan, AddonModule } from '../hooks/useCompanySubscription';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', variant: 'default' },
  pending: { label: 'Aguardando Pagamento', variant: 'secondary' },
  past_due: { label: 'Pagamento Atrasado', variant: 'destructive' },
  canceled: { label: 'Cancelado', variant: 'outline' },
  trial: { label: 'Período de Teste', variant: 'secondary' },
};

export function CompanySubscriptionPage() {
  const {
    subscription,
    plans,
    addons,
    companyAddons,
    billingHistory,
    isLoading,
    monthlyTotal,
    isAddonActive,
    isAddonPending,
    requestPlanChange,
    requestAddon,
  } = useCompanySubscription();

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedAddon, setSelectedAddon] = useState<AddonModule | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlan = subscription?.plan;
  const statusInfo = STATUS_LABELS[subscription?.status || 'pending'] || STATUS_LABELS.pending;

  const handleConfirmPlanChange = () => {
    if (selectedPlan) {
      requestPlanChange.mutate(selectedPlan.id);
      setSelectedPlan(null);
    }
  };

  const handleConfirmAddon = () => {
    if (selectedAddon) {
      requestAddon.mutate(selectedAddon.id);
      setSelectedAddon(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Sua Assinatura
              </CardTitle>
              <CardDescription>
                Gerencie seu plano e módulos adicionais
              </CardDescription>
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Plano Atual</p>
              <p className="text-2xl font-bold">{currentPlan?.name || 'Sem plano'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Valor Mensal Total</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(monthlyTotal / 100)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Próximo Vencimento</p>
              <p className="text-2xl font-bold">
                {subscription?.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR')
                  : '-'}
              </p>
            </div>
          </div>

          {subscription?.status === 'past_due' && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Pagamento em atraso</p>
                <p className="text-sm text-muted-foreground">
                  Regularize seu pagamento para continuar usando o sistema.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botões de Suporte */}
      <SupportButtonsSection />

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Planos Disponíveis</TabsTrigger>
          <TabsTrigger value="addons">Módulos Adicionais</TabsTrigger>
          <TabsTrigger value="history">Histórico de Cobranças</TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan?.id === plan.id;
              const features = plan.features_json || [];

              return (
                <Card 
                  key={plan.id} 
                  className={isCurrentPlan ? 'border-primary ring-2 ring-primary/20' : ''}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {isCurrentPlan && (
                        <Badge variant="default">Plano Atual</Badge>
                      )}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-3xl font-bold">
                        {formatCurrency(plan.price_cents / 100)}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>

                    <ul className="space-y-2">
                      {features.slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                      {features.length > 5 && (
                        <li className="text-sm text-muted-foreground">
                          + {features.length - 5} recursos adicionais
                        </li>
                      )}
                    </ul>

                    <Button
                      className="w-full"
                      variant={isCurrentPlan ? 'outline' : 'default'}
                      disabled={isCurrentPlan || requestPlanChange.isPending}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      {isCurrentPlan ? 'Plano Atual' : 'Mudar para este plano'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Addons Tab */}
        <TabsContent value="addons" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {addons.map((addon) => {
              const isActive = isAddonActive(addon.id);
              const isPending = isAddonPending(addon.id);

              return (
                <Card key={addon.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {addon.name}
                      </CardTitle>
                      {isActive && <Badge variant="default">Ativo</Badge>}
                      {isPending && <Badge variant="secondary">Aguardando</Badge>}
                    </div>
                    <CardDescription>{addon.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-2xl font-bold">
                        +{formatCurrency(addon.price_cents / 100)}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>

                    <Button
                      className="w-full"
                      variant={isActive ? 'outline' : 'default'}
                      disabled={isActive || isPending || requestAddon.isPending}
                      onClick={() => setSelectedAddon(addon)}
                    >
                      {isActive ? 'Módulo Ativo' : isPending ? 'Aguardando Pagamento' : 'Contratar Módulo'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            {addons.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Nenhum módulo adicional disponível no momento.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Billing History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Histórico de Cobranças
              </CardTitle>
            </CardHeader>
            <CardContent>
              {billingHistory.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhuma cobrança registrada.
                </p>
              ) : (
                <div className="space-y-3">
                  {billingHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{item.description || 'Cobrança'}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(item.amount_cents / 100)}</p>
                          <Badge
                            variant={
                              item.status === 'paid'
                                ? 'default'
                                : item.status === 'pending'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {item.status === 'paid' ? 'Pago' : item.status === 'pending' ? 'Pendente' : 'Falhou'}
                          </Badge>
                        </div>
                        {item.asaas_invoice_url && item.status === 'pending' && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={item.asaas_invoice_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Pagar
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plan Change Confirmation Dialog */}
      <AlertDialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Mudança de Plano</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a mudar para o plano <strong>{selectedPlan?.name}</strong> por{' '}
              <strong>{formatCurrency((selectedPlan?.price_cents || 0) / 100)}/mês</strong>.
              <br /><br />
              Uma cobrança será gerada e, após o pagamento confirmado, seu plano será atualizado automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPlanChange}>
              {requestPlanChange.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Gerar Cobrança
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Addon Confirmation Dialog */}
      <AlertDialog open={!!selectedAddon} onOpenChange={() => setSelectedAddon(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Contratação de Módulo</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a contratar o módulo <strong>{selectedAddon?.name}</strong> por{' '}
              <strong>+{formatCurrency((selectedAddon?.price_cents || 0) / 100)}/mês</strong>.
              <br /><br />
              Este valor será adicionado à sua mensalidade após o pagamento ser confirmado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAddon}>
              {requestAddon.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Gerar Cobrança
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
