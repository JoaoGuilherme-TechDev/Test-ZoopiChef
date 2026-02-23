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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  CheckCircle2,
  XCircle,
  ExternalLink,
  Undo2,
  Link,
  Smartphone,
  FileText,
} from 'lucide-react';
import {
  usePagBank,
  PAGBANK_STATUS_LABELS,
  PAGBANK_STATUS_COLORS,
  PAGBANK_PAYMENT_METHOD_LABELS,
  type PagBankTransaction,
  type PagBankEvent,
} from '@/hooks/usePagBank';

export function PagBankPanel() {
  const {
    config,
    isConfigLoading,
    saveConfig,
    transactions,
    isTransactionsLoading,
    testConnection,
    refundTransaction,
    refreshStatus,
    getEvents,
  } = usePagBank();

  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [showSecrets, setShowSecrets] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('config');
  const [selectedTx, setSelectedTx] = useState<PagBankTransaction | null>(null);
  const [txEvents, setTxEvents] = useState<PagBankEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const currentConfig = { ...config, ...localConfig };
  const isEnabled = currentConfig.is_enabled ?? false;

  const handleSave = async () => {
    try {
      await saveConfig.mutateAsync(localConfig);
      setLocalConfig({});
    } catch (e) {
      // Error handled in hook
    }
  };

  const handleViewEvents = async (tx: PagBankTransaction) => {
    setSelectedTx(tx);
    setLoadingEvents(true);
    try {
      const events = await getEvents(tx.id);
      setTxEvents(events);
    } catch {
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleRefund = async (tx: PagBankTransaction) => {
    if (!confirm(`Confirma reembolso de R$ ${(tx.amount_cents / 100).toFixed(2)}?`)) return;
    try {
      await refundTransaction.mutateAsync({ transaction_id: tx.id });
    } catch (e) {
      // Error handled in hook
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  const webhookUrl = `${window.location.origin.replace('preview--', '').replace('.lovable.app', '')}/functions/v1/webhook-pagbank`;

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
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <CardTitle>PagBank / PagSeguro</CardTitle>
              <CardDescription>SmartPOS, PIX, Cartão, Boleto e Link de Pagamento</CardDescription>
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
                <Label>Client ID</Label>
                <Input
                  value={currentConfig.client_id || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, client_id: e.target.value })}
                  placeholder="PagBank Client ID"
                />
              </div>
              <div className="space-y-2">
                <Label>Client Secret / Token</Label>
                <div className="relative">
                  <Input
                    type={showSecrets ? 'text' : 'password'}
                    value={currentConfig.client_secret || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, client_secret: e.target.value })}
                    placeholder="PagBank Client Secret"
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
                <Label>SmartPOS Key</Label>
                <Input
                  type={showSecrets ? 'text' : 'password'}
                  value={currentConfig.smartpos_key || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, smartpos_key: e.target.value })}
                  placeholder="Chave SmartPOS (opcional)"
                />
              </div>
              <div className="space-y-2">
                <Label>SmartPOS Secret</Label>
                <Input
                  type={showSecrets ? 'text' : 'password'}
                  value={currentConfig.smartpos_secret || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, smartpos_secret: e.target.value })}
                  placeholder="Secret SmartPOS (opcional)"
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
                <Label>Webhook Secret</Label>
                <Input
                  type={showSecrets ? 'text' : 'password'}
                  value={currentConfig.webhook_secret || ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, webhook_secret: e.target.value })}
                  placeholder="Secret para validar webhooks"
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
                  Configure esta URL no painel do PagBank para receber notificações de pagamento.
                </p>
              </AlertDescription>
            </Alert>

            {/* Token status */}
            {config?.token_expires_at && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Token expira em: {new Date(config.token_expires_at).toLocaleString('pt-BR')}
                </AlertDescription>
              </Alert>
            )}

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
                <AlertDescription>Nenhuma transação PagBank encontrada.</AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <TransactionCard
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
                    Eventos da transação: {selectedTx.reference_id || selectedTx.id.substring(0, 8)}
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTx(null)}>
                    Limpar
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
                        <Card key={ev.id} className="p-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{ev.event_type}</Badge>
                              {ev.status_from && ev.status_to && (
                                <span className="text-muted-foreground">
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
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Selecione uma transação na aba "Transações" e clique em "Ver Eventos" para visualizar os logs.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ─── TRANSACTION CARD ─────────────────────────────
function TransactionCard({
  tx,
  onViewEvents,
  onRefund,
  onRefreshStatus,
  isRefreshing,
  formatCurrency,
}: {
  tx: PagBankTransaction;
  onViewEvents: () => void;
  onRefund: () => void;
  onRefreshStatus: () => void;
  isRefreshing: boolean;
  formatCurrency: (cents: number) => string;
}) {
  const statusLabel = PAGBANK_STATUS_LABELS[tx.status] || tx.status;
  const statusColor = PAGBANK_STATUS_COLORS[tx.status] || 'bg-muted text-muted-foreground';
  const methodLabel = PAGBANK_PAYMENT_METHOD_LABELS[tx.payment_method || ''] || tx.payment_method || '—';
  const canRefund = ['PAID', 'AVAILABLE', 'AUTHORIZED'].includes(tx.status);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{formatCurrency(tx.amount_cents)}</span>
            <Badge className={statusColor}>{statusLabel}</Badge>
            <Badge variant="outline" className="text-xs">{methodLabel}</Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>
              Ref: {tx.reference_id || '—'} 
              {tx.pagbank_order_id && <span> | PagBank: {tx.pagbank_order_id.substring(0, 12)}…</span>}
            </p>
            {tx.card_brand && (
              <p>{tx.card_brand} •••• {tx.card_last_digits} {tx.authorization_code && `| Auth: ${tx.authorization_code}`}</p>
            )}
            {tx.customer_name && <p>Cliente: {tx.customer_name}</p>}
            {tx.error_message && (
              <p className="text-destructive">Erro: {tx.error_message}</p>
            )}
            {tx.refund_amount_cents && (
              <p className="text-purple-500">Reembolso: {formatCurrency(tx.refund_amount_cents)}</p>
            )}
            <p>{new Date(tx.created_at).toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" onClick={onRefreshStatus} disabled={isRefreshing}>
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onViewEvents}>
            <FileText className="w-3 h-3" />
          </Button>
          {canRefund && (
            <Button variant="ghost" size="sm" onClick={onRefund} className="text-destructive">
              <Undo2 className="w-3 h-3" />
            </Button>
          )}
          {tx.payment_link_url && (
            <Button variant="ghost" size="sm" asChild>
              <a href={tx.payment_link_url} target="_blank" rel="noopener">
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
