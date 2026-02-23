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
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import {
  useERede,
  EREDE_STATUS_LABELS,
  EREDE_STATUS_COLORS,
  type ERedeTransaction,
  type ERedeEvent,
} from '@/hooks/useERede';

export function ERedePanel() {
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
    captureTransaction,
    getEvents,
  } = useERede();

  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [showSecrets, setShowSecrets] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('config');
  const [selectedTx, setSelectedTx] = useState<ERedeTransaction | null>(null);
  const [txEvents, setTxEvents] = useState<ERedeEvent[]>([]);
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

  const handleViewEvents = async (tx: ERedeTransaction) => {
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

  const maskValue = (val: string | null) => {
    if (!val) return '';
    if (showSecrets) return val;
    return val.length > 8 ? val.slice(0, 4) + '••••' + val.slice(-4) : '••••••••';
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('pt-BR');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                e.Rede (Itaú)
                {isEnabled && <Badge className="bg-emerald-500 text-xs">Ativo</Badge>}
              </CardTitle>
              <CardDescription>
                Pagamentos com cartão de crédito, débito, PIX e validação Zero Dollar via Rede Itaú
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="erede-enabled" className="text-sm">Habilitado</Label>
            <Switch
              id="erede-enabled"
              checked={isEnabled}
              onCheckedChange={(v) => setLocalConfig({ ...localConfig, is_enabled: v })}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="config"><Settings className="w-4 h-4 mr-1" /> Configuração</TabsTrigger>
            <TabsTrigger value="transactions"><CreditCard className="w-4 h-4 mr-1" /> Transações</TabsTrigger>
            <TabsTrigger value="events"><FileText className="w-4 h-4 mr-1" /> Logs</TabsTrigger>
          </TabsList>

          {/* ─── CONFIGURAÇÃO ─────────────────────── */}
          <TabsContent value="config" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <SelectItem value="sandbox">Sandbox (Homologação)</SelectItem>
                    <SelectItem value="production">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Captura Automática</Label>
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    checked={currentConfig.auto_capture ?? true}
                    onCheckedChange={(v) => setLocalConfig({ ...localConfig, auto_capture: v })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {currentConfig.auto_capture ? 'Captura automática' : 'Captura posterior (manual)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Credenciais OAuth 2.0</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSecrets(!showSecrets)}
                >
                  {showSecrets ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                  {showSecrets ? 'Ocultar' : 'Mostrar'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>PV (clientId) *</Label>
                  <Input
                    type={showSecrets ? 'text' : 'password'}
                    value={localConfig.client_id ?? config?.client_id ?? ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, client_id: e.target.value })}
                    placeholder="Número de Filiação (PV)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chave de Integração (clientSecret) *</Label>
                  <Input
                    type={showSecrets ? 'text' : 'password'}
                    value={localConfig.client_secret ?? config?.client_secret ?? ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, client_secret: e.target.value })}
                    placeholder="Gerada no Portal Use Rede"
                  />
                </div>
              </div>

              {config?.access_token && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Access Token ativo. Expira em: {config.token_expires_at ? formatDate(config.token_expires_at) : 'N/A'}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold">Opções Adicionais</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Soft Descriptor (fatura)</Label>
                  <Input
                    value={localConfig.soft_descriptor ?? config?.soft_descriptor ?? ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, soft_descriptor: e.target.value.substring(0, 18) })}
                    placeholder="Até 18 caracteres"
                    maxLength={18}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL de Notificação (callback)</Label>
                  <Input
                    value={localConfig.notification_url ?? config?.notification_url ?? ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, notification_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome da Conta (referência interna)</Label>
                <Input
                  value={localConfig.account_name ?? config?.account_name ?? ''}
                  onChange={(e) => setLocalConfig({ ...localConfig, account_name: e.target.value })}
                  placeholder="Ex: Loja Principal"
                />
              </div>
            </div>

            {config?.last_test_at && (
              <Alert variant={config.last_test_result === 'success' ? 'default' : 'destructive'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Último teste: {formatDate(config.last_test_at)} — {config.last_test_result === 'success' ? '✅ Sucesso' : `❌ ${config.last_test_result}`}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saveConfig.isPending || Object.keys(localConfig).length === 0}>
                {saveConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Configuração
              </Button>
              <Button
                variant="outline"
                onClick={() => testConnection.mutate()}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Testar Conexão
              </Button>
            </div>
          </TabsContent>

          {/* ─── TRANSAÇÕES ───────────────────────── */}
          <TabsContent value="transactions" className="space-y-4">
            {isTransactionsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma transação registrada</p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <Card key={tx.id} className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`text-xs ${EREDE_STATUS_COLORS[tx.status] || 'bg-gray-500'}`}>
                              {EREDE_STATUS_LABELS[tx.status] || tx.status}
                            </Badge>
                            <span className="font-semibold">{formatCurrency(tx.amount_cents)}</span>
                            {tx.installments > 1 && (
                              <span className="text-xs text-muted-foreground">{tx.installments}x</span>
                            )}
                            {tx.card_brand && (
                              <span className="text-xs text-muted-foreground">{tx.card_brand}</span>
                            )}
                            {tx.card_last4 && (
                              <span className="text-xs text-muted-foreground">****{tx.card_last4}</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                            {tx.tid && <span>TID: {tx.tid}</span>}
                            {tx.reference && <span>Ref: {tx.reference}</span>}
                            <span>{formatDate(tx.created_at)}</span>
                          </div>
                          {tx.return_message && tx.status !== 'captured' && tx.status !== 'authorized' && (
                            <p className="text-xs text-destructive mt-1">{tx.return_message}</p>
                          )}
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          {tx.status === 'authorized' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => captureTransaction.mutate({ transaction_id: tx.id })}
                              disabled={captureTransaction.isPending}
                            >
                              {captureTransaction.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              <span className="ml-1 text-xs">Capturar</span>
                            </Button>
                          )}
                          {(tx.status === 'captured' || tx.status === 'authorized') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => refundTransaction.mutate({
                                transaction_id: tx.id,
                                amount_cents: tx.amount_cents - (tx.refunded_amount_cents || 0),
                              })}
                              disabled={refundTransaction.isPending}
                            >
                              {refundTransaction.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                              <span className="ml-1 text-xs">Cancelar</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewEvents(tx)}
                          >
                            <FileText className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ─── LOGS / EVENTS ────────────────────── */}
          <TabsContent value="events" className="space-y-4">
            {selectedTx && (
              <Alert>
                <AlertDescription className="text-sm">
                  Eventos da transação: <strong>{selectedTx.tid || selectedTx.reference}</strong>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => { setSelectedTx(null); setTxEvents([]); }}
                  >
                    Ver todos
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {(selectedTx ? loadingEvents : isEventsLoading) ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {(selectedTx ? txEvents : events).map((ev) => (
                    <Card key={ev.id} className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{ev.event_type}</Badge>
                            {ev.return_code && (
                              <span className="text-xs font-mono">{ev.return_code}</span>
                            )}
                            {ev.status_from && ev.status_to && (
                              <span className="text-xs text-muted-foreground">
                                {ev.status_from} → {ev.status_to}
                              </span>
                            )}
                          </div>
                          {ev.return_message && (
                            <p className="text-xs text-muted-foreground mt-1">{ev.return_message}</p>
                          )}
                          {ev.error_message && (
                            <p className="text-xs text-destructive mt-1">{ev.error_message}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDate(ev.created_at)}
                        </span>
                      </div>
                    </Card>
                  ))}
                  {(selectedTx ? txEvents : events).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Nenhum evento registrado</p>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
