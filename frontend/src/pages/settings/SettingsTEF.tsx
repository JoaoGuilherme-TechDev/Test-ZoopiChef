import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  useTEFIntegrations, 
  useCreateTEFIntegration, 
  useUpdateTEFIntegration, 
  useDeleteTEFIntegration,
  useTEFTransactions,
  useTEFStats,
  TEF_PROVIDERS,
  TEFIntegration,
  TEFProvider
} from '@/hooks/useTEFIntegration';
import { CreditCard, Plus, Settings, CheckCircle, XCircle, Clock, Trash2, Edit, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FormData {
  provider: TEFProvider;
  merchant_id: string;
  terminal_id: string;
  api_key: string;
  secret_key: string;
  environment: 'sandbox' | 'production';
  is_active: boolean;
}

const initialFormData: FormData = {
  provider: 'stone',
  merchant_id: '',
  terminal_id: '',
  api_key: '',
  secret_key: '',
  environment: 'sandbox',
  is_active: false,
};

export default function SettingsTEF() {
  const { data: integrations, isLoading } = useTEFIntegrations();
  const { data: transactions } = useTEFTransactions();
  const { data: stats } = useTEFStats();
  const createIntegration = useCreateTEFIntegration();
  const updateIntegration = useUpdateTEFIntegration();
  const deleteIntegration = useDeleteTEFIntegration();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const handleEdit = (integration: TEFIntegration) => {
    setEditingId(integration.id);
    setFormData({
      provider: integration.provider,
      merchant_id: integration.merchant_id || '',
      terminal_id: integration.terminal_id || '',
      api_key: integration.api_key || '',
      secret_key: integration.secret_key || '',
      environment: integration.environment,
      is_active: integration.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingId) {
      await updateIntegration.mutateAsync({ id: editingId, ...formData });
    } else {
      await createIntegration.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta integração?')) {
      await deleteIntegration.mutateAsync(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-0"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'declined':
        return <Badge className="bg-red-500/20 text-red-400 border-0"><XCircle className="w-3 h-3 mr-1" />Recusado</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-0"><Clock className="w-3 h-3 mr-1" />Processando</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-0"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Integrações TEF">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Integrações TEF">
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Integrações TEF</CardTitle>
                  <CardDescription>Configure suas maquininhas de pagamento (Stone, Cielo, Clover, etc.)</CardDescription>
                </div>
              </div>
              <Button onClick={() => { setEditingId(null); setFormData(initialFormData); setIsDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Integração
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-400">Transações Hoje</p>
                    <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-400">Aprovadas</p>
                    <p className="text-2xl font-bold">{stats.approved}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-400">Recusadas</p>
                    <p className="text-2xl font-bold">{stats.declined}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-400">Volume Aprovado</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalApproved)}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="integrations">
          <TabsList>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="mt-4">
            {/* Providers Grid */}
            <div className="grid gap-4 md:grid-cols-3">
              {TEF_PROVIDERS.map((provider) => {
                const integration = integrations?.find(i => i.provider === provider.value);
                const isConfigured = !!integration;
                const isActive = integration?.is_active;

                return (
                  <Card key={provider.value} className={`transition-all ${isActive ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: provider.color + '20' }}>
                            {provider.logo}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{provider.label}</CardTitle>
                            <CardDescription>
                              {isConfigured ? (isActive ? 'Ativo' : 'Configurado') : 'Não configurado'}
                            </CardDescription>
                          </div>
                        </div>
                        {isActive && <Badge className="bg-green-500/20 text-green-400 border-0">Ativo</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isConfigured ? (
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground">
                            Ambiente: <span className="text-foreground">{integration.environment === 'production' ? 'Produção' : 'Sandbox'}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(integration)}>
                              <Edit className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-400" onClick={() => handleDelete(integration.id)}>
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button variant="outline" className="w-full" onClick={() => { setFormData({ ...initialFormData, provider: provider.value }); setIsDialogOpen(true); }}>
                          <Settings className="w-4 h-4 mr-2" />
                          Configurar
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Transações Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions && transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Cartão</TableHead>
                        <TableHead>NSU</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{format(new Date(tx.created_at), "dd/MM HH:mm", { locale: ptBR })}</TableCell>
                          <TableCell className="capitalize">{tx.payment_type}</TableCell>
                          <TableCell>{formatCurrency(tx.amount_cents)}</TableCell>
                          <TableCell>
                            {tx.card_brand && tx.card_last_digits 
                              ? `${tx.card_brand} ****${tx.card_last_digits}` 
                              : '-'}
                          </TableCell>
                          <TableCell>{tx.nsu || '-'}</TableCell>
                          <TableCell>{getStatusBadge(tx.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma transação registrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Config Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Nova'} Integração TEF</DialogTitle>
              <DialogDescription>Configure as credenciais da sua adquirente</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Provedor</Label>
                <Select value={formData.provider} onValueChange={(v) => setFormData({ ...formData, provider: v as TEFProvider })} disabled={!!editingId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEF_PROVIDERS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.logo} {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Merchant ID</Label>
                  <Input value={formData.merchant_id} onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })} placeholder="ID do lojista" />
                </div>
                <div className="space-y-2">
                  <Label>Terminal ID</Label>
                  <Input value={formData.terminal_id} onChange={(e) => setFormData({ ...formData, terminal_id: e.target.value })} placeholder="ID do terminal" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input value={formData.api_key} onChange={(e) => setFormData({ ...formData, api_key: e.target.value })} placeholder="Chave de API" type="password" />
              </div>
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <Input value={formData.secret_key} onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })} placeholder="Chave secreta" type="password" />
              </div>
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select value={formData.environment} onValueChange={(v) => setFormData({ ...formData, environment: v as 'sandbox' | 'production' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                    <SelectItem value="production">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Ativar Integração</p>
                  <p className="text-sm text-muted-foreground">Habilitar para receber pagamentos</p>
                </div>
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createIntegration.isPending || updateIntegration.isPending}>
                {(createIntegration.isPending || updateIntegration.isPending) ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
