import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompanyIntegrations } from '@/hooks/useCompanySettings';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useWhatsAppTemplates, TEMPLATE_TYPES, TEMPLATE_VARIABLES } from '@/hooks/useWhatsAppTemplates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { MessageCircle, CreditCard, Save, Eye, EyeOff, Bot, Bell, Clock, FileText, ChevronDown, Copy, Check, Instagram, ExternalLink, Info } from 'lucide-react';

import { WhatsAppTemplate } from '@/hooks/useWhatsAppTemplates';

// Template Editor Component
interface TemplateEditorProps {
  templateType: string;
  templateName: string;
  description: string;
  defaultMessage: string;
  currentTemplate: WhatsAppTemplate;
  onSave: (message: string) => void;
  onToggle: (isActive: boolean) => void;
  isAdmin: boolean;
  isSaving: boolean;
}

function TemplateEditor({
  templateType,
  templateName,
  description,
  defaultMessage,
  currentTemplate,
  onSave,
  onToggle,
  isAdmin,
  isSaving,
}: TemplateEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState(currentTemplate.message_template || defaultMessage);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setMessage(currentTemplate.message_template || defaultMessage);
    setHasChanges(false);
  }, [currentTemplate.message_template, defaultMessage]);

  const handleMessageChange = (value: string) => {
    setMessage(value);
    setHasChanges(value !== (currentTemplate.message_template || defaultMessage));
  };

  const handleSave = () => {
    onSave(message);
    setHasChanges(false);
  };

  const handleReset = () => {
    setMessage(defaultMessage);
    setHasChanges(defaultMessage !== (currentTemplate.message_template || defaultMessage));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg overflow-hidden">
        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Switch
              checked={currentTemplate.is_active}
              onCheckedChange={(checked) => {
                onToggle(checked);
              }}
              onClick={(e) => e.stopPropagation()}
              disabled={!isAdmin}
            />
            <div className="text-left">
              <p className="font-medium text-sm">{templateName}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && <Badge variant="outline" className="text-xs">Alterado</Badge>}
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-3 border-t">
            <Textarea
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              rows={3}
              disabled={!isAdmin}
              placeholder={defaultMessage}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isAdmin || isSaving || !hasChanges}
              >
                <Save className="w-3 h-3 mr-1" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={!isAdmin}
              >
                Restaurar Padrão
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function SettingsIntegrations() {
  const { data, isLoading, upsert, isPending } = useCompanyIntegrations();
  const { data: userRole } = useUserRole();
  const { templates, getTemplate, upsertTemplate, toggleTemplate, isLoading: templatesLoading } = useWhatsAppTemplates();
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  // WhatsApp Connection
  const [whatsappProvider, setWhatsappProvider] = useState<'zapi' | 'twilio' | 'evolution' | 'meta_cloud' | ''>('');
  const [whatsappApiKey, setWhatsappApiKey] = useState('');
  const [whatsappInstanceId, setWhatsappInstanceId] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // WhatsApp Bot Settings
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyTemplate, setAutoReplyTemplate] = useState('Olá! 👋 Obrigado por entrar em contato. Acesse nosso cardápio e faça seu pedido: {menu_link}');
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  const [statusNotificationsEnabled, setStatusNotificationsEnabled] = useState(true);
  const [antiSpamMinutes, setAntiSpamMinutes] = useState(30);

  // Pix
  const [pixProvider, setPixProvider] = useState<'mercadopago' | 'asaas' | 'manual' | ''>('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | ''>('');
  const [pixEnabled, setPixEnabled] = useState(false);

  // Instagram
  const [instagramEnabled, setInstagramEnabled] = useState(false);
  const [instagramAccessToken, setInstagramAccessToken] = useState('');
  const [instagramBusinessAccountId, setInstagramBusinessAccountId] = useState('');
  const [showInstagramToken, setShowInstagramToken] = useState(false);

  // Stripe / Payment Gateway
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');
  const [paymentGateway, setPaymentGateway] = useState<'stripe' | 'mercadopago' | 'asaas' | 'manual'>('manual');
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const { isSuperAdmin } = useUserRoles();
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';

  useEffect(() => {
    if (data) {
      setWhatsappProvider((data as any).whatsapp_provider || '');
      setWhatsappInstanceId((data as any).whatsapp_instance_id || '');
      setWhatsappNumber((data as any).whatsapp_default_number || '');
      setWhatsappEnabled((data as any).whatsapp_enabled || false);
      setAutoReplyEnabled((data as any).auto_reply_enabled || false);
      setAutoReplyTemplate((data as any).auto_reply_template || 'Olá! 👋 Obrigado por entrar em contato. Acesse nosso cardápio e faça seu pedido: {menu_link}');
      setQuietHoursStart((data as any).quiet_hours_start || '22:00');
      setQuietHoursEnd((data as any).quiet_hours_end || '08:00');
      setStatusNotificationsEnabled((data as any).status_notifications_enabled ?? true);
      setAntiSpamMinutes((data as any).anti_spam_minutes || 30);
      setPixProvider((data as any).pix_provider || '');
      setPixKey((data as any).pix_key || '');
      setPixKeyType((data as any).pix_key_type || '');
      setPixEnabled((data as any).pix_enabled || false);
      setInstagramEnabled((data as any).instagram_enabled || false);
      setInstagramBusinessAccountId((data as any).instagram_business_account_id || '');
      
      // Stripe
      setStripeEnabled((data as any).stripe_enabled || false);
      setStripePublishableKey((data as any).stripe_publishable_key || '');
      setStripeMode((data as any).stripe_mode || 'test');
      setPaymentGateway((data as any).payment_gateway || 'manual');
    }
  }, [data]);

  const handleSaveWhatsApp = async () => {
    try {
      await upsert({
        whatsapp_provider: whatsappProvider || null,
        whatsapp_api_key_masked: whatsappApiKey ? '********' : (data as any)?.whatsapp_api_key_masked,
        whatsapp_instance_id: whatsappInstanceId || null,
        whatsapp_default_number: whatsappNumber || null,
        whatsapp_enabled: whatsappEnabled,
      } as any);
      toast.success('Conexão WhatsApp salva!');
      setWhatsappApiKey('');
    } catch {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleSaveBot = async () => {
    try {
      await upsert({
        auto_reply_enabled: autoReplyEnabled,
        auto_reply_template: autoReplyTemplate,
        quiet_hours_start: quietHoursStart,
        quiet_hours_end: quietHoursEnd,
        status_notifications_enabled: statusNotificationsEnabled,
        anti_spam_minutes: antiSpamMinutes,
      } as any);
      toast.success('Configurações do Bot salvas!');
    } catch {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleSavePix = async () => {
    try {
      await upsert({
        pix_provider: pixProvider || null,
        pix_key: pixKey || null,
        pix_key_type: pixKeyType || null,
        pix_enabled: pixEnabled,
      } as any);
      toast.success('Configurações de Pix salvas!');
    } catch {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleSaveInstagram = async () => {
    try {
      await upsert({
        instagram_enabled: instagramEnabled,
        instagram_access_token: instagramAccessToken || null,
        instagram_business_account_id: instagramBusinessAccountId || null,
      } as any);
      toast.success('Configurações do Instagram salvas!');
      setInstagramAccessToken('');
    } catch {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleSaveStripe = async () => {
    try {
      await upsert({
        stripe_enabled: stripeEnabled,
        stripe_secret_key_masked: stripeSecretKey ? '********' : (data as any)?.stripe_secret_key_masked,
        stripe_publishable_key: stripePublishableKey || null,
        stripe_webhook_secret_masked: stripeWebhookSecret ? '********' : (data as any)?.stripe_webhook_secret_masked,
        stripe_mode: stripeMode,
        payment_gateway: paymentGateway,
      } as any);
      toast.success('Configurações de pagamento salvas!');
      setStripeSecretKey('');
      setStripeWebhookSecret('');
    } catch {
      toast.error('Erro ao salvar configurações');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Integrações">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Integrações">
      <div className="max-w-3xl space-y-6 animate-fade-in">
        {/* WhatsApp Section */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <CardTitle className="font-display">WhatsApp Business</CardTitle>
                <CardDescription>Automação de atendimento e notificações</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="connection" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="connection">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Conexão
                </TabsTrigger>
                <TabsTrigger value="bot">
                  <Bot className="w-4 h-4 mr-2" />
                  Bot
                </TabsTrigger>
                <TabsTrigger value="templates">
                  <FileText className="w-4 h-4 mr-2" />
                  Mensagens
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <Bell className="w-4 h-4 mr-2" />
                  Config
                </TabsTrigger>
              </TabsList>

              {/* Connection Tab */}
              <TabsContent value="connection" className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Ativar WhatsApp</p>
                    <p className="text-sm text-muted-foreground">Habilita o envio de mensagens</p>
                  </div>
                  <Switch
                    checked={whatsappEnabled}
                    onCheckedChange={setWhatsappEnabled}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Provedor</Label>
                  <Select 
                    value={whatsappProvider} 
                    onValueChange={(v) => setWhatsappProvider(v as any)}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o provedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zapi">Z-API</SelectItem>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="evolution">Evolution API</SelectItem>
                      <SelectItem value="meta_cloud">Meta Cloud API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>API Key / Token</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={whatsappApiKey}
                      onChange={(e) => setWhatsappApiKey(e.target.value)}
                      placeholder={(data as any)?.whatsapp_api_key_masked || 'Insira a chave da API'}
                      disabled={!isAdmin}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Instance ID</Label>
                    <Input
                      value={whatsappInstanceId}
                      onChange={(e) => setWhatsappInstanceId(e.target.value)}
                      placeholder="ID da instância"
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número da Loja</Label>
                    <Input
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="5511999999999"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                {isAdmin && (
                  <Button onClick={handleSaveWhatsApp} disabled={isPending} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    {isPending ? 'Salvando...' : 'Salvar Conexão'}
                  </Button>
                )}
              </TabsContent>

              {/* Bot Tab */}
              <TabsContent value="bot" className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Auto-resposta</p>
                    <p className="text-sm text-muted-foreground">Responde automaticamente quando cliente envia mensagem</p>
                  </div>
                  <Switch
                    checked={autoReplyEnabled}
                    onCheckedChange={setAutoReplyEnabled}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mensagem de Resposta</Label>
                  <Textarea
                    value={autoReplyTemplate}
                    onChange={(e) => setAutoReplyTemplate(e.target.value)}
                    placeholder="Olá! 👋 Acesse nosso cardápio: {menu_link}"
                    rows={4}
                    disabled={!isAdmin}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {'{menu_link}'} = link do cardápio, {'{nome}'} = nome do cliente, {'{empresa}'} = nome da loja
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Anti-spam (minutos)</Label>
                  <Input
                    type="number"
                    value={antiSpamMinutes}
                    onChange={(e) => setAntiSpamMinutes(parseInt(e.target.value) || 30)}
                    min={5}
                    max={120}
                    disabled={!isAdmin}
                  />
                  <p className="text-xs text-muted-foreground">
                    Não repete a mensagem automática dentro deste período
                  </p>
                </div>

                {isAdmin && (
                  <Button onClick={handleSaveBot} disabled={isPending} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    {isPending ? 'Salvando...' : 'Salvar Bot'}
                  </Button>
                )}
              </TabsContent>

              {/* Templates Tab */}
              <TabsContent value="templates" className="space-y-4 mt-4">
                {/* Variables Reference */}
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium mb-2">Variáveis disponíveis (clique para copiar):</p>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <Badge
                        key={v.key}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => {
                          navigator.clipboard.writeText(v.key);
                          setCopiedVar(v.key);
                          setTimeout(() => setCopiedVar(null), 2000);
                          toast.success(`Copiado: ${v.key}`);
                        }}
                      >
                        {copiedVar === v.key ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                        {v.key}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Template List */}
                <div className="space-y-3">
                  {Object.entries(TEMPLATE_TYPES).map(([key, info]) => {
                    const template = getTemplate(key as keyof typeof TEMPLATE_TYPES);
                    return (
                      <TemplateEditor
                        key={key}
                        templateType={key}
                        templateName={info.name}
                        description={info.description}
                        defaultMessage={info.defaultMessage}
                        currentTemplate={template}
                        onSave={(message) => {
                          upsertTemplate.mutate({
                            template_type: key,
                            template_name: info.name,
                            message_template: message,
                            is_active: true,
                          });
                        }}
                        onToggle={(isActive) => {
                          toggleTemplate.mutate({ templateType: key, isActive });
                        }}
                        isAdmin={isAdmin}
                        isSaving={upsertTemplate.isPending}
                      />
                    );
                  })}
                </div>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Notificações de Status</p>
                    <p className="text-sm text-muted-foreground">Envia mensagem quando status do pedido muda</p>
                  </div>
                  <Switch
                    checked={statusNotificationsEnabled}
                    onCheckedChange={setStatusNotificationsEnabled}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Horário Silencioso
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Não envia mensagens automáticas neste período
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 mt-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Início</Label>
                      <Input
                        type="time"
                        value={quietHoursStart}
                        onChange={(e) => setQuietHoursStart(e.target.value)}
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fim</Label>
                      <Input
                        type="time"
                        value={quietHoursEnd}
                        onChange={(e) => setQuietHoursEnd(e.target.value)}
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <Button onClick={handleSaveBot} disabled={isPending} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    {isPending ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Pix Section */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-info" />
                </div>
                <div>
                  <CardTitle className="font-display">Pix</CardTitle>
                  <CardDescription>Recebimento de pagamentos</CardDescription>
                </div>
              </div>
              <Switch
                checked={pixEnabled}
                onCheckedChange={setPixEnabled}
                disabled={!isAdmin}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provedor</Label>
              <Select 
                value={pixProvider} 
                onValueChange={(v) => setPixProvider(v as any)}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                  <SelectItem value="asaas">Asaas</SelectItem>
                  <SelectItem value="manual">Manual (Chave Pix)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo da Chave</Label>
                <Select 
                  value={pixKeyType} 
                  onValueChange={(v) => setPixKeyType(v as any)}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="random">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Chave Pix</Label>
                <Input
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Sua chave Pix"
                  disabled={!isAdmin}
                />
              </div>
            </div>

            {isAdmin && (
              <Button onClick={handleSavePix} disabled={isPending}>
                <Save className="w-4 h-4 mr-2" />
                {isPending ? 'Salvando...' : 'Salvar Pix'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Stripe / Payment Gateway Section */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-violet-500" />
                </div>
                <div>
                  <CardTitle className="font-display">Gateway de Pagamentos</CardTitle>
                  <CardDescription>Stripe, Mercado Pago ou outro gateway</CardDescription>
                </div>
              </div>
              <Switch
                checked={stripeEnabled}
                onCheckedChange={setStripeEnabled}
                disabled={!isAdmin}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Configure as chaves do seu gateway de pagamentos. Para testes, use o modo "Test" 
                e chaves de teste. Para produção, alterne para "Live" e use chaves reais.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Gateway Principal</Label>
              <Select 
                value={paymentGateway} 
                onValueChange={(v) => setPaymentGateway(v as any)}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gateway" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                  <SelectItem value="asaas">Asaas</SelectItem>
                  <SelectItem value="manual">Manual (Pix/Dinheiro)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentGateway === 'stripe' && (
              <>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Modo</p>
                    <p className="text-sm text-muted-foreground">
                      {stripeMode === 'test' ? 'Usando chaves de teste' : 'Usando chaves de produção'}
                    </p>
                  </div>
                  <Select 
                    value={stripeMode} 
                    onValueChange={(v) => setStripeMode(v as 'test' | 'live')}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Publishable Key</Label>
                  <Input
                    value={stripePublishableKey}
                    onChange={(e) => setStripePublishableKey(e.target.value)}
                    placeholder={stripeMode === 'test' ? 'pk_test_...' : 'pk_live_...'}
                    disabled={!isAdmin}
                  />
                  <p className="text-xs text-muted-foreground">
                    Chave pública do Stripe (começa com pk_test_ ou pk_live_)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showStripeSecret ? 'text' : 'password'}
                      value={stripeSecretKey}
                      onChange={(e) => setStripeSecretKey(e.target.value)}
                      placeholder={(data as any)?.stripe_secret_key_masked || (stripeMode === 'test' ? 'sk_test_...' : 'sk_live_...')}
                      disabled={!isAdmin}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowStripeSecret(!showStripeSecret)}
                    >
                      {showStripeSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Chave secreta do Stripe (começa com sk_test_ ou sk_live_)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Webhook Secret (Opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showWebhookSecret ? 'text' : 'password'}
                      value={stripeWebhookSecret}
                      onChange={(e) => setStripeWebhookSecret(e.target.value)}
                      placeholder={(data as any)?.stripe_webhook_secret_masked || 'whsec_...'}
                      disabled={!isAdmin}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    >
                      {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para receber notificações de pagamento em tempo real
                  </p>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="font-medium text-sm">Como obter as chaves:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Acesse <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">dashboard.stripe.com/apikeys <ExternalLink className="w-3 h-3" /></a></li>
                    <li>Copie a "Publishable key" e cole acima</li>
                    <li>Clique em "Reveal test key" para ver a Secret Key</li>
                    <li>Para webhook, vá em Developers → Webhooks</li>
                  </ol>
                </div>
              </>
            )}

            {paymentGateway === 'mercadopago' && (
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Configure as credenciais do Mercado Pago na seção "Pix" acima.
                  O Mercado Pago usa as mesmas credenciais para Pix e cartão.
                </AlertDescription>
              </Alert>
            )}

            {isAdmin && (
              <Button onClick={handleSaveStripe} disabled={isPending}>
                <Save className="w-4 h-4 mr-2" />
                {isPending ? 'Salvando...' : 'Salvar Gateway'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Instagram Section */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center">
                  <Instagram className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                  <CardTitle className="font-display">Instagram Business</CardTitle>
                  <CardDescription>Publicação automática de posts</CardDescription>
                </div>
              </div>
              <Switch
                checked={instagramEnabled}
                onCheckedChange={setInstagramEnabled}
                disabled={!isAdmin}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Para publicar automaticamente no Instagram, você precisa de uma conta Business 
                conectada a uma página do Facebook e um token de acesso da Meta Graph API.
              </AlertDescription>
            </Alert>

            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <p className="font-medium text-sm">Como configurar:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Acesse <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">developers.facebook.com <ExternalLink className="w-3 h-3" /></a></li>
                <li>Crie um app do tipo "Business"</li>
                <li>Adicione o produto "Instagram Graph API"</li>
                <li>Conecte sua página do Facebook e conta Instagram Business</li>
                <li>Gere um token de acesso com permissões: instagram_basic, instagram_content_publish, pages_read_engagement</li>
                <li>Copie o ID da conta Instagram Business e o token</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label>ID da Conta Instagram Business</Label>
              <Input
                value={instagramBusinessAccountId}
                onChange={(e) => setInstagramBusinessAccountId(e.target.value)}
                placeholder="Ex: 17841405822304914"
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Encontre em: Graph API Explorer → me/accounts → instagram_business_account.id
              </p>
            </div>

            <div className="space-y-2">
              <Label>Token de Acesso</Label>
              <div className="flex gap-2">
                <Input
                  type={showInstagramToken ? 'text' : 'password'}
                  value={instagramAccessToken}
                  onChange={(e) => setInstagramAccessToken(e.target.value)}
                  placeholder="Token de longa duração"
                  disabled={!isAdmin}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowInstagramToken(!showInstagramToken)}
                >
                  {showInstagramToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use um token de longa duração (60 dias) para evitar reconfiguração frequente.
              </p>
            </div>

            {isAdmin && (
              <Button onClick={handleSaveInstagram} disabled={isPending}>
                <Save className="w-4 h-4 mr-2" />
                {isPending ? 'Salvando...' : 'Salvar Instagram'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
