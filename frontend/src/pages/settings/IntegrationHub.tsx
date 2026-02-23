import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageCircle, 
  MapPin, 
  ShoppingBag, 
  CreditCard, 
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Save,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Zap,
  FileText
} from 'lucide-react';
import { IntegraNotasConfigSection } from '@/components/fiscal';
import { MachineDeliveryPanel } from '@/components/integrations/MachineDeliveryPanel';
import { OpenDeliveryPanel } from '@/components/integrations/OpenDeliveryPanel';
import { PagBankPanel } from '@/components/integrations/PagBankPanel';
import { CieloPanel } from '@/components/integrations/CieloPanel';
import { CloverPanel } from '@/components/integrations/CloverPanel';
import { ERedePanel } from '@/components/integrations/ERedePanel';
import { AiqfomePanel } from '@/components/integrations/AiqfomePanel';

interface IntegrationStatus {
  id: string;
  name: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastSync?: string;
  errorMessage?: string;
}

const INTEGRATION_CATEGORIES = [
  { id: 'messaging', label: 'Mensageria', icon: MessageCircle },
  { id: 'maps', label: 'Mapas & Rotas', icon: MapPin },
  { id: 'marketplace', label: 'Marketplaces', icon: ShoppingBag },
  { id: 'delivery', label: 'Entregas', icon: MapPin },
  { id: 'payments', label: 'Pagamentos', icon: CreditCard },
  { id: 'pos', label: 'POS / TEF', icon: Smartphone },
  { id: 'fiscal', label: 'Fiscal', icon: FileText },
];

