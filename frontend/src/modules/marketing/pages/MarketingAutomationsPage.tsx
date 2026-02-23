import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Zap,
  UserPlus,
  ShoppingCart,
  Cake,
  UserMinus,
  Gift,
  Settings,
  Play,
  ArrowRight,
  MessageSquare,
  Mail,
  Tag,
} from 'lucide-react';
import { useMarketingAutomations } from '../hooks';
import type { MarketingAutomation } from '../types';

const TRIGGER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  new_customer: UserPlus,
  abandoned_cart: ShoppingCart,
  birthday: Cake,
  inactive: UserMinus,
  post_purchase: Gift,
};

const TRIGGER_LABELS: Record<string, string> = {
  new_customer: 'Novo Cliente',
  abandoned_cart: 'Carrinho Abandonado',
  birthday: 'Aniversário',
  inactive: 'Cliente Inativo',
  post_purchase: 'Pós-Compra',
};

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  send_whatsapp: MessageSquare,
  send_email: Mail,
  send_sms: MessageSquare,
  apply_coupon: Tag,
};

const ACTION_LABELS: Record<string, string> = {
  send_whatsapp: 'Enviar WhatsApp',
  send_email: 'Enviar E-mail',
  send_sms: 'Enviar SMS',
  apply_coupon: 'Aplicar Cupom',
};

export function MarketingAutomationsPage() {
  const { automations, activeAutomations, isLoading, toggleAutomation } = useMarketingAutomations();

  const renderAutomationCard = (automation: MarketingAutomation) => {
    const TriggerIcon = TRIGGER_ICONS[automation.trigger_type] || Zap;
    const ActionIcon = ACTION_ICONS[automation.action_type] || Zap;

    return (
      <Card key={automation.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${automation.is_active ? 'bg-yellow-500/10' : 'bg-muted'}`}>
                <Zap className={`w-5 h-5 ${automation.is_active ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h3 className="font-medium">{automation.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {automation.executions_count} execuções
                </p>
              </div>
            </div>
            <Switch
              checked={automation.is_active}
              onCheckedChange={(checked) =>
                toggleAutomation.mutate({ id: automation.id, is_active: checked })
              }
            />
          </div>

          {/* Flow Visualization */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="flex flex-col items-center gap-1">
              <div className="p-2 rounded-lg bg-background border">
                <TriggerIcon className="w-4 h-4" />
              </div>
              <span className="text-xs text-muted-foreground">Gatilho</span>
            </div>
            
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            
            <div className="flex-1 text-center">
              <Badge variant="outline">{TRIGGER_LABELS[automation.trigger_type]}</Badge>
            </div>
            
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            
            <div className="flex flex-col items-center gap-1">
              <div className="p-2 rounded-lg bg-background border">
                <ActionIcon className="w-4 h-4" />
              </div>
              <span className="text-xs text-muted-foreground">Ação</span>
            </div>
            
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            
            <div className="flex-1 text-center">
              <Badge variant="outline">{ACTION_LABELS[automation.action_type]}</Badge>
            </div>
          </div>

          {/* Config Preview */}
          {automation.action_config && (automation.action_config as Record<string, unknown>).template && (
            <div className="mt-3 p-3 rounded-lg border border-dashed text-sm text-muted-foreground">
              "{((automation.action_config as Record<string, unknown>).template as string).slice(0, 80)}..."
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={automation.is_active ? 'default' : 'secondary'}>
                {automation.is_active ? 'Ativa' : 'Inativa'}
              </Badge>
              {automation.last_executed_at && (
                <span className="text-xs text-muted-foreground">
                  Última execução: {new Date(automation.last_executed_at).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Automações</h1>
            <p className="text-muted-foreground">
              Configure fluxos automáticos de marketing
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Play className="w-4 h-4 mr-2" />
            {activeAutomations.length} ativas
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{automations.length}</p>
                <p className="text-sm text-muted-foreground">Total de Automações</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-500">{activeAutomations.length}</p>
                <p className="text-sm text-muted-foreground">Ativas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {automations.reduce((acc, a) => acc + a.executions_count, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Execuções Totais</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-500">24h</p>
                <p className="text-sm text-muted-foreground">Operando</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Automations List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Todas as Automações</h2>
          {automations.map(renderAutomationCard)}
        </div>

        {/* Help Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-background">
                <Zap className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Como funcionam as automações?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  As automações são executadas automaticamente quando um gatilho é acionado.
                  Por exemplo, quando um novo cliente se cadastra, a automação de boas-vindas
                  envia uma mensagem de WhatsApp automaticamente.
                </p>
                <Button variant="outline" size="sm">
                  Saiba mais
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
