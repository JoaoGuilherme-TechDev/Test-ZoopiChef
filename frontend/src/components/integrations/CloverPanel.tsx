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
  CreditCard,
  Settings,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileText,
  Undo2,
  Link,
} from 'lucide-react';
import {
  useClover,
  CLOVER_STATUS_LABELS,
  CLOVER_STATUS_COLORS,
  type CloverTransaction,
  type CloverEvent,
} from '@/hooks/useClover';

export function CloverPanel() {
  const {
    config,
    isConfigLoading,
    saveConfig,
    transactions,
    isTransactionsLoading,
    events,
    isEventsLoading,
    testConnection,
    refundTransaction,
    refreshStatus,
    captureCharge,
    getEvents,
  } = useClover();

  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [showSecrets, setShowSecrets] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('config');
  const [selectedTx, setSelectedTx] = useState<CloverTransaction | null>(null);
  const [txEvents, setTxEvents] = useState<CloverEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const currentConfig = { ...config, ...localConfig };
  const isEnabled = currentConfig.is_enabled ?? false;

  const handleSave = async () => {
    try {
      await saveConfig.mutateAsync(localConfig);
      setLocalConfig({});
    } catch {
      // Error handled in hook
    }
  };

  const handleViewEvents = async (tx: CloverTransaction) => {
    setSelectedTx(tx);
    setLoadingEvents(true);
    setActiveSubTab('events');
    try {
      const evts = await getEvents(tx.id);
      setTxEvents(evts);
    } catch {
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleRefund = async (tx: CloverTransaction) => {
    if (!confirm(`Confirma estorno de R$ ${(tx.amount_cents / 100).toFixed(2)}?`)) return;
    try {
      await refundTransaction.mutateAsync({ transaction_id: tx.id });
    } catch {
      // Error handled in hook
    }
  };

  const handleCapture = async (tx: CloverTransaction) => {
    if (!confirm(`Confirma captura de R$ ${(tx.amount_cents / 100).toFixed(2)}?`)) return;
    try {
      await captureCharge.mutateAsync({ transaction_id: tx.id });
    } catch {
      // Error handled in hook
    }
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const webhookUrl = `${window.location.origin.replace('preview--', '').replace('.lovable.app', '')}/functions/v1/webhook-clover`;

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
            <div className="w-12 h-12 bg-emerald-600/10 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Clover</CardTitle>
              <CardDescription>Pagamentos online, pedidos e terminais POS</CardDescription>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">
              <Settings className="w-4 h-4 mr-2" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <FileText className="w-4 h-4 mr-2" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="events">
              <AlertCircle className="w-4 h-4 mr-2" />
              Logs / Eventos
            </TabsTrigger>
          </TabsList>

          {/* ─── CONFIG TAB ─── */}
          <TabsContent value="config" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Merchant ID</Label>
                <Input
                  value={currentConfig.merchant_id || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, merchant_id: e.target.value })}
                  placeholder="ID do comerciante no Clover"
                />
              </div>
              <div className="space-y-2">
                <Label>API Access Token</Label>
                <div className="relative">
                  <Input
                    type={showSecrets ? 'text' : 'password'}
                    value={currentConfig.api_access_token || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, api_access_token: e.target.value })}
                    placeholder="Token de acesso da API Clover"
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
                <Label>App ID (opcional)</Label>
                <Input
                  value={currentConfig.app_id || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, app_id: e.target.value })}
                  placeholder="ID do app Clover"
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
                <Label>Public Token (Ecommerce)</Label>
                <Input
                  value={currentConfig.public_token || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, public_token: e.target.value })}
                  placeholder="Token público para tokenização de cartão"
                />
                <p className="text-xs text-muted-foreground">Usado no frontend para gerar tokens de cartão</p>
              </div>
              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <Input
                  type={showSecrets ? 'text' : 'password'}
                  value={currentConfig.webhook_secret || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, webhook_secret: e.target.value })}
                  placeholder="Secret para validar webhooks (opcional)"
                />
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
                  Configure esta URL no painel do Clover App Market para receber notificações de pagamento.
                </p>
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Fluxo de Pagamento Ecommerce</p>
                <p className="text-xs text-muted-foreground">
                  1. Tokenize o cartão via iframe/hosted tokenizer do Clover usando o <strong>Public Token</strong><br />
                  2. Envie o token gerado (<code className="bg-muted px-1 rounded">source</code>) para <code className="bg-muted px-1 rounded">POST /v1/charges</code><br />
                  3. O webhook atualiza automaticamente o status da transação
                </p>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saveConfig.isPending || Object.keys(localConfig).length === 0}>
                {saveConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Configurações
              </Button>
              <Button
                variant="outline"
                onClick={() => testConnection.mutate()}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Testar Conexão
              </Button>
            </div>
          </TabsContent>

          {/* ─── TRANSACTIONS TAB ─── */}
          <TabsContent value="transactions" className="mt-4">
            {isTransactionsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Nenhuma transação Clover encontrada.</AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <CloverTransactionCard
                      key={tx.id}
                      tx={tx}
                      onViewEvents={() => handleViewEvents(tx)}
                      onRefund={() => handleRefund(tx)}
                      onCapture={() => handleCapture(tx)}
                      onRefreshStatus={() => refreshStatus.mutate(tx.id)}
                      isRefreshing={refreshStatus.isPending}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ─── EVENTS / LOGS TAB ─── */}
          <TabsContent value="events" className="mt-4">
            {selectedTx ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    Eventos: {selectedTx.reference_id || selectedTx.id.substring(0, 8)}
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTx(null)}>
                    Ver todos
                  </Button>
                </div>
                {loadingEvents ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : txEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {txEvents.map((ev) => (
                        <EventCard key={ev.id} ev={ev} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-medium">Últimos Eventos</h4>
                {isEventsLoading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : events.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Nenhum evento registrado ainda.</AlertDescription>
                  </Alert>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {events.map((ev) => (
                        <EventCard key={ev.id} ev={ev} />
                      ))}
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

// ─── Transaction Card Component ────────────────
function CloverTransactionCard({
  tx,
  onViewEvents,
  onRefund,
  onCapture,
  onRefreshStatus,
  isRefreshing,
  formatCurrency,
}: {
  tx: CloverTransaction;
  onViewEvents: () => void;
  onRefund: () => void;
  onCapture: () => void;
  onRefreshStatus: () => void;
  isRefreshing: boolean;
  formatCurrency: (cents: number) => string;
}) {
  const statusLabel = CLOVER_STATUS_LABELS[tx.status] || tx.status;
  const statusColor = CLOVER_STATUS_COLORS[tx.status] || 'bg-muted text-muted-foreground';
  const canRefund = ['PAID', 'CAPTURED'].includes(tx.status);
  const canCapture = tx.status === 'AUTHORIZED' && !tx.captured;

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={statusColor}>{statusLabel}</Badge>
          <span className="font-bold">{formatCurrency(tx.amount_cents)}</span>
          {tx.tip_amount_cents ? (
            <span className="text-xs text-muted-foreground">
              + {formatCurrency(tx.tip_amount_cents)} gorjeta
            </span>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(tx.created_at).toLocaleString('pt-BR')}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Ref: </span>
          <span className="font-mono">{tx.reference_id || tx.clover_charge_id || '—'}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Cartão: </span>
          <span>{tx.card_brand ? `${tx.card_brand} •••• ${tx.card_last4}` : '—'}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Auth: </span>
          <span className="font-mono">{tx.authorization_code || '—'}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Ref Num: </span>
          <span className="font-mono">{tx.ref_num || '—'}</span>
        </div>
      </div>

      {tx.error_message && (
        <p className="text-xs text-destructive">❌ {tx.error_message}</p>
      )}

      <div className="flex gap-1 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onRefreshStatus} disabled={isRefreshing}>
          <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
        {canCapture && (
          <Button variant="ghost" size="sm" onClick={onCapture}>
            <CreditCard className="w-3 h-3 mr-1" />
            Capturar
          </Button>
        )}
        {canRefund && (
          <Button variant="ghost" size="sm" onClick={onRefund}>
            <Undo2 className="w-3 h-3 mr-1" />
            Estornar
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

// ─── Event Card Component ──────────────────────
function EventCard({ ev }: { ev: CloverEvent }) {
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
