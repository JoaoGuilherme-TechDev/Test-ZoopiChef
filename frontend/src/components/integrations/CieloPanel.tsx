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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  Smartphone,
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
  ChevronDown,
  Info,
  Terminal,
} from 'lucide-react';
import {
  useCielo,
  CIELO_STATUS_LABELS,
  CIELO_STATUS_COLORS,
  CIELO_PAYMENT_CODE_LABELS,
  CIELO_ERROR_CODES,
  CIELO_CAPTURE_TYPES,
  type CieloTransaction,
  type CieloEvent,
} from '@/hooks/useCielo';

export function CieloPanel() {
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
    getEvents,
  } = useCielo();

  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [showSecrets, setShowSecrets] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('config');
  const [selectedTx, setSelectedTx] = useState<CieloTransaction | null>(null);
  const [txEvents, setTxEvents] = useState<CieloEvent[]>([]);
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

  const handleViewEvents = async (tx: CieloTransaction) => {
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

  const handleRefund = async (tx: CieloTransaction) => {
    if (!confirm(`Confirma estorno de R$ ${(tx.amount_cents / 100).toFixed(2)}?`)) return;
    try {
      await refundTransaction.mutateAsync({ transaction_id: tx.id });
    } catch {
      // Error handled in hook
    }
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const webhookUrl = `${window.location.origin.replace('preview--', '').replace('.lovable.app', '')}/functions/v1/webhook-cielo`;

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
            <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Cielo Smart / LIO</CardTitle>
              <CardDescription>Terminal inteligente, Deep Link, Order Manager</CardDescription>
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
            <TabsTrigger value="transactions">
              <FileText className="w-4 h-4 mr-2" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="events">
              <AlertCircle className="w-4 h-4 mr-2" />
              Logs / Eventos
            </TabsTrigger>
            <TabsTrigger value="reference">
              <Info className="w-4 h-4 mr-2" />
              Referência
            </TabsTrigger>
          </TabsList>

          {/* ─── CONFIG TAB ─── */}
          <TabsContent value="config" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client-ID</Label>
                <Input
                  value={currentConfig.client_id || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, client_id: e.target.value })}
                  placeholder="Client-ID do Portal de Desenvolvedores Cielo"
                />
              </div>
              <div className="space-y-2">
                <Label>Access Token</Label>
                <div className="relative">
                  <Input
                    type={showSecrets ? 'text' : 'password'}
                    value={currentConfig.access_token || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, access_token: e.target.value })}
                    placeholder="Access Token Cielo"
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
                <Label>Código do Estabelecimento (EC)</Label>
                <Input
                  value={currentConfig.merchant_code || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, merchant_code: e.target.value })}
                  placeholder="EC / Merchant Code"
                />
                <p className="text-xs text-muted-foreground">Obrigatório para Multi-EC</p>
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
                <Label>Webhook Secret</Label>
                <Input
                  type={showSecrets ? 'text' : 'password'}
                  value={currentConfig.webhook_secret || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, webhook_secret: e.target.value })}
                  placeholder="Secret para validar webhooks (opcional)"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={currentConfig.auto_refresh_token ?? true}
                onCheckedChange={(v) => setLocalConfig({ ...localConfig, auto_refresh_token: v })}
              />
              <Label>Renovar token automaticamente</Label>
            </div>

            {/* Webhook URL */}
            <Alert>
              <Link className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">URL de Callback / Webhook</p>
                <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                  {webhookUrl}
                </code>
                <p className="text-xs mt-1 text-muted-foreground">
                  Configure esta URL no painel da Cielo para receber notificações de transação.
                </p>
              </AlertDescription>
            </Alert>

            {/* Deep Link Info */}
            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Integração via Deep Link</p>
                <p className="text-xs text-muted-foreground">
                  Ao criar pedidos ou enviar para o terminal, o sistema gera automaticamente o Deep Link
                  no formato <code className="bg-muted px-1 rounded">lio://payment?request=BASE64&amp;urlCallback=order://response</code>.
                  A resposta do terminal retorna via callback com os dados da transação em Base64.
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
                <AlertDescription>Nenhuma transação Cielo encontrada.</AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <CieloTransactionCard
                      key={tx.id}
                      tx={tx}
                      onViewEvents={() => handleViewEvents(tx)}
                      onRefund={() => handleRefund(tx)}
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

          {/* ─── REFERENCE TAB ─── */}
          <TabsContent value="reference" className="mt-4 space-y-4">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="font-medium">Códigos de Pagamento (paymentCode)</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {Object.entries(CIELO_PAYMENT_CODE_LABELS).map(([code, label]) => (
                    <div key={code} className="flex gap-2 text-xs py-0.5">
                      <code className="bg-muted px-1.5 rounded font-mono whitespace-nowrap">{code}</code>
                      <span className="text-muted-foreground">→ {label}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="font-medium">Códigos de Erro (Deep Link)</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-1">
                  {Object.entries(CIELO_ERROR_CODES).map(([code, desc]) => (
                    <div key={code} className="flex gap-2 text-xs py-0.5">
                      <code className="bg-destructive/10 text-destructive px-1.5 rounded font-mono">code: {code}</code>
                      <span className="text-muted-foreground">→ {desc}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="font-medium">Tipos de Captura do Cartão</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-1">
                  {Object.entries(CIELO_CAPTURE_TYPES).map(([code, desc]) => (
                    <div key={code} className="flex gap-2 text-xs py-0.5">
                      <code className="bg-muted px-1.5 rounded font-mono">cardCaptureType: {code}</code>
                      <span className="text-muted-foreground">→ {desc}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="font-medium">statusCode (paymentFields)</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-1 text-xs">
                  <div className="flex gap-2 py-0.5">
                    <code className="bg-amber-500/10 text-amber-600 px-1.5 rounded font-mono">0</code>
                    <span className="text-muted-foreground">→ PIX (pendente)</span>
                  </div>
                  <div className="flex gap-2 py-0.5">
                    <code className="bg-emerald-500/10 text-emerald-600 px-1.5 rounded font-mono">1</code>
                    <span className="text-muted-foreground">→ Autorizada (paga)</span>
                  </div>
                  <div className="flex gap-2 py-0.5">
                    <code className="bg-destructive/10 text-destructive px-1.5 rounded font-mono">2</code>
                    <span className="text-muted-foreground">→ Cancelada</span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Deep Link — Formato URI</p>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p><strong>Pagamento:</strong></p>
                  <code className="block bg-muted px-2 py-1 rounded break-all">
                    lio://payment?request=BASE64_JSON&amp;urlCallback=order://response
                  </code>
                  <p className="mt-2"><strong>Cancelamento:</strong></p>
                  <code className="block bg-muted px-2 py-1 rounded break-all">
                    lio://cancellation?request=BASE64_JSON&amp;urlCallback=order://response
                  </code>
                  <p className="mt-2"><strong>Listagem de pedidos:</strong></p>
                  <code className="block bg-muted px-2 py-1 rounded break-all">
                    lio://order-list?request=BASE64_JSON&amp;urlCallback=order://response
                  </code>
                </div>
              </AlertDescription>
            </Alert>

            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Terminais Compatíveis</p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>• DX8000 — Android 10, 1GB RAM, 8GB</p>
                  <p>• L300 (LIO V3) — Android 7.1, 1GB RAM, 8GB</p>
                  <p>• L400 — Android 11, 2GB RAM, 32GB</p>
                  <p>• L300 (V4) — Android 11, 2GB RAM, 32GB</p>
                </div>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ─── EVENT CARD ───────────────────────────────────
function EventCard({ ev }: { ev: CieloEvent }) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{ev.event_type}</Badge>
          {ev.status_from && ev.status_to && (
            <span className="text-muted-foreground text-xs">
              {ev.status_from} → {ev.status_to}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(ev.created_at).toLocaleString('pt-BR')}
        </span>
      </div>
      {ev.payload && (
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer">Payload</summary>
          <pre className="text-xs mt-1 bg-muted p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(ev.payload, null, 2)}
          </pre>
        </details>
      )}
    </Card>
  );
}

// ─── TRANSACTION CARD ─────────────────────────────
function CieloTransactionCard({
  tx,
  onViewEvents,
  onRefund,
  onRefreshStatus,
  isRefreshing,
  formatCurrency,
}: {
  tx: CieloTransaction;
  onViewEvents: () => void;
  onRefund: () => void;
  onRefreshStatus: () => void;
  isRefreshing: boolean;
  formatCurrency: (cents: number) => string;
}) {
  const statusLabel = CIELO_STATUS_LABELS[tx.status] || tx.status;
  const statusColor = CIELO_STATUS_COLORS[tx.status] || 'bg-muted text-muted-foreground';
  const methodLabel = CIELO_PAYMENT_CODE_LABELS[tx.payment_code || ''] || tx.payment_method || '—';
  const canRefund = ['PAID', 'ENTERED'].includes(tx.status);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-sm">{formatCurrency(tx.amount_cents)}</span>
            <Badge className={statusColor}>{statusLabel}</Badge>
            <Badge variant="outline" className="text-xs">{methodLabel}</Badge>
            {tx.installments && tx.installments > 0 && (
              <Badge variant="outline" className="text-xs">{tx.installments}x</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>
              Ref: {tx.reference_id || '—'}
              {tx.cielo_order_id && <span> | Cielo: {tx.cielo_order_id.substring(0, 12)}…</span>}
            </p>
            {tx.card_brand && (
              <p>{tx.card_brand} {tx.card_mask} {tx.authorization_code && `| Auth: ${tx.authorization_code}`}</p>
            )}
            {tx.nsu && <p>NSU: {tx.nsu}</p>}
            {tx.cielo_code && <p>Cielo Code: {tx.cielo_code}</p>}
            {tx.terminal_id && <p>Terminal: {tx.terminal_id}</p>}
            {tx.customer_name && <p>Cliente: {tx.customer_name}</p>}
            {tx.error_message && (
              <p className="text-destructive">Erro: {tx.error_message}</p>
            )}
            {tx.refund_amount_cents && (
              <p className="text-purple-500">Estorno: {formatCurrency(tx.refund_amount_cents)}</p>
            )}
            <p>{new Date(tx.created_at).toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" onClick={onRefreshStatus} disabled={isRefreshing} title="Atualizar status">
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onViewEvents} title="Ver eventos">
            <FileText className="w-3 h-3" />
          </Button>
          {canRefund && (
            <Button variant="ghost" size="sm" onClick={onRefund} className="text-destructive" title="Estornar">
              <Undo2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