export default function IntegrationHub() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('messaging');
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);

  // Fetch all integration statuses
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['all-integrations', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      // Fetch company_integrations (WhatsApp, Pix, etc.)
      const { data: companyInt } = await supabase
        .from('company_integrations')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      // Fetch marketplace integrations
      const { data: marketplaceInt } = await supabase
        .from('marketplace_integrations')
        .select('*')
        .eq('company_id', company.id);

      // Fetch TEF integrations
      const { data: tefInt } = await supabase
        .from('tef_integrations')
        .select('*')
        .eq('company_id', company.id);

      // Fetch Google Calendar (for maps API key storage)
      const { data: googleInt } = await supabase
        .from('google_calendar_integrations')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      // Fetch fiscal config
      const { data: fiscalInt } = await supabase
        .from('fiscal_config')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      // Fetch Machine delivery config
      const { data: machineInt } = await (supabase as any)
        .from('machine_delivery_config')
        .select('is_enabled')
        .eq('company_id', company.id)
        .maybeSingle();

      // Fetch OpenDelivery config
      const { data: odInt } = await (supabase as any)
        .from('opendelivery_config')
        .select('is_enabled')
        .eq('company_id', company.id)
        .maybeSingle();

      // Fetch PagBank config
      const { data: pagbankInt } = await (supabase as any)
        .from('pagbank_config')
        .select('is_enabled')
        .eq('company_id', company.id)
        .maybeSingle();

      // Fetch Cielo config
      const { data: cieloInt } = await (supabase as any)
        .from('cielo_config')
        .select('is_enabled')
        .eq('company_id', company.id)
        .maybeSingle();

      // Fetch Clover config
      const { data: cloverInt } = await (supabase as any)
        .from('clover_config')
        .select('is_enabled')
        .eq('company_id', company.id)
        .maybeSingle();

      // Fetch e.Rede config
      const { data: eredeInt } = await (supabase as any)
        .from('erede_config')
        .select('is_enabled')
        .eq('company_id', company.id)
        .maybeSingle();

      // Cast to access is_enabled which may not be in types yet
      const fiscalData = fiscalInt as Record<string, unknown> | null;

      return {
        company: companyInt,
        marketplace: marketplaceInt || [],
        tef: tefInt || [],
        google: googleInt,
        fiscal: fiscalData ? { is_enabled: !!fiscalData.is_enabled } : null,
        machine: machineInt as { is_enabled: boolean } | null,
        opendelivery: odInt as { is_enabled: boolean } | null,
        pagbank: pagbankInt as { is_enabled: boolean } | null,
        cielo: cieloInt as { is_enabled: boolean } | null,
        clover: cloverInt as { is_enabled: boolean } | null,
        erede: eredeInt as { is_enabled: boolean } | null,
      };
    },
    enabled: !!company?.id,
  });

  // Test integration connection
  const testConnection = useMutation({
    mutationFn: async ({ type, provider }: { type: string; provider: string }) => {
      setTestingIntegration(`${type}-${provider}`);
      
      if (type === 'whatsapp') {
        const { data, error } = await supabase.functions.invoke('send-whatsapp', {
          body: { action: 'test', company_id: company?.id },
        });
        if (error) throw error;
        return data;
      }
      
      if (type === 'marketplace') {
        const { data, error } = await supabase.functions.invoke('marketplace-auth', {
          body: { action: 'refresh', provider, integrationId: provider },
        });
        if (error) throw error;
        return data;
      }

      if (type === 'asaas') {
        const { data, error } = await supabase.functions.invoke('asaas-billing', {
          body: { action: 'test', company_id: company?.id },
        });
        if (error) throw error;
        return data;
      }

      return { success: true };
    },
    onSuccess: (data) => {
      toast.success('Conexão testada com sucesso!');
      setTestingIntegration(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro no teste: ${error.message}`);
      setTestingIntegration(null);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-emerald-500"><CheckCircle2 className="w-3 h-3 mr-1" />Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>;
      case 'pending':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="outline">Desconectado</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Central de Integrações">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Central de Integrações">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Central de Integrações</h1>
              <p className="text-muted-foreground">Gerencie todas as suas integrações em um só lugar</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['all-integrations'] })}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar Status
          </Button>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {INTEGRATION_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            let count = 0;
            let connected = 0;

            if (cat.id === 'messaging') {
              count = 1;
              connected = integrations?.company?.whatsapp_enabled ? 1 : 0;
            } else if (cat.id === 'marketplace') {
              count = integrations?.marketplace?.length || 0;
              connected = integrations?.marketplace?.filter((m: any) => m.status === 'connected').length || 0;
            } else if (cat.id === 'payments') {
              count = 6;
              connected = (integrations?.company?.pix_enabled ? 1 : 0) + 
                         (integrations?.company?.stripe_enabled ? 1 : 0) +
                         (integrations?.pagbank?.is_enabled ? 1 : 0) +
                         (integrations?.cielo?.is_enabled ? 1 : 0) +
                         (integrations?.clover?.is_enabled ? 1 : 0) +
                         (integrations?.erede?.is_enabled ? 1 : 0);
            } else if (cat.id === 'pos') {
              count = integrations?.tef?.length || 0;
              connected = integrations?.tef?.filter((t: any) => t.is_active).length || 0;
            } else if (cat.id === 'fiscal') {
              count = 1;
              connected = integrations?.fiscal?.is_enabled ? 1 : 0;
            } else if (cat.id === 'delivery') {
              count = 2;
              connected = (integrations?.machine?.is_enabled ? 1 : 0) +
                          (integrations?.opendelivery?.is_enabled ? 1 : 0);
            }

            return (
              <Card 
                key={cat.id}
                className={`cursor-pointer transition-all hover:shadow-md ${activeTab === cat.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setActiveTab(cat.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {connected}/{count || 0} ativas
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Integration Details */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            {INTEGRATION_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <TabsTrigger key={cat.id} value={cat.id}>
                  <Icon className="w-4 h-4 mr-2" />
                  {cat.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Messaging Tab */}
          <TabsContent value="messaging" className="space-y-4">
            <WhatsAppIntegrationCard 
              data={integrations?.company} 
              onTest={() => testConnection.mutate({ type: 'whatsapp', provider: 'whatsapp' })}
              isTesting={testingIntegration === 'whatsapp-whatsapp'}
            />
          </TabsContent>

          {/* Maps Tab */}
          <TabsContent value="maps" className="space-y-4">
            <GoogleMapsIntegrationCard companyId={company?.id} />
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-4">
            <MarketplaceIntegrationsPanel 
              integrations={integrations?.marketplace || []}
              companyId={company?.id}
            />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <PagBankPanel />
            <CieloPanel />
            <CloverPanel />
            <ERedePanel />
            <PaymentsIntegrationPanel data={integrations?.company} companyId={company?.id} />
          </TabsContent>

          {/* POS Tab */}
          <TabsContent value="pos" className="space-y-4">
            <TEFIntegrationPanel 
              integrations={integrations?.tef || []}
              companyId={company?.id}
            />
          </TabsContent>

          {/* Delivery Tab */}
          <TabsContent value="delivery" className="space-y-4">
            <MachineDeliveryPanel />
            <OpenDeliveryPanel />
            <AiqfomePanel />
          </TabsContent>

          {/* Fiscal Tab */}
          <TabsContent value="fiscal" className="space-y-4">
            <IntegraNotasConfigSection />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// WhatsApp Integration Card
function WhatsAppIntegrationCard({ data, onTest, isTesting }: { data: any; onTest: () => void; isTesting: boolean }) {
  const status = data?.whatsapp_enabled ? 'connected' : 'disconnected';
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <CardTitle>WhatsApp Business</CardTitle>
              <CardDescription>Notificações e mensagens automáticas</CardDescription>
            </div>
          </div>
          <Badge className={status === 'connected' ? 'bg-emerald-500' : ''}>
            {status === 'connected' ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Provedor</p>
            <p className="font-medium">{data?.whatsapp_provider || 'Não configurado'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Número</p>
            <p className="font-medium">{data?.whatsapp_default_number || 'Não configurado'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onTest} disabled={isTesting}>
            {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Testar Conexão
          </Button>
          <Button variant="outline" asChild>
            <a href="/settings/integrations">
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </a>
          </Button>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure seu provedor WhatsApp (Z-API, Twilio, Evolution ou Meta Cloud) para enviar notificações automáticas de pedidos, entregas e filas de espera.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Google Maps Integration Card
function GoogleMapsIntegrationCard({ companyId }: { companyId?: string }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  useEffect(() => {
    // Check if API key exists in secrets (we just check if geocoding works)
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('geocode-address', {
          body: { address: 'Test', company_id: companyId },
        });
        if (data?.lat) setStatus('connected');
      } catch {
        setStatus('disconnected');
      }
    };
    if (companyId) checkConnection();
  }, [companyId]);

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address: 'Av. Paulista, 1000, São Paulo, SP', company_id: companyId },
      });
      if (error) throw error;
      if (data?.lat && data?.lng) {
        toast.success(`Geocodificação OK! Lat: ${data.lat.toFixed(4)}, Lng: ${data.lng.toFixed(4)}`);
        setStatus('connected');
      } else {
        toast.warning('Geocodificação retornou resultado vazio');
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
      setStatus('error');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <CardTitle>Google Maps</CardTitle>
              <CardDescription>Rotas de entrega, geocodificação e ETA</CardDescription>
            </div>
          </div>
          <Badge className={status === 'connected' ? 'bg-emerald-500' : status === 'error' ? 'bg-destructive' : ''}>
            {status === 'connected' ? 'Conectado' : status === 'error' ? 'Erro' : 'Usando fallback'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            O sistema usa OSRM (gratuito) como fallback para rotas. Para maior precisão, configure uma API Key do Google Maps nas variáveis de ambiente: <code className="bg-muted px-1 rounded">GOOGLE_MAPS_API_KEY</code>
          </AlertDescription>
        </Alert>
        
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Funcionalidades Disponíveis</Label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Geocodificação de endereços</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Cálculo de rotas</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Estimativa de tempo (ETA)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Abrir no Google Maps</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTest} disabled={isTesting}>
            {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Testar Geocodificação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Marketplace Integrations Panel
function MarketplaceIntegrationsPanel({ integrations, companyId }: { integrations: any[]; companyId?: string }) {
  const queryClient = useQueryClient();
  const [addingProvider, setAddingProvider] = useState<string | null>(null);

  const PROVIDERS = [
    { id: 'ifood', name: 'iFood', logo: '🍔', color: 'bg-red-500' },
    { id: 'aiqfome', name: 'AiqFome', logo: '🍕', color: 'bg-orange-500' },
    { id: 'keeta', name: 'Keeta', logo: '🛵', color: 'bg-purple-500' },
    { id: 'rappi', name: 'Rappi', logo: '📦', color: 'bg-orange-400' },
  ];

  const addIntegration = useMutation({
    mutationFn: async (provider: string) => {
      setAddingProvider(provider);
      const { data, error } = await supabase
        .from('marketplace_integrations')
        .insert({
          company_id: companyId,
          provider,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-integrations'] });
      toast.success('Integração adicionada! Configure as credenciais.');
      setAddingProvider(null);
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
      setAddingProvider(null);
    },
  });

  const removeIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketplace_integrations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-integrations'] });
      toast.success('Integração removida');
    },
  });

  const activeProviders = integrations.map((i) => i.provider);

  return (
    <div className="space-y-4">
      {/* Active Integrations */}
      {integrations.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Integrações Ativas</h3>
          {integrations.map((int) => {
            const provider = PROVIDERS.find((p) => p.id === int.provider);
            return (
              <Card key={int.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${provider?.color || 'bg-muted'} rounded-lg flex items-center justify-center text-xl`}>
                        {provider?.logo}
                      </div>
                      <div>
                        <p className="font-medium">{provider?.name || int.provider}</p>
                        <p className="text-xs text-muted-foreground">
                          {int.merchant_id ? `ID: ${int.merchant_id}` : 'Não configurado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={int.status === 'connected' ? 'bg-emerald-500' : int.status === 'error' ? 'bg-destructive' : ''}>
                        {int.status === 'connected' ? 'Conectado' : int.status === 'error' ? 'Erro' : 'Pendente'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeIntegration.mutate(int.id)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {int.error_message && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertDescription>{int.error_message}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add New Integration */}
      <div className="space-y-3">
        <h3 className="font-semibold">Adicionar Integração</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PROVIDERS.filter((p) => !activeProviders.includes(p.id)).map((provider) => (
            <Card 
              key={provider.id}
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => addIntegration.mutate(provider.id)}
            >
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <div className={`w-12 h-12 ${provider.color} rounded-xl flex items-center justify-center text-2xl`}>
                  {provider.logo}
                </div>
                <p className="font-medium text-sm">{provider.name}</p>
                {addingProvider === provider.id && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          As credenciais dos marketplaces (Client ID, Client Secret) devem ser configuradas nas variáveis de ambiente do projeto. 
          Exemplo: <code className="bg-muted px-1 rounded">IFOOD_CLIENT_ID</code>, <code className="bg-muted px-1 rounded">IFOOD_CLIENT_SECRET</code>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Payments Integration Panel
function PaymentsIntegrationPanel({ data, companyId }: { data: any; companyId?: string }) {
  return (
    <div className="space-y-4">
      {/* Asaas Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <CardTitle>Asaas</CardTitle>
                <CardDescription>PIX, Boleto e Cartão de Crédito</CardDescription>
              </div>
            </div>
            <Badge className={data?.payment_gateway === 'asaas' ? 'bg-emerald-500' : ''}>
              {data?.payment_gateway === 'asaas' ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-500">PIX</p>
              <p className="text-xs text-muted-foreground">Instantâneo</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-orange-500">Boleto</p>
              <p className="text-xs text-muted-foreground">Até 3 dias</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-500">Cartão</p>
              <p className="text-xs text-muted-foreground">Crédito/Débito</p>
            </div>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Configure a API Key do Asaas nas variáveis de ambiente: <code className="bg-muted px-1 rounded">ASAAS_API_KEY</code>. 
              Para sandbox, adicione também <code className="bg-muted px-1 rounded">ASAAS_SANDBOX=true</code>
            </AlertDescription>
          </Alert>
          <Button variant="outline" asChild>
            <a href="/settings/integrations">
              <Settings className="w-4 h-4 mr-2" />
              Configurar Pagamentos
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* PIX Manual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <CardTitle>PIX Manual</CardTitle>
                <CardDescription>Chave PIX para pagamento direto</CardDescription>
              </div>
            </div>
            <Badge className={data?.pix_enabled ? 'bg-emerald-500' : ''}>
              {data?.pix_enabled ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Tipo de Chave</p>
              <p className="font-medium">{data?.pix_key_type || 'Não configurado'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Chave</p>
              <p className="font-medium">{data?.pix_key ? '••••••••' : 'Não configurado'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// TEF Integration Panel
function TEFIntegrationPanel({ integrations, companyId }: { integrations: any[]; companyId?: string }) {
  const queryClient = useQueryClient();
  const [addingProvider, setAddingProvider] = useState<string | null>(null);

  const PROVIDERS = [
    { id: 'stone', name: 'Stone', description: 'Maquininhas Stone' },
    { id: 'rede', name: 'Rede', description: 'Rede Itaú' },
    { id: 'cielo', name: 'Cielo', description: 'Cielo LIO' },
    { id: 'getnet', name: 'GetNet', description: 'Santander GetNet' },
    { id: 'pagseguro', name: 'PagSeguro', description: 'PagBank / PagSeguro' },
    { id: 'mercadopago', name: 'Mercado Pago', description: 'Point / Smart' },
  ];

  const addIntegration = useMutation({
    mutationFn: async (provider: string) => {
      setAddingProvider(provider);
      const { data, error } = await supabase
        .from('tef_integrations')
        .insert({
          company_id: companyId,
          provider,
          environment: 'sandbox',
          is_active: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-integrations'] });
      toast.success('TEF adicionado! Configure as credenciais.');
      setAddingProvider(null);
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
      setAddingProvider(null);
    },
  });

  const activeProviders = integrations.map((i) => i.provider);

  return (
    <div className="space-y-4">
      {/* Active TEF */}
      {integrations.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">TEF / POS Configurados</h3>
          {integrations.map((int) => {
            const provider = PROVIDERS.find((p) => p.id === int.provider);
            return (
              <Card key={int.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{provider?.name || int.provider}</p>
                        <p className="text-xs text-muted-foreground">
                          {int.terminal_id ? `Terminal: ${int.terminal_id}` : 'Terminal não configurado'} • 
                          {int.environment === 'sandbox' ? ' Sandbox' : ' Produção'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={int.is_active} disabled />
                      <Badge className={int.is_active ? 'bg-emerald-500' : ''}>
                        {int.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add New TEF */}
      <div className="space-y-3">
        <h3 className="font-semibold">Adicionar TEF / POS</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PROVIDERS.filter((p) => !activeProviders.includes(p.id)).map((provider) => (
            <Card 
              key={provider.id}
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => addIntegration.mutate(provider.id)}
            >
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <p className="font-medium text-sm">{provider.name}</p>
                <p className="text-xs text-muted-foreground text-center">{provider.description}</p>
                {addingProvider === provider.id && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          A integração TEF permite pagamentos com cartão diretamente no PDV, Totem e SmartPOS. 
          Configure as credenciais específicas de cada operadora nas variáveis de ambiente.
        </AlertDescription>
      </Alert>
    </div>
  );
}
