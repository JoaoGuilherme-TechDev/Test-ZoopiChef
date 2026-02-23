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
import { useMachineDelivery, MACHINE_STATUS_LABELS, MACHINE_STATUS_COLORS } from '@/hooks/useMachineDelivery';
import {
  Truck,
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
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MachineDeliveryPanel() {
  const {
    config,
    isConfigLoading,
    saveConfig,
    deliveries,
    isDeliveriesLoading,
    testConnection,
    refreshStatus,
    cancelDelivery,
  } = useMachineDelivery();

  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeSection, setActiveSection] = useState<'config' | 'history'>('config');

  // Merge config with local form data
  const currentConfig = { ...config, ...formData };

  const handleSave = async () => {
    try {
      await saveConfig.mutateAsync(formData);
      toast.success('Configuração Machine salva com sucesso!');
      setFormData({});
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`);
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnection.mutateAsync();
      if (result?.success) {
        toast.success(`Conexão OK! ${result.categories?.length || 0} categorias encontradas.`);
      } else {
        toast.error(result?.error || 'Falha na conexão');
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleRefreshStatus = async (delivery: any) => {
    try {
      await refreshStatus.mutateAsync({
        delivery_id: delivery.id,
        machine_request_id: delivery.machine_request_id,
      });
      toast.success('Status atualizado');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleCancel = async (delivery: any) => {
    if (!confirm('Tem certeza que deseja cancelar esta entrega?')) return;
    try {
      await cancelDelivery.mutateAsync({
        delivery_id: delivery.id,
        machine_request_id: delivery.machine_request_id,
      });
      toast.success('Entrega cancelada');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const webhookUrl = `${window.location.origin.replace('localhost', '127.0.0.1')}/functions/v1/webhook-machine`;

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
      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <CardTitle>Machine Global</CardTitle>
                <CardDescription>Gestão de entregas via Machine (corridas e delivery)</CardDescription>
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
                  <p className="font-medium">Habilitar Machine Global</p>
                  <p className="text-sm text-muted-foreground">Ative para enviar entregas via Machine</p>
                </div>
                <Switch
                  checked={currentConfig.is_enabled ?? false}
                  onCheckedChange={(v) => updateField('is_enabled', v)}
                />
              </div>

              {/* Credentials */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Credenciais
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Chave API (api-key)</Label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        value={currentConfig.api_key || ''}
                        onChange={(e) => updateField('api_key', e.target.value)}
                        placeholder="Sua chave API Machine"
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
                    <Label>Login (Autenticação Básica)</Label>
                    <Input
                      value={currentConfig.basic_auth_user || ''}
                      onChange={(e) => updateField('basic_auth_user', e.target.value)}
                      placeholder="Usuário de integração"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Senha (Autenticação Básica)</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={currentConfig.basic_auth_password || ''}
                        onChange={(e) => updateField('basic_auth_password', e.target.value)}
                        placeholder="Senha do usuário"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-0 h-full"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Webhook Config */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Webhook (Callbacks)
                </h3>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Configure a URL abaixo no painel da Machine para receber atualizações de status automaticamente.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>URL de Callback</Label>
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

                <div className="space-y-2">
                  <Label>Secret do Webhook (opcional)</Label>
                  <Input
                    value={currentConfig.webhook_secret || ''}
                    onChange={(e) => updateField('webhook_secret', e.target.value)}
                    placeholder="Secret para validação de segurança"
                  />
                </div>
              </div>

              <Separator />

              {/* Defaults */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Padrões de Entrega
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria Padrão (ID)</Label>
                    <Input
                      value={currentConfig.default_category_id || ''}
                      onChange={(e) => updateField('default_category_id', e.target.value)}
                      placeholder="ID da categoria Machine"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nome da Categoria</Label>
                    <Input
                      value={currentConfig.default_category_name || ''}
                      onChange={(e) => updateField('default_category_name', e.target.value)}
                      placeholder="Ex: Comum, VIP, Entrega"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Forma de Pagamento Padrão</Label>
                    <Select
                      value={currentConfig.default_payment_type || 'D'}
                      onValueChange={(v) => updateField('default_payment_type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="D">Dinheiro</SelectItem>
                        <SelectItem value="X">PIX</SelectItem>
                        <SelectItem value="B">Débito</SelectItem>
                        <SelectItem value="C">Crédito</SelectItem>
                        <SelectItem value="F">Faturado</SelectItem>
                      </SelectContent>
                    </Select>
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
              </div>

              <Separator />

              {/* Instructions */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p className="font-medium">Como configurar:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-sm">
                    <li>Solicite sua chave API à Machine via <strong>suporte@machine.global</strong></li>
                    <li>Crie um usuário com perfil <strong>Gestor</strong> na plataforma Machine</li>
                    <li>Preencha a Chave API, Login e Senha acima</li>
                    <li>Clique em <strong>Testar Conexão</strong> para validar</li>
                    <li>Configure a URL de Callback no painel da Machine</li>
                    <li>Habilite a integração com o toggle</li>
                  </ol>
                </AlertDescription>
              </Alert>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saveConfig.isPending || Object.keys(formData).length === 0}>
                  {saveConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar Configuração
                </Button>
                <Button variant="outline" onClick={handleTestConnection} disabled={testConnection.isPending}>
                  {testConnection.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Testar Conexão
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
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma entrega registrada</p>
                  <p className="text-sm">As entregas aparecerão aqui quando forem enviadas via Machine</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-3">
                    {deliveries.map((delivery: any) => (
                      <Card key={delivery.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge className={MACHINE_STATUS_COLORS[delivery.status] || ''}>
                                  {MACHINE_STATUS_LABELS[delivery.status] || delivery.status}
                                </Badge>
                                {delivery.machine_request_id && (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    MCH #{delivery.machine_request_id}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {delivery.pickup_address && (
                                  <div className="flex items-start gap-1">
                                    <MapPin className="w-3 h-3 mt-1 text-emerald-500 shrink-0" />
                                    <span className="text-muted-foreground truncate">{delivery.pickup_address}</span>
                                  </div>
                                )}
                                {delivery.destination_address && (
                                  <div className="flex items-start gap-1">
                                    <MapPin className="w-3 h-3 mt-1 text-red-500 shrink-0" />
                                    <span className="text-muted-foreground truncate">{delivery.destination_address}</span>
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
                                    <Badge variant="outline" className="text-xs">{delivery.driver_plate}</Badge>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>
                                  {formatDistanceToNow(new Date(delivery.created_at), { addSuffix: true, locale: ptBR })}
                                </span>
                                {delivery.estimated_value && (
                                  <span>Estimado: R$ {Number(delivery.estimated_value).toFixed(2)}</span>
                                )}
                                {delivery.final_value && (
                                  <span className="font-medium text-foreground">
                                    Final: R$ {Number(delivery.final_value).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              {delivery.machine_request_id && !['finished', 'cancelled', 'error'].includes(delivery.status) && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRefreshStatus(delivery)}
                                    disabled={refreshStatus.isPending}
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleCancel(delivery)}
                                    disabled={cancelDelivery.isPending}
                                  >
                                    <XCircle className="w-4 h-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                              {delivery.status === 'finished' && (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              )}
                            </div>
                          </div>

                          {delivery.error_message && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertDescription className="text-xs">{delivery.error_message}</AlertDescription>
                            </Alert>
                          )}
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
