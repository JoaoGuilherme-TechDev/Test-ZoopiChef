import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Activity,
  DollarSign,
  RefreshCw,
  ExternalLink,
  Shield,
  Key,
  Building2,
  TestTube
} from 'lucide-react';
import { useFiservIntegration } from '@/modules/integrations/hooks/useFiservIntegration';
import { toast } from 'sonner';

export default function FiservSettings() {
  const { 
    config, 
    isConfigLoading, 
    transactions, 
    isTransactionsLoading,
    stats,
    isStatsLoading,
    toggleFiserv,
    toggleProduction 
  } = useFiservIntegration();

  const [credentials, setCredentials] = useState({
    api_key: '',
    api_secret: '',
    merchant_id: '',
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      approved: { label: 'Aprovado', variant: 'default' },
      APPROVED: { label: 'Aprovado', variant: 'default' },
      declined: { label: 'Recusado', variant: 'destructive' },
      DECLINED: { label: 'Recusado', variant: 'destructive' },
      pending: { label: 'Pendente', variant: 'secondary' },
      PENDING: { label: 'Pendente', variant: 'secondary' },
    };

    const config = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isConfigured = !!config?.is_active;
  const isProduction = config?.environment === 'production';

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-primary" />
              Integração Fiserv
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure a integração com o gateway de pagamentos Fiserv
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isConfigured ? (
              <Badge variant="default" className="text-sm px-3 py-1">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Ativo
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-sm px-3 py-1">
                <XCircle className="h-4 w-4 mr-2" />
                Inativo
              </Badge>
            )}
            
            {isProduction ? (
              <Badge variant="destructive" className="text-sm px-3 py-1">
                <Shield className="h-4 w-4 mr-2" />
                Produção
              </Badge>
            ) : (
              <Badge variant="outline" className="text-sm px-3 py-1">
                <TestTube className="h-4 w-4 mr-2" />
                Sandbox
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList>
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <Activity className="h-4 w-4 mr-2" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="stats">
              <DollarSign className="h-4 w-4 mr-2" />
              Estatísticas
            </TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Status da Integração
                  </CardTitle>
                  <CardDescription>
                    Ative ou desative a integração Fiserv
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Integração Ativa</Label>
                      <p className="text-sm text-muted-foreground">
                        Habilita o processamento de pagamentos via Fiserv
                      </p>
                    </div>
                    <Switch
                      checked={config?.is_active ?? false}
                      onCheckedChange={(checked) => toggleFiserv.mutate(checked)}
                      disabled={toggleFiserv.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Modo Produção</Label>
                      <p className="text-sm text-muted-foreground">
                        Use credenciais de produção (transações reais)
                      </p>
                    </div>
                    <Switch
                      checked={isProduction}
                      onCheckedChange={(checked) => toggleProduction.mutate(checked)}
                      disabled={!config?.is_active || toggleProduction.isPending}
                    />
                  </div>

                  {isProduction && (
                    <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <strong className="text-destructive">Atenção:</strong> Modo produção ativo. 
                        Todas as transações serão processadas com valores reais.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Credentials Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Credenciais
                  </CardTitle>
                  <CardDescription>
                    Configure as credenciais de acesso da Fiserv
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api_key">API Key</Label>
                    <Input
                      id="api_key"
                      type="password"
                      placeholder="••••••••••••••••"
                      value={credentials.api_key}
                      onChange={(e) => setCredentials(prev => ({ ...prev, api_key: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api_secret">API Secret</Label>
                    <Input
                      id="api_secret"
                      type="password"
                      placeholder="••••••••••••••••"
                      value={credentials.api_secret}
                      onChange={(e) => setCredentials(prev => ({ ...prev, api_secret: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="merchant_id">Merchant ID</Label>
                    <Input
                      id="merchant_id"
                      placeholder="Digite o Merchant ID"
                      value={credentials.merchant_id}
                      onChange={(e) => setCredentials(prev => ({ ...prev, merchant_id: e.target.value }))}
                    />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    As credenciais são armazenadas de forma segura como secrets do projeto.
                  </div>

                  <Button 
                    className="w-full"
                    disabled={!credentials.api_key || !credentials.api_secret || !credentials.merchant_id}
                    onClick={() => {
                      toast.info('Para salvar as credenciais, adicione-as como secrets do projeto.');
                    }}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Salvar Credenciais
                  </Button>
                </CardContent>
              </Card>

              {/* Documentation Card */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Documentação e Recursos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Button variant="outline" asChild>
                      <a href="https://docs.fiserv.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Portal do Desenvolvedor
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href="https://docs.fiserv.com/docs/api-reference" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Referência da API
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href="https://docs.fiserv.com/docs/payment-links" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Links de Pagamento
                      </a>
                    </Button>
                  </div>

                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Métodos de Pagamento Suportados</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Cartão de Crédito</Badge>
                      <Badge variant="outline">Cartão de Débito</Badge>
                      <Badge variant="outline">PIX</Badge>
                      <Badge variant="outline">Boleto</Badge>
                      <Badge variant="outline">Tokenização</Badge>
                      <Badge variant="outline">Estorno</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Transações Recentes
                </CardTitle>
                <CardDescription>
                  Últimas 50 transações processadas via Fiserv
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isTransactionsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                    Carregando transações...
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma transação encontrada</p>
                    <p className="text-sm">As transações aparecerão aqui após serem processadas</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div 
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {tx.payment_type?.toUpperCase()}
                              {tx.card_brand && (
                                <Badge variant="outline" className="text-xs">
                                  {tx.card_brand}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(tx.created_at)}
                              {tx.card_last_digits && ` • •••• ${tx.card_last_digits}`}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(tx.amount_cents)}
                          </div>
                          {getStatusBadge(tx.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Transações (Hoje)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats?.total_transactions ?? 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Aprovadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {stats?.approved ?? 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Recusadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {stats?.declined ?? 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Volume Aprovado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {formatCurrency(stats?.total_amount_cents ?? 0)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
