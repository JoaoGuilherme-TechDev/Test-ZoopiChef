import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useOpenDelivery, OD_STATUS_LABELS, OD_STATUS_COLORS, OD_EVENT_TYPE_LABELS } from '@/hooks/useOpenDelivery';
import {
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Save,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Phone,
  Copy,
  Clock,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function OpenDeliveryPanel() {
  const {
    config,
    isConfigLoading,
    saveConfig,
    deliveries,
    isDeliveriesLoading,
    testConnection,
    getDeliveryDetails,
    pollEvents,
    cancelDelivery,
  } = useOpenDelivery();

  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeSection, setActiveSection] = useState<'config' | 'history'>('config');

  const currentConfig = { ...config, ...formData };

  const handleSave = async () => {
    try {
      await saveConfig.mutateAsync(formData);
      toast.success('Configuração OpenDelivery salva com sucesso!');
      setFormData({});
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnection.mutateAsync();
      if (result?.success) {
        toast.success(result.message || 'Conexão validada com sucesso!');
      } else {
        toast.error(result?.error || 'Falha na conexão');
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handlePollEvents = async () => {
    try {
      const result = await pollEvents.mutateAsync();
      if (result?.count > 0) {
        toast.success(`${result.count} evento(s) processado(s)`);
      } else {
        toast.info('Nenhum evento novo');
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleRefreshDetails = async (delivery: any) => {
    try {
      await getDeliveryDetails.mutateAsync({
        delivery_id: delivery.id,
        od_order_id: delivery.od_order_id,
      });
      toast.success('Detalhes atualizados');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleCancel = async (delivery: any) => {
    if (!confirm('Tem certeza que deseja cancelar esta entrega?')) return;
    try {
      await cancelDelivery.mutateAsync({
        delivery_id: delivery.id,
        od_order_id: delivery.od_order_id,
      });
      toast.success('Entrega cancelada');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-opendelivery`;

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isConfigLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-teal-500" />
              </div>
              <div>
                <CardTitle>OpenDelivery</CardTitle>
                <CardDescription>
                  Padrão aberto de integração com provedores logísticos (Abrasel)
                </CardDescription>
              </div>
            </div>
            <Badge className={config?.is_enabled ? 'bg-emerald-500' : ''}>
              {config?.is_enabled ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Section Toggle */}
          <div className="flex gap-2">
            <Button
              variant={activeSection === 'config' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('config')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configuração
            </Button>
            <Button
              variant={activeSection === 'history' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('history')}
            >
              <Clock className="w-4 h-4 mr-2" />
              Histórico ({deliveries.length})
            </Button>
          </div>

          {activeSection === 'config' && (
            <div className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Habilitar OpenDelivery</p>
                  <p className="text-sm text-muted-foreground">
                    Ative para enviar entregas via provedores OpenDelivery
                  </p>
                </div>
                <Switch
                  checked={currentConfig.is_enabled ?? false}
                  onCheckedChange={(v) => updateField('is_enabled', v)}
                />
              </div>

              {/* Auth Type */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Autenticação
                </h3>

                <div className="space-y-2">
                  <Label>Método de Autenticação</Label>
                  <Select
                    value={currentConfig.auth_type || 'oauth2'}
                    onValueChange={(v) => updateField('auth_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oauth2">OAuth2 (Client Credentials)</SelectItem>
                      <SelectItem value="apikey">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(currentConfig.auth_type || 'oauth2') === 'oauth2' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Client ID</Label>
                      <Input
                        value={currentConfig.client_id || ''}
                        onChange={(e) => updateField('client_id', e.target.value)}
                        placeholder="Fornecido pelo provedor logístico"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret</Label>
                      <div className="relative">
                        <Input
                          type={showClientSecret ? 'text' : 'password'}
                          value={currentConfig.client_secret || ''}
                          onChange={(e) => updateField('client_secret', e.target.value)}
                          placeholder="Fornecido pelo provedor logístico"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-0 h-full"
                          onClick={() => setShowClientSecret(!showClientSecret)}
                        >
                          {showClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>URL de Autenticação (Token)</Label>
                      <Input
                        value={currentConfig.auth_base_url || ''}
                        onChange={(e) => updateField('auth_base_url', e.target.value)}
                        placeholder="https://auth.provedor.com"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        value={currentConfig.api_key || ''}
                        onChange={(e) => updateField('api_key', e.target.value)}
                        placeholder="Sua chave de API"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-0 h-full"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* URLs & IDs */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configurações do Provedor
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Base URL (API Logística)</Label>
                    <Input
                      value={currentConfig.base_url || ''}
                      onChange={(e) => updateField('base_url', e.target.value)}
                      placeholder="https://api.provedor.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ambiente</Label>
                    <Select
                      value={currentConfig.environment || 'production'}
                      onValueChange={(v) => updateField('environment', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">Produção</SelectItem>
                        <SelectItem value="sandbox">Sandbox (Teste)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Merchant ID</Label>
                    <Input
                      value={currentConfig.merchant_id || ''}
                      onChange={(e) => updateField('merchant_id', e.target.value)}
                      placeholder="Identificador único do merchant"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>App ID (do provedor)</Label>
                    <Input
                      value={currentConfig.app_id || ''}
                      onChange={(e) => updateField('app_id', e.target.value)}
                      placeholder="ID da aplicação do provedor"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Webhook */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Webhooks
                </h3>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Configure as URLs abaixo no provedor logístico para receber atualizações de rastreamento e eventos.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>URL de Tracking (deliveryUpdate)</Label>
                  <div className="flex gap-2">
                    <Input value={webhookUrl} readOnly className="font-mono text-xs" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookUrl);
                        toast.success('URL copiada!');
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Criar entrega automaticamente</p>
                    <p className="text-xs text-muted-foreground">Ao confirmar pedido delivery</p>
                  </div>
                  <Switch
                    checked={currentConfig.auto_create_delivery ?? false}
                    onCheckedChange={(v) => updateField('auto_create_delivery', v)}
                  />
                </div>
              </div>

              <Separator />

              {/* Instructions */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p className="font-medium">Como configurar:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-sm">
                    <li>Registre-se no portal do provedor logístico compatível com OpenDelivery</li>
                    <li>Obtenha suas credenciais (Client ID/Secret ou API Key)</li>
                    <li>Informe a Base URL da API logística do provedor</li>
                    <li>Configure o Merchant ID (gerado pelo seu sistema ou pelo provedor)</li>
                    <li>Configure a URL de webhook no provedor</li>
                    <li>Clique em <strong>Testar Conexão</strong> para validar</li>
                    <li>Habilite a integração com o toggle</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    Documentação: <a href="https://developer.opendelivery.com.br" target="_blank" rel="noopener noreferrer" className="text-primary underline">developer.opendelivery.com.br</a>
                  </p>
                </AlertDescription>
              </Alert>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSave} disabled={saveConfig.isPending || Object.keys(formData).length === 0}>
                  {saveConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar Configuração
                </Button>
                <Button variant="outline" onClick={handleTestConnection} disabled={testConnection.isPending}>
                  {testConnection.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Testar Conexão
                </Button>
                <Button variant="outline" onClick={handlePollEvents} disabled={pollEvents.isPending}>
                  {pollEvents.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  Buscar Eventos (Polling)
                </Button>
              </div>
            </div>
          )}

          {activeSection === 'history' && (
            <div className="space-y-3">
              {isDeliveriesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : deliveries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma entrega registrada</p>
                  <p className="text-sm">
                    As entregas aparecerão aqui quando forem enviadas via OpenDelivery
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-3">
                    {deliveries.map((delivery: any) => (
                      <Card key={delivery.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={OD_STATUS_COLORS[delivery.status] || ''}>
                                  {OD_STATUS_LABELS[delivery.status] || delivery.status}
                                </Badge>
                                {delivery.od_event_type && (
                                  <Badge variant="outline" className="text-xs">
                                    {OD_EVENT_TYPE_LABELS[delivery.od_event_type] || delivery.od_event_type}
                                  </Badge>
                                )}
                                {delivery.od_order_id && (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    OD #{delivery.od_order_id?.substring(0, 8)}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {delivery.pickup_address && (
                                  <div className="flex items-start gap-1">
                                    <MapPin className="w-3 h-3 mt-1 text-emerald-500 shrink-0" />
                                    <span className="text-muted-foreground truncate">
                                      {delivery.pickup_address}
                                    </span>
                                  </div>
                                )}
                                {delivery.destination_address && (
                                  <div className="flex items-start gap-1">
                                    <MapPin className="w-3 h-3 mt-1 text-red-500 shrink-0" />
                                    <span className="text-muted-foreground truncate">
                                      {delivery.destination_address}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {delivery.driver_name && (
                                <div className="flex items-center gap-3 text-sm">
                                  <span className="font-medium">{delivery.driver_name}</span>
                                  {delivery.driver_phone && (
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                      <Phone className="w-3 h-3" />
                                      {delivery.driver_phone}
                                    </span>
                                  )}
                                  {delivery.driver_plate && (
                                    <Badge variant="outline" className="text-xs">
                                      {delivery.driver_plate}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {delivery.tracking_url && (
                                <a
                                  href={delivery.tracking_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Acompanhar entrega
                                </a>
                              )}

                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(delivery.created_at), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </p>
                            </div>

                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRefreshDetails(delivery)}
                                disabled={getDeliveryDetails.isPending}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              {!['finished', 'cancelled'].includes(delivery.status) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleCancel(delivery)}
                                  disabled={cancelDelivery.isPending}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
