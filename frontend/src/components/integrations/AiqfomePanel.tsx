import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Settings,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileText,
  Check,
  Package,
  Truck,
  XCircle,
  Link,
  Play,
  PauseCircle,
} from 'lucide-react';
import {
  useAiqfome,
  AIQFOME_STATUS_LABELS,
  AIQFOME_STATUS_COLORS,
  type AiqfomeOrder,
  type AiqfomeEvent,
} from '@/hooks/useAiqfome';

export function AiqfomePanel() {
  const {
    config,
    isConfigLoading,
    saveConfig,
    orders,
    isOrdersLoading,
    events,
    isEventsLoading,
    testConnection,
    exchangeCode,
    refreshToken,
    pollEvents,
    confirmOrder,
    readyOrder,
    dispatchOrder,
    cancelOrder,
    storeStandby,
    getOrderEvents,
  } = useAiqfome();

  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [showSecrets, setShowSecrets] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('config');
  const [authCode, setAuthCode] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AiqfomeOrder | null>(null);
  const [orderEvents, setOrderEvents] = useState<AiqfomeEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const currentConfig = { ...config, ...localConfig };
  const isEnabled = currentConfig.is_enabled ?? false;

  const handleSave = async () => {
    try {
      await saveConfig.mutateAsync(localConfig);
      setLocalConfig({});
    } catch { /* handled in hook */ }
  };

  const handleExchangeCode = async () => {
    if (!authCode.trim()) {
      toast.error('Informe o código de autorização');
      return;
    }
    try {
      await exchangeCode.mutateAsync(authCode.trim());
      setAuthCode('');
    } catch { /* handled in hook */ }
  };

  const handleViewEvents = async (order: AiqfomeOrder) => {
    setSelectedOrder(order);
    setLoadingEvents(true);
    setActiveSubTab('events');
    try {
      const evts = await getOrderEvents(order.id);
      setOrderEvents(evts);
    } catch {
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoadingEvents(false);
    }
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const webhookUrl = `${window.location.origin.replace('preview--', '').replace('.lovable.app', '')}/functions/v1/webhook-aiqfome`;

  const hasToken = !!currentConfig.access_token;
  const tokenExpired = currentConfig.token_expires_at
    ? new Date(currentConfig.token_expires_at) < new Date()
    : false;

  if (isConfigLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-600/10 rounded-xl flex items-center justify-center text-2xl">
              🍕
            </div>
            <div>
              <CardTitle>AiqFome</CardTitle>
              <CardDescription>Marketplace de delivery — API V2 + ID Magalu</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={isEnabled}
              onCheckedChange={(v) => setLocalConfig({ ...localConfig, is_enabled: v })}
            />
            <Badge className={isEnabled ? 'bg-emerald-500' : ''}>
              {isEnabled ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config">
              <Settings className="w-4 h-4 mr-2" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="auth">
              <Link className="w-4 h-4 mr-2" />
              Autenticação
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Package className="w-4 h-4 mr-2" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="events">
              <FileText className="w-4 h-4 mr-2" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* ─── CONFIG TAB ─── */}
          <TabsContent value="config" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Store ID (Loja AiqFome)</Label>
                <Input
                  value={currentConfig.store_id || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, store_id: e.target.value })}
                  placeholder="ID da loja no AiqFome"
                />
              </div>
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select
                  value={currentConfig.environment || 'sandbox'}
                  onValueChange={(v) => setLocalConfig({ ...localConfig, environment: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">🧪 Sandbox</SelectItem>
                    <SelectItem value="production">🚀 Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tempo de preparo padrão (min)</Label>
                <Input
                  type="number"
                  value={currentConfig.default_preparation_time_minutes || 30}
                  onChange={(e) => setLocalConfig({ ...localConfig, default_preparation_time_minutes: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="space-y-2 flex items-end gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={currentConfig.auto_confirm_orders ?? false}
                    onCheckedChange={(v) => setLocalConfig({ ...localConfig, auto_confirm_orders: v })}
                  />
                  <Label>Auto-confirmar pedidos</Label>
                </div>
              </div>
            </div>

            {/* Webhook URL */}
            <Alert>
              <Link className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">URL de Webhook</p>
                <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                  {webhookUrl}
                </code>
                <p className="text-xs mt-1 text-muted-foreground">
                  Configure esta URL no portal do desenvolvedor AiqFome para receber notificações de pedidos.
                </p>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleSave} disabled={saveConfig.isPending || Object.keys(localConfig).length === 0}>
                {saveConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Configurações
              </Button>
              <Button
                variant="outline"
                onClick={() => testConnection.mutate()}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Testar Conexão
              </Button>
              <Button
                variant="outline"
                onClick={() => pollEvents.mutate()}
                disabled={pollEvents.isPending}
              >
                {pollEvents.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Buscar Eventos
              </Button>
              <Button
                variant="outline"
                onClick={() => storeStandby.mutate(true)}
                disabled={storeStandby.isPending}
              >
                <PauseCircle className="w-4 h-4 mr-2" />
                Stand-by
              </Button>
            </div>
          </TabsContent>

          {/* ─── AUTH TAB ─── */}
          <TabsContent value="auth" className="space-y-4 mt-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Fluxo de Autenticação — API V2 (ID Magalu)</p>
                <ol className="list-decimal list-inside text-xs space-y-1 text-muted-foreground">
                  <li>Crie sua aplicação no <strong>Portal do Desenvolvedor AiqFome</strong></li>
                  <li>Obtenha <code className="bg-muted px-1 rounded">client_id</code> e <code className="bg-muted px-1 rounded">client_secret</code></li>
                  <li>O seller autoriza sua app <strong>por loja</strong> no ID Magalu</li>
                  <li>Troque o <code className="bg-muted px-1 rounded">code</code> retornado pelo token</li>
                  <li>Renove o token periodicamente com <code className="bg-muted px-1 rounded">refresh_token</code></li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input
                  value={currentConfig.client_id || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, client_id: e.target.value })}
                  placeholder="Obtido no portal do desenvolvedor"
                />
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <div className="relative">
                  <Input
                    type={showSecrets ? 'text' : 'password'}
                    value={currentConfig.client_secret || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, client_secret: e.target.value })}
                    placeholder="Obtido no portal do desenvolvedor"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Redirect URI</Label>
                <Input
                  value={currentConfig.redirect_uri || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, redirect_uri: e.target.value })}
                  placeholder="URL de redirecionamento cadastrada no app"
                />
              </div>
              <div className="space-y-2">
                <Label>Status do Token</Label>
                <div className="flex items-center gap-2 h-10">
                  {hasToken ? (
                    <>
                      <Badge className={tokenExpired ? 'bg-destructive' : 'bg-emerald-500'}>
                        {tokenExpired ? 'Expirado' : 'Válido'}
                      </Badge>
                      {currentConfig.token_expires_at && (
                        <span className="text-xs text-muted-foreground">
                          Expira: {new Date(currentConfig.token_expires_at).toLocaleString('pt-BR')}
                        </span>
                      )}
                    </>
                  ) : (
                    <Badge variant="secondary">Sem token</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Code exchange */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">Trocar Código por Token</h4>
              <p className="text-xs text-muted-foreground">
                Após o seller autorizar sua aplicação no ID Magalu, cole o <code className="bg-muted px-1 rounded">code</code> retornado na URL de redirect.
              </p>
              <div className="flex gap-2">
                <Input
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Cole o code aqui..."
                  className="flex-1"
                />
                <Button onClick={handleExchangeCode} disabled={exchangeCode.isPending}>
                  {exchangeCode.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Trocar'}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saveConfig.isPending || Object.keys(localConfig).length === 0}>
                {saveConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Credenciais
              </Button>
              <Button
                variant="outline"
                onClick={() => refreshToken.mutate()}
                disabled={refreshToken.isPending || !hasToken}
              >
                {refreshToken.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Renovar Token
              </Button>
            </div>

            {currentConfig.token_scopes && (
              <div className="space-y-1">
                <Label className="text-xs">Escopos autorizados</Label>
                <div className="flex flex-wrap gap-1">
                  {currentConfig.token_scopes.split(' ').map((scope: string) => (
                    <Badge key={scope} variant="outline" className="text-[10px]">{scope}</Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ─── ORDERS TAB ─── */}
          <TabsContent value="orders" className="mt-4">
            {isOrdersLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Nenhum pedido AiqFome encontrado. Use "Buscar Eventos" para sincronizar.</AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {orders.map((order) => (
                    <AiqfomeOrderCard
                      key={order.id}
                      order={order}
                      onConfirm={() => confirmOrder.mutate({ order_id: order.id })}
                      onReady={() => readyOrder.mutate(order.id)}
                      onDispatch={() => dispatchOrder.mutate(order.id)}
                      onCancel={() => {
                        if (confirm('Confirma cancelamento do pedido?')) {
                          cancelOrder.mutate({ order_id: order.id });
                        }
                      }}
                      onViewEvents={() => handleViewEvents(order)}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ─── EVENTS TAB ─── */}
          <TabsContent value="events" className="mt-4">
            {selectedOrder ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    Eventos: {selectedOrder.aiqfome_display_id || selectedOrder.aiqfome_order_id.substring(0, 8)}
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
                    Ver todos
                  </Button>
                </div>
                {loadingEvents ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : orderEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {orderEvents.map((ev) => <AiqfomeEventCard key={ev.id} ev={ev} />)}
                    </div>
                  </ScrollArea>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-medium">Últimos Eventos</h4>
                {isEventsLoading ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : events.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Nenhum evento registrado ainda.</AlertDescription>
                  </Alert>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {events.map((ev) => <AiqfomeEventCard key={ev.id} ev={ev} />)}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ─── Order Card ────────────────────────────────
function AiqfomeOrderCard({
  order,
  onConfirm,
  onReady,
  onDispatch,
  onCancel,
  onViewEvents,
  formatCurrency,
}: {
  order: AiqfomeOrder;
  onConfirm: () => void;
  onReady: () => void;
  onDispatch: () => void;
  onCancel: () => void;
  onViewEvents: () => void;
  formatCurrency: (cents: number) => string;
}) {
  const statusLabel = AIQFOME_STATUS_LABELS[order.status] || order.status;
  const statusColor = AIQFOME_STATUS_COLORS[order.status] || 'bg-muted text-muted-foreground';
  const canConfirm = order.status === 'PLACED';
  const canReady = order.status === 'CONFIRMED' || order.status === 'PREPARING';
  const canDispatch = order.status === 'READY';
  const canCancel = !['CANCELLED', 'DELIVERED'].includes(order.status);

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={statusColor}>{statusLabel}</Badge>
          <span className="font-bold">{formatCurrency(order.total_cents)}</span>
          {order.aiqfome_display_id && (
            <span className="text-xs text-muted-foreground font-mono">#{order.aiqfome_display_id}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {order.placed_at ? new Date(order.placed_at).toLocaleString('pt-BR') : new Date(order.created_at).toLocaleString('pt-BR')}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Cliente: </span>
          <span>{order.customer_name || '—'}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Telefone: </span>
          <span>{order.customer_phone || '—'}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Tipo: </span>
          <span>{order.order_type || '—'}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Pagamento: </span>
          <span>{order.payment_method || '—'}</span>
        </div>
      </div>

      {order.delivery_address && (
        <p className="text-xs text-muted-foreground truncate">
          📍 {order.delivery_address}{order.delivery_neighborhood ? `, ${order.delivery_neighborhood}` : ''}
        </p>
      )}

      {order.cancel_reason && (
        <p className="text-xs text-destructive">❌ {order.cancel_reason}</p>
      )}

      <div className="flex gap-1 flex-wrap">
        {canConfirm && (
          <Button variant="default" size="sm" onClick={onConfirm}>
            <Check className="w-3 h-3 mr-1" />
            Confirmar
          </Button>
        )}
        {canReady && (
          <Button variant="outline" size="sm" onClick={onReady}>
            <Package className="w-3 h-3 mr-1" />
            Pronto
          </Button>
        )}
        {canDispatch && (
          <Button variant="outline" size="sm" onClick={onDispatch}>
            <Truck className="w-3 h-3 mr-1" />
            Despachar
          </Button>
        )}
        {canCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <XCircle className="w-3 h-3 mr-1" />
            Cancelar
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onViewEvents}>
          <FileText className="w-3 h-3 mr-1" />
          Eventos
        </Button>
      </div>
    </div>
  );
}

// ─── Event Card ────────────────────────────────
function AiqfomeEventCard({ ev }: { ev: AiqfomeEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded p-2 text-xs space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{ev.event_type}</Badge>
          {ev.status_from && ev.status_to && (
            <span className="text-muted-foreground">
              {ev.status_from} → {ev.status_to}
            </span>
          )}
        </div>
        <span className="text-muted-foreground">
          {new Date(ev.created_at).toLocaleString('pt-BR')}
        </span>
      </div>
      {ev.error_message && (
        <p className="text-destructive">❌ {ev.error_message}</p>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-5 text-[10px]"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Ocultar payload' : 'Ver payload'}
      </Button>
      {expanded && (
        <pre className="bg-muted p-2 rounded text-[10px] overflow-auto max-h-40">
          {JSON.stringify(ev.payload, null, 2)}
        </pre>
      )}
    </div>
  );
}
