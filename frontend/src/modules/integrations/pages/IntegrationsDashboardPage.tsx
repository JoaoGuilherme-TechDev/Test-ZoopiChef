import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  CreditCard, 
  Settings, 
  CheckCircle, 
  XCircle,
  Zap,
  Webhook,
  Bell,
  Package
} from 'lucide-react';
import { useWhatsAppIntegration } from '../hooks/useWhatsAppIntegration';
import { usePaymentIntegration } from '../hooks/usePaymentIntegration';
import { Link } from 'react-router-dom';

export default function IntegrationsDashboardPage() {
  const { isConfigured: whatsappConfigured, isLoading: whatsappLoading } = useWhatsAppIntegration();
  const { isConfigured: paymentConfigured, isLoading: paymentLoading } = usePaymentIntegration();

  const integrations = [
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Envie mensagens automáticas e gerencie conversas',
      icon: MessageSquare,
      isConfigured: whatsappConfigured,
      isLoading: whatsappLoading,
      settingsPath: '/settings/integrations',
      color: 'text-green-500',
      features: ['Notificações de pedido', 'Campanhas de marketing', 'Atendimento automatizado']
    },
    {
      id: 'payments',
      name: 'Gateway de Pagamentos',
      description: 'Aceite PIX, cartões e boletos',
      icon: CreditCard,
      isConfigured: paymentConfigured,
      isLoading: paymentLoading,
      settingsPath: '/settings/integrations',
      color: 'text-blue-500',
      features: ['PIX instantâneo', 'Cartão de crédito/débito', 'Boleto bancário']
    },
    {
      id: 'webhooks',
      name: 'Webhooks',
      description: 'Integre com sistemas externos via webhooks',
      icon: Webhook,
      isConfigured: false,
      isLoading: false,
      settingsPath: '/settings/integrations',
      color: 'text-purple-500',
      features: ['Eventos de pedido', 'Atualizações de status', 'Sincronização de estoque']
    },
    {
      id: 'notifications',
      name: 'Notificações Push',
      description: 'Envie notificações para clientes e equipe',
      icon: Bell,
      isConfigured: false,
      isLoading: false,
      settingsPath: '/settings/integrations',
      color: 'text-orange-500',
      features: ['Alertas de pedido', 'Promoções', 'Status de entrega']
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Integrações</h1>
            <p className="text-muted-foreground">
              Conecte seu negócio a serviços externos
            </p>
          </div>
          <Button asChild>
            <Link to="/settings/integrations">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Link>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Zap className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {integrations.filter(i => i.isConfigured).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{integrations.length}</p>
                  <p className="text-sm text-muted-foreground">Disponíveis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((integration) => (
            <Card key={integration.id} className={integration.isConfigured ? 'border-green-500/50' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg bg-muted`}>
                      <integration.icon className={`w-6 h-6 ${integration.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={integration.isConfigured ? 'default' : 'secondary'}
                    className={integration.isConfigured ? 'bg-green-500' : ''}
                  >
                    {integration.isLoading ? (
                      'Verificando...'
                    ) : integration.isConfigured ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Conectado
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Não configurado
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {integration.features.map((feature, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    variant={integration.isConfigured ? 'outline' : 'default'}
                    className="w-full"
                    asChild
                  >
                    <Link to={integration.settingsPath}>
                      <Settings className="w-4 h-4 mr-2" />
                      {integration.isConfigured ? 'Gerenciar' : 'Configurar'}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
