import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompanyAISettings } from '@/hooks/useCompanySettings';
import { useAIProviderConfig, AI_PROVIDERS, AI_MODELS, PROVIDER_BASE_URLS } from '@/hooks/useAIProviderConfig';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Brain, 
  Volume2, 
  Save, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle2,
  TrendingUp,
  Shield,
  Sparkles,
  Key,
  Server,
  Eye,
  EyeOff,
  TestTube,
  Loader2,
  RefreshCw,
  ArrowRightLeft,
} from 'lucide-react';

export default function SettingsAI() {
  const { data, isLoading, upsert, isPending } = useCompanyAISettings();
  const { 
    data: providerConfig, 
    isLoading: isLoadingProvider, 
    upsert: upsertProvider, 
    isPending: isPendingProvider,
    testConnection,
    isTestingConnection 
  } = useAIProviderConfig();
  const { data: userRole } = useUserRole();

  const [chatEnabled, setChatEnabled] = useState(true);
  const [ttsProvider, setTtsProvider] = useState<'openai' | 'elevenlabs'>('openai');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [dailyAnalysisLimit, setDailyAnalysisLimit] = useState(10);
  const [dailyChatLimit, setDailyChatLimit] = useState(50);
  
  // Main AI Provider
  const [mainProvider, setMainProvider] = useState<string>('');
  const [mainApiKey, setMainApiKey] = useState('');
  const [mainBaseUrl, setMainBaseUrl] = useState('');
  const [mainModel, setMainModel] = useState('');
  const [providerActive, setProviderActive] = useState(true);
  
  // Fallback AI Provider
  const [fallbackProvider, setFallbackProvider] = useState<string>('');
  const [fallbackApiKey, setFallbackApiKey] = useState('');
  const [fallbackBaseUrl, setFallbackBaseUrl] = useState('');
  const [fallbackModel, setFallbackModel] = useState('');
  
  // Visibility toggles
  const [showMainKey, setShowMainKey] = useState(false);
  const [showFallbackKey, setShowFallbackKey] = useState(false);

  const { isSuperAdmin } = useUserRoles();
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';

  useEffect(() => {
    if (data) {
      setChatEnabled(data.chat_enabled);
      setTtsProvider(data.tts_provider);
      setTtsEnabled(data.tts_enabled);
      setDailyAnalysisLimit(data.daily_analysis_limit);
      setDailyChatLimit(data.daily_chat_limit);
    }
  }, [data]);

  useEffect(() => {
    if (providerConfig) {
      setMainProvider(providerConfig.provider || '');
      setMainApiKey(providerConfig.api_key_encrypted || '');
      setMainBaseUrl(providerConfig.base_url || '');
      setMainModel(providerConfig.model_default || '');
      setProviderActive(providerConfig.is_active ?? true);
      setFallbackProvider((providerConfig as any).fallback_provider || '');
      setFallbackApiKey((providerConfig as any).fallback_api_key_encrypted || '');
      setFallbackBaseUrl((providerConfig as any).fallback_base_url || '');
      setFallbackModel((providerConfig as any).fallback_model_default || '');
    }
  }, [providerConfig]);

  // Auto-fill base URL when provider changes
  const handleMainProviderChange = (value: string) => {
    setMainProvider(value);
    setMainBaseUrl(PROVIDER_BASE_URLS[value] || '');
    const models = AI_MODELS[value];
    if (models && models.length > 0) {
      setMainModel(models[0].value);
    }
  };

  const handleFallbackProviderChange = (value: string) => {
    setFallbackProvider(value);
    setFallbackBaseUrl(PROVIDER_BASE_URLS[value] || '');
    const models = AI_MODELS[value];
    if (models && models.length > 0) {
      setFallbackModel(models[0].value);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!mainProvider) {
      toast.error('Selecione um provedor de IA principal');
      return;
    }
    if (!mainApiKey) {
      toast.error('Informe a chave de API do provedor principal');
      return;
    }
    if (fallbackProvider && fallbackProvider === mainProvider) {
      toast.error('O provedor de fallback não pode ser o mesmo que o principal');
      return;
    }
    if (fallbackProvider && !fallbackApiKey) {
      toast.error('Informe a chave de API do provedor de fallback');
      return;
    }

    try {
      await upsert({
        chat_provider: mainProvider as any,
        chat_enabled: chatEnabled,
        tts_provider: ttsProvider,
        tts_enabled: ttsEnabled,
        daily_analysis_limit: dailyAnalysisLimit,
        daily_chat_limit: dailyChatLimit,
        use_custom_keys: true,
        preferred_model: mainModel,
      });

      await upsertProvider({
        provider: mainProvider as any,
        api_key_encrypted: mainApiKey || null,
        base_url: mainBaseUrl || PROVIDER_BASE_URLS[mainProvider] || '',
        model_default: mainModel,
        is_active: providerActive,
        fallback_to_lovable: false, // deprecated, unused
        fallback_provider: fallbackProvider || null,
        fallback_api_key_encrypted: fallbackApiKey || null,
        fallback_base_url: fallbackBaseUrl || null,
        fallback_model_default: fallbackModel || null,
      } as any);

      toast.success('Configurações de IA salvas!');
    } catch {
      toast.error('Erro ao salvar configurações');
    }
  };
  
  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 4) + '•'.repeat(Math.min(key.length - 8, 20)) + key.substring(key.length - 4);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Configuração de IA">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const analysisUsage = data ? (data.analysis_count_today / data.daily_analysis_limit) * 100 : 0;
  const chatUsage = data ? (data.chat_count_today / data.daily_chat_limit) * 100 : 0;
  const isAnalysisNearLimit = analysisUsage >= 80;
  const isChatNearLimit = chatUsage >= 80;
  const isAnalysisBlocked = analysisUsage >= 100;
  const isChatBlocked = chatUsage >= 100;

  const mainProviderInfo = AI_PROVIDERS.find(p => p.value === mainProvider);
  const fallbackProviderInfo = AI_PROVIDERS.find(p => p.value === fallbackProvider);

  const renderProviderConfig = (
    type: 'main' | 'fallback',
    provider: string,
    setProvider: (v: string) => void,
    apiKey: string,
    setApiKey: (v: string) => void,
    baseUrl: string,
    setBaseUrl: (v: string) => void,
    model: string,
    setModel: (v: string) => void,
    showKey: boolean,
    setShowKey: (v: boolean) => void,
    handleProviderChange: (v: string) => void,
  ) => {
    const availableProviders = type === 'fallback' 
      ? AI_PROVIDERS.filter(p => p.value !== mainProvider) 
      : AI_PROVIDERS;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Provedor</Label>
          <Select value={provider} onValueChange={handleProviderChange} disabled={!isAdmin}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um provedor..." />
            </SelectTrigger>
            <SelectContent>
              {type === 'fallback' && (
                <SelectItem value="none">
                  <span className="text-muted-foreground">Nenhum (sem fallback)</span>
                </SelectItem>
              )}
              {availableProviders.map(p => (
                <SelectItem key={p.value} value={p.value}>
                  <div className="flex items-center gap-2">
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                    <span className="text-xs text-muted-foreground">— {p.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {provider && provider !== 'none' && (
          <>
            <div className="space-y-2">
              <Label>Chave de API</Label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  placeholder="Insira sua chave de API..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={!isAdmin}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {apiKey && !showKey && (
                <p className="text-xs text-muted-foreground">Salvo: {maskApiKey(apiKey)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              {AI_MODELS[provider] ? (
                <Select value={model} onValueChange={setModel} disabled={!isAdmin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS[provider].map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Nome do modelo customizado"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={!isAdmin}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Endpoint (Base URL)</Label>
              <Input
                placeholder="https://api.example.com/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                URL base da API. Preenchido automaticamente para provedores conhecidos.
              </p>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout title="Configuração de IA">
      <div className="max-w-3xl space-y-6 animate-fade-in">
        {/* Status Header */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className={`border-border/50 shadow-soft ${mainProvider && mainApiKey ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-muted/30'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mainProvider && mainApiKey ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-muted'}`}>
                    <Server className={`w-5 h-5 ${mainProvider && mainApiKey ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-medium">IA Principal</p>
                    <p className="text-xs text-muted-foreground">
                      {mainProviderInfo ? mainProviderInfo.label : 'Não configurado'}
                    </p>
                  </div>
                </div>
                <Badge variant={mainProvider && mainApiKey ? 'default' : 'secondary'} className={mainProvider && mainApiKey ? 'bg-emerald-500' : ''}>
                  {mainProvider && mainApiKey ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" />ON</>
                  ) : 'OFF'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-border/50 shadow-soft ${fallbackProvider && fallbackApiKey ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'bg-muted/30'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${fallbackProvider && fallbackApiKey ? 'bg-blue-100 dark:bg-blue-900' : 'bg-muted'}`}>
                    <RefreshCw className={`w-5 h-5 ${fallbackProvider && fallbackApiKey ? 'text-blue-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-medium">IA Fallback</p>
                    <p className="text-xs text-muted-foreground">
                      {fallbackProviderInfo ? fallbackProviderInfo.label : 'Não configurado'}
                    </p>
                  </div>
                </div>
                <Badge variant={fallbackProvider && fallbackApiKey ? 'default' : 'secondary'} className={fallbackProvider && fallbackApiKey ? 'bg-blue-500' : ''}>
                  {fallbackProvider && fallbackApiKey ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" />ON</>
                  ) : 'OFF'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Alert */}
        {(isAnalysisBlocked || isChatBlocked) && (
          <Alert className="bg-destructive/10 border-destructive/30">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <AlertDescription className="text-destructive">
              <strong>Limite atingido!</strong> O limite será renovado à meia-noite.
            </AlertDescription>
          </Alert>
        )}

        {/* Usage stats */}
        {data && (
          <Card className="border-border/50 shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-display">Consumo Hoje</CardTitle>
                  <CardDescription>Acompanhe o uso diário das funcionalidades de IA</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Análises e Recomendações</span>
                  </div>
                  <span className={`text-sm font-medium ${isAnalysisBlocked ? 'text-destructive' : isAnalysisNearLimit ? 'text-warning' : 'text-muted-foreground'}`}>
                    {data.analysis_count_today} / {data.daily_analysis_limit}
                  </span>
                </div>
                <Progress 
                  value={Math.min(analysisUsage, 100)} 
                  className={`h-2 ${isAnalysisBlocked ? '[&>div]:bg-destructive' : isAnalysisNearLimit ? '[&>div]:bg-warning' : ''}`}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-info" />
                    <span className="text-sm font-medium">Mensagens do Chat</span>
                  </div>
                  <span className={`text-sm font-medium ${isChatBlocked ? 'text-destructive' : isChatNearLimit ? 'text-warning' : 'text-muted-foreground'}`}>
                    {data.chat_count_today} / {data.daily_chat_limit}
                  </span>
                </div>
                <Progress 
                  value={Math.min(chatUsage, 100)} 
                  className={`h-2 ${isChatBlocked ? '[&>div]:bg-destructive' : isChatNearLimit ? '[&>div]:bg-warning' : ''}`}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Provider Configuration */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Server className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-display">Provedores de IA</CardTitle>
                  <CardDescription>Configure o provedor principal e o fallback</CardDescription>
                </div>
              </div>
              <Switch
                checked={providerActive}
                onCheckedChange={setProviderActive}
                disabled={!isAdmin}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="main" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="main" className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  IA Principal
                </TabsTrigger>
                <TabsTrigger value="fallback" className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  IA Fallback
                </TabsTrigger>
              </TabsList>

              <TabsContent value="main" className="space-y-4 mt-4">
                <Alert className="bg-primary/5 border-primary/20">
                  <Server className="w-4 h-4 text-primary" />
                  <AlertDescription>
                    O provedor principal é usado para todas as requisições de IA. Configure com sua própria chave de API.
                  </AlertDescription>
                </Alert>
                {renderProviderConfig(
                  'main', mainProvider, setMainProvider, mainApiKey, setMainApiKey,
                  mainBaseUrl, setMainBaseUrl, mainModel, setMainModel,
                  showMainKey, setShowMainKey, handleMainProviderChange
                )}
              </TabsContent>

              <TabsContent value="fallback" className="space-y-4 mt-4">
                <Alert className="bg-info/5 border-info/20">
                  <ArrowRightLeft className="w-4 h-4 text-info" />
                  <AlertDescription className="text-info">
                    O fallback é acionado automaticamente quando o provedor principal falha, 
                    dá timeout ou retorna erro. <strong>Recomendado</strong> para alta disponibilidade.
                  </AlertDescription>
                </Alert>
                {renderProviderConfig(
                  'fallback', fallbackProvider, setFallbackProvider, fallbackApiKey, setFallbackApiKey,
                  fallbackBaseUrl, setFallbackBaseUrl, fallbackModel, setFallbackModel,
                  showFallbackKey, setShowFallbackKey, handleFallbackProviderChange
                )}
              </TabsContent>
            </Tabs>

            {/* Flow visualization */}
            {mainProvider && (
              <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Fluxo de Execução:
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                  <Badge variant="outline" className="border-success/50 text-success">
                    1. {mainProviderInfo?.label || mainProvider}
                  </Badge>
                  <span>→</span>
                  <span className="text-xs">Se falhar, retry</span>
                  <span>→</span>
                  {fallbackProvider && fallbackProvider !== 'none' ? (
                    <Badge variant="outline" className="border-info/50 text-info">
                      2. {fallbackProviderInfo?.label || fallbackProvider}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-destructive/30 text-destructive">
                      Erro controlado
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Connection */}
        {mainProvider && mainApiKey && (
          <Card className="border-border/50 shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TestTube className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Testar Conexão</p>
                    <p className="text-xs text-muted-foreground">Verifica se a chave de API e endpoint estão funcionando</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => testConnection()}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testando...</>
                  ) : (
                    <><TestTube className="w-4 h-4 mr-2" />Testar</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Limits */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-info" />
              </div>
              <div>
                <CardTitle className="font-display">Limites de Uso</CardTitle>
                <CardDescription>Configure limites diários para controle de custos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Limite Diário de Análises</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={dailyAnalysisLimit}
                  onChange={(e) => setDailyAnalysisLimit(parseInt(e.target.value) || 10)}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label>Limite Diário de Mensagens</Label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={dailyChatLimit}
                  onChange={(e) => setDailyChatLimit(parseInt(e.target.value) || 50)}
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TTS */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                  <Volume2 className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <CardTitle className="font-display">Text-to-Speech</CardTitle>
                  <CardDescription>Leitura automática de pedidos em voz alta</CardDescription>
                </div>
              </div>
              <Switch
                checked={ttsEnabled}
                onCheckedChange={setTtsEnabled}
                disabled={!isAdmin}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provedor</Label>
              <Select 
                value={ttsProvider} 
                onValueChange={(v) => setTtsProvider(v as any)}
                disabled={!isAdmin || !ttsEnabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI TTS</SelectItem>
                  <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* How to get keys */}
        <Card className="border-border/50 shadow-soft">
          <CardContent className="pt-6">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                Como obter as chaves de API:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>OpenAI:</strong> platform.openai.com → API Keys</li>
                <li>• <strong>Google Gemini:</strong> aistudio.google.com → Get API Key</li>
                <li>• <strong>Anthropic:</strong> console.anthropic.com → API Keys</li>
                <li>• <strong>Groq:</strong> console.groq.com → API Keys</li>
                <li>• <strong>Grok (xAI):</strong> console.x.ai → API Keys</li>
                <li>• <strong>Meta LLaMA:</strong> Via Together AI (api.together.xyz) ou servidor próprio</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Button onClick={handleSave} disabled={isPending || isPendingProvider} className="w-full" size="lg">
            <Save className="w-4 h-4 mr-2" />
            {isPending || isPendingProvider ? 'Salvando...' : 'Salvar Configurações de IA'}
          </Button>
        )}

        {!isAdmin && (
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertDescription>
              Apenas administradores podem alterar as configurações de IA.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}
