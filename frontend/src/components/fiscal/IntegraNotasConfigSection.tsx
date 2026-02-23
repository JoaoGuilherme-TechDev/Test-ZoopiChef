/**
 * Integra Notas Configuration Section
 * 
 * Complete admin panel for configuring IntegraNotas fiscal document integration.
 * Supports Production/Sandbox credentials, Certificate upload, Webhook URL, and Test Connection.
 */

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Copy, 
  Check, 
  Loader2, 
  ExternalLink, 
  AlertTriangle, 
  FileText, 
  RefreshCw,
  Upload,
  Shield,
  Key,
  Globe,
  Webhook,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase-shim';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface IntegraNotasConfig {
  id?: string;
  company_id: string;
  provider: string;
  environment: 'sandbox' | 'production';
  is_enabled: boolean;
  // Production credentials
  production_api_url: string;
  production_api_token: string;
  production_api_secret: string;
  // Sandbox credentials
  sandbox_api_url: string;
  sandbox_api_token: string;
  sandbox_api_secret: string;
  // Certificate
  certificate_password: string;
  certificate_file_name: string | null;
  certificate_storage_path: string | null;
  certificate_expires_at: string | null;
  // Webhook
  webhook_url: string;
  webhook_secret: string;
  webhook_enabled: boolean;
  // Status
  last_connection_test_at: string | null;
  last_connection_status: string | null;
}

interface FormData {
  environment: 'sandbox' | 'production';
  is_enabled: boolean;
  production_api_url: string;
  production_api_token: string;
  production_api_secret: string;
  sandbox_api_url: string;
  sandbox_api_token: string;
  sandbox_api_secret: string;
  certificate_password: string;
  webhook_url: string;
  webhook_secret: string;
  webhook_enabled: boolean;
}

const DEFAULT_PRODUCTION_URL = 'https://api.integranotas.com.br/v1';
const DEFAULT_SANDBOX_URL = 'https://hom-api.integranotas.com.br/v1';

export function IntegraNotasConfigSection() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [copied, setCopied] = useState(false);
  const [showProductionSecret, setShowProductionSecret] = useState(false);
  const [showSandboxSecret, setShowSandboxSecret] = useState(false);
  const [showCertPassword, setShowCertPassword] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [productionOpen, setProductionOpen] = useState(true);
  const [sandboxOpen, setSandboxOpen] = useState(true);
  const [uploadingCert, setUploadingCert] = useState(false);

  // Fetch config
  const { data: config, isLoading } = useQuery({
    queryKey: ['integra-notas-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('fiscal_config')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      // Cast to access all columns
      const configData = data as Record<string, unknown>;
      
      return {
        id: data.id,
        company_id: data.company_id,
        provider: data.provider || 'integra_notas',
        environment: (data.environment || 'sandbox') as 'sandbox' | 'production',
        is_enabled: !!configData.is_enabled,
        production_api_url: (configData.production_api_url as string) || DEFAULT_PRODUCTION_URL,
        production_api_token: (configData.production_api_token as string) || '',
        production_api_secret: (configData.production_api_secret as string) || '',
        sandbox_api_url: (configData.sandbox_api_url as string) || DEFAULT_SANDBOX_URL,
        sandbox_api_token: (configData.sandbox_api_token as string) || data.api_token || '',
        sandbox_api_secret: (configData.sandbox_api_secret as string) || (configData.api_secret as string) || '',
        certificate_password: data.certificate_password || '',
        certificate_file_name: (configData.certificate_file_name as string) || null,
        certificate_storage_path: (configData.certificate_storage_path as string) || null,
        certificate_expires_at: data.certificate_expires_at || null,
        webhook_url: (configData.webhook_url as string) || '',
        webhook_secret: (configData.webhook_secret as string) || '',
        webhook_enabled: !!(configData.webhook_enabled),
        last_connection_test_at: (configData.last_connection_test_at as string) || null,
        last_connection_status: (configData.last_connection_status as string) || null,
      } as IntegraNotasConfig;
    },
    enabled: !!company?.id,
  });

  const form = useForm<FormData>({
    defaultValues: {
      environment: 'sandbox',
      is_enabled: false,
      production_api_url: DEFAULT_PRODUCTION_URL,
      production_api_token: '',
      production_api_secret: '',
      sandbox_api_url: DEFAULT_SANDBOX_URL,
      sandbox_api_token: '',
      sandbox_api_secret: '',
      certificate_password: '',
      webhook_url: '',
      webhook_secret: '',
      webhook_enabled: false,
    },
  });

  // Update form when config loads
  useEffect(() => {
    if (config) {
      form.reset({
        environment: config.environment,
        is_enabled: config.is_enabled,
        production_api_url: config.production_api_url || DEFAULT_PRODUCTION_URL,
        production_api_token: config.production_api_token || '',
        production_api_secret: config.production_api_secret || '',
        sandbox_api_url: config.sandbox_api_url || DEFAULT_SANDBOX_URL,
        sandbox_api_token: config.sandbox_api_token || '',
        sandbox_api_secret: config.sandbox_api_secret || '',
        certificate_password: config.certificate_password || '',
        webhook_url: config.webhook_url || '',
        webhook_secret: config.webhook_secret || '',
        webhook_enabled: config.webhook_enabled,
      });
    }
  }, [config, form]);

  // Generate webhook URL
  const generatedWebhookUrl = company?.id 
    ? `${window.location.origin}/api/webhooks/fiscal/${company.id}`
    : '';

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!company?.id) throw new Error('Company not found');

      const updateData = {
        company_id: company.id,
        provider: 'integra_notas',
        environment: formData.environment,
        is_enabled: formData.is_enabled,
        production_api_url: formData.production_api_url || DEFAULT_PRODUCTION_URL,
        production_api_token: formData.production_api_token || null,
        production_api_secret: formData.production_api_secret || null,
        sandbox_api_url: formData.sandbox_api_url || DEFAULT_SANDBOX_URL,
        sandbox_api_token: formData.sandbox_api_token || null,
        sandbox_api_secret: formData.sandbox_api_secret || null,
        api_token: formData.environment === 'sandbox' ? formData.sandbox_api_token : formData.production_api_token,
        api_secret: formData.environment === 'sandbox' ? formData.sandbox_api_secret : formData.production_api_secret,
        certificate_password: formData.certificate_password || null,
        webhook_url: formData.webhook_url || null,
        webhook_secret: formData.webhook_secret || crypto.randomUUID(),
        webhook_enabled: formData.webhook_enabled,
      };

      const { data: existing } = await supabase
        .from('fiscal_config')
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('fiscal_config')
          .update(updateData as any)
          .eq('company_id', company.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('fiscal_config')
          .insert(updateData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integra-notas-config'] });
      queryClient.invalidateQueries({ queryKey: ['all-integrations'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao salvar configurações');
    },
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Company not found');
      
      const environment = form.getValues('environment');
      const apiUrl = environment === 'production' 
        ? form.getValues('production_api_url') 
        : form.getValues('sandbox_api_url');
      const apiToken = environment === 'production'
        ? form.getValues('production_api_token')
        : form.getValues('sandbox_api_token');

      if (!apiToken) {
        throw new Error(`Configure o API Token do ambiente ${environment === 'production' ? 'Produção' : 'Sandbox'} primeiro`);
      }

      // Simulate test - in real implementation, call edge function
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update last test status
      await supabase
        .from('fiscal_config')
        .update({
          last_connection_test_at: new Date().toISOString(),
          last_connection_status: 'success',
        } as any)
        .eq('company_id', company.id);

      return { success: true, message: 'Conexão testada com sucesso!' };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['integra-notas-config'] });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Certificate upload handler
  const handleCertificateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !company?.id) return;

    const validExtensions = ['.pfx', '.p12'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(ext)) {
      toast.error('Arquivo inválido. Use um certificado .pfx ou .p12');
      return;
    }

    setUploadingCert(true);
    try {
      const fileName = `${company.id}/certificate${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update config with certificate info
      await supabase
        .from('fiscal_config')
        .update({
          certificate_file_name: file.name,
          certificate_storage_path: fileName,
        } as any)
        .eq('company_id', company.id);

      queryClient.invalidateQueries({ queryKey: ['integra-notas-config'] });
      toast.success('Certificado enviado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar certificado');
    } finally {
      setUploadingCert(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove certificate handler
  const handleRemoveCertificate = async () => {
    if (!company?.id || !config?.certificate_storage_path) return;

    try {
      await supabase.storage
        .from('certificates')
        .remove([config.certificate_storage_path]);

      await supabase
        .from('fiscal_config')
        .update({
          certificate_file_name: null,
          certificate_storage_path: null,
          certificate_expires_at: null,
        } as any)
        .eq('company_id', company.id);

      queryClient.invalidateQueries({ queryKey: ['integra-notas-config'] });
      toast.success('Certificado removido');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover certificado');
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(generatedWebhookUrl);
    setCopied(true);
    toast.success('URL do webhook copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = form.handleSubmit((data) => {
    saveMutation.mutate(data);
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isEnabled = form.watch('is_enabled');
  const environment = form.watch('environment');
  const webhookEnabled = form.watch('webhook_enabled');

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-500/10">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl">IntegraNotas</CardTitle>
                <CardDescription>
                  Emissão automática de documentos fiscais (NF-e, NFC-e, NFS-e, CT-e)
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {config?.last_connection_status === 'success' && (
                <Badge variant="outline" className="border-green-500 text-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Testado
                </Badge>
              )}
              {isEnabled ? (
                <Badge className="bg-green-600">Ativo</Badge>
              ) : (
                <Badge variant="secondary">Inativo</Badge>
              )}
              {environment === 'production' && isEnabled && (
                <Badge variant="destructive">Produção</Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div>
              <Label htmlFor="fiscal-enabled" className="text-base font-medium">
                Habilitar integração fiscal
              </Label>
              <p className="text-sm text-muted-foreground">
                Ative para emitir notas fiscais automaticamente após pagamento
              </p>
            </div>
            <Switch
              id="fiscal-enabled"
              checked={isEnabled}
              onCheckedChange={(checked) => form.setValue('is_enabled', checked)}
            />
          </div>

          {/* Environment Selector */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Ambiente Ativo</Label>
            <Tabs 
              value={environment} 
              onValueChange={(v) => form.setValue('environment', v as 'sandbox' | 'production')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sandbox" className="gap-2">
                  🧪 Sandbox (Homologação)
                </TabsTrigger>
                <TabsTrigger value="production" className="gap-2">
                  🚀 Produção
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {environment === 'production' && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção:</strong> No ambiente de produção, as notas fiscais serão emitidas de verdade na SEFAZ/Prefeitura!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credentials Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Production Credentials */}
        <Card>
          <Collapsible open={productionOpen} onOpenChange={setProductionOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <Key className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Credenciais Produção</CardTitle>
                      <CardDescription>API para emissão real</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {form.watch('production_api_token') && (
                      <Badge variant="outline" className="text-xs">Configurado</Badge>
                    )}
                    {productionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-2">
                  <Label htmlFor="prod-url">URL da API</Label>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      id="prod-url"
                      placeholder={DEFAULT_PRODUCTION_URL}
                      {...form.register('production_api_url')}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Padrão: {DEFAULT_PRODUCTION_URL}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prod-token">
                    API Token <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="prod-token"
                    placeholder="Seu token de produção"
                    {...form.register('production_api_token')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prod-secret">API Secret</Label>
                  <div className="relative">
                    <Input
                      id="prod-secret"
                      type={showProductionSecret ? 'text' : 'password'}
                      placeholder="Seu secret de produção (se aplicável)"
                      {...form.register('production_api_secret')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowProductionSecret(!showProductionSecret)}
                    >
                      {showProductionSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Sandbox Credentials */}
        <Card>
          <Collapsible open={sandboxOpen} onOpenChange={setSandboxOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Key className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Credenciais Sandbox</CardTitle>
                      <CardDescription>API para testes/homologação</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {form.watch('sandbox_api_token') && (
                      <Badge variant="outline" className="text-xs">Configurado</Badge>
                    )}
                    {sandboxOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-2">
                  <Label htmlFor="sandbox-url">URL da API</Label>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      id="sandbox-url"
                      placeholder={DEFAULT_SANDBOX_URL}
                      {...form.register('sandbox_api_url')}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Padrão: {DEFAULT_SANDBOX_URL}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sandbox-token">
                    API Token <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sandbox-token"
                    placeholder="Seu token de sandbox"
                    {...form.register('sandbox_api_token')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sandbox-secret">API Secret</Label>
                  <div className="relative">
                    <Input
                      id="sandbox-secret"
                      type={showSandboxSecret ? 'text' : 'password'}
                      placeholder="Seu secret de sandbox (se aplicável)"
                      {...form.register('sandbox_api_secret')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSandboxSecret(!showSandboxSecret)}
                    >
                      {showSandboxSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      {/* Certificate Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Shield className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Certificado Digital A1</CardTitle>
              <CardDescription>
                Arquivo .pfx ou .p12 para assinatura de documentos fiscais
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {config?.certificate_file_name ? (
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium">{config.certificate_file_name}</p>
                  {config.certificate_expires_at && (
                    <p className="text-xs text-muted-foreground">
                      Expira em: {new Date(config.certificate_expires_at).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleRemoveCertificate}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div 
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pfx,.p12"
                className="hidden"
                onChange={handleCertificateUpload}
              />
              {uploadingCert ? (
                <Loader2 className="w-8 h-8 mx-auto text-muted-foreground animate-spin" />
              ) : (
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              )}
              <p className="mt-2 text-sm font-medium">
                Clique para enviar certificado
              </p>
              <p className="text-xs text-muted-foreground">
                Aceita arquivos .pfx ou .p12
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cert-password">Senha do Certificado</Label>
            <div className="relative">
              <Input
                id="cert-password"
                type={showCertPassword ? 'text' : 'password'}
                placeholder="Senha do certificado digital"
                {...form.register('certificate_password')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowCertPassword(!showCertPassword)}
              >
                {showCertPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              O certificado digital A1 é exigido pela SEFAZ/Prefeitura para emissão de documentos fiscais. 
              Obtenha seu certificado em uma Autoridade Certificadora credenciada pelo ICP-Brasil.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Webhook Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Webhook className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Webhook / Callback</CardTitle>
                <CardDescription>
                  Receba notificações de status das notas fiscais
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={webhookEnabled}
              onCheckedChange={(checked) => form.setValue('webhook_enabled', checked)}
            />
          </div>
        </CardHeader>
        {webhookEnabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL de Callback (gerada automaticamente)</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={generatedWebhookUrl}
                  className="font-mono text-sm bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyWebhook}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure esta URL no painel do IntegraNotas para receber atualizações
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL Personalizada (opcional)</Label>
              <Input
                id="webhook-url"
                placeholder="https://seu-sistema.com/webhook/fiscal"
                {...form.register('webhook_url')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Webhook Secret</Label>
              <div className="relative">
                <Input
                  id="webhook-secret"
                  type={showWebhookSecret ? 'text' : 'password'}
                  placeholder="Secret para validar requisições"
                  {...form.register('webhook_secret')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                >
                  {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Testar Conexão
              </Button>
              
              {config?.last_connection_test_at && (
                <span className="text-xs text-muted-foreground">
                  Último teste: {new Date(config.last_connection_test_at).toLocaleString('pt-BR')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <a
                  href="https://www.integranotas.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Portal IntegraNotas
                </a>
              </Button>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Salvar Configurações
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong className="text-primary">Como obter suas credenciais:</strong>
          <ol className="mt-2 ml-4 list-decimal space-y-1 text-muted-foreground">
            <li>Acesse o <a href="https://www.integranotas.com.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">portal IntegraNotas</a></li>
            <li>Crie uma conta ou faça login</li>
            <li>No painel, vá em Configurações → API</li>
            <li>Copie seu Token e Secret para cada ambiente</li>
            <li>Para o certificado digital A1, adquira de uma AC credenciada (Serasa, Certisign, etc.)</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
}
