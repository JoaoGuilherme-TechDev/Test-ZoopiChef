import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useSmartPOSDevices, useCreateSmartPOSDevice, useDeleteSmartPOSDevice, useSmartPOSPendingTransactions, useCancelSmartPOSTransaction, useUpdateSmartPOSDevice, useSmartPOSTEFDevices, SmartPOSDevice } from '@/hooks/useSmartPOS';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Smartphone, Plus, Trash2, Settings, RefreshCw, CreditCard, Clock, CheckCircle, XCircle, AlertCircle, Copy, Eye, Link2, Link2Off, BarChart3, Printer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SmartPOSPrinterSettings } from '@/components/smartpos/SmartPOSPrinterSettings';
import { ptBR } from 'date-fns/locale';

const PROVIDERS = [
  { value: 'pagseguro', label: 'PagSeguro' },
  { value: 'stone', label: 'Stone' },
  { value: 'cielo', label: 'Cielo' },
  { value: 'rede', label: 'Rede' },
  { value: 'getnet', label: 'GetNet' },
];

const MODES = [
  { 
    value: 'tef', 
    label: 'TEF (Recebedor)', 
    description: 'Recebe pagamentos enviados de outros PDVs. Ideal para caixa central.',
    icon: '💳',
    needsLink: false
  },
  { 
    value: 'comandeira', 
    label: 'Comandeira (Garçom)', 
    description: 'Lança pedidos e envia pagamento para TEF. Ideal para garçons.',
    icon: '📝',
    needsLink: true
  },
  { 
    value: 'pdv', 
    label: 'PDV Smart', 
    description: 'PDV completo: lança pedidos e processa pagamentos na mesma máquina.',
    icon: '🏪',
    needsLink: false
  },
  { 
    value: 'ticketeria', 
    label: 'Ticketeria', 
    description: 'Vende itens e imprime um ticket por item para troca no bar/cozinha.',
    icon: '🎫',
    needsLink: false
  },
];

interface DeviceFormData {
  device_serial: string;
  device_name: string;
  device_model: string;
  provider: string;
  mode: string;
  is_active: boolean;
  linked_tef_device_id: string | null;
}

const initialFormData: DeviceFormData = {
  device_serial: '',
  device_name: '',
  device_model: '',
  provider: 'pagseguro',
  mode: 'pdv',
  is_active: true,
  linked_tef_device_id: null,
};

export default function SettingsSmartPOS() {
  const { data: devices, isLoading: devicesLoading, refetch: refetchDevices } = useSmartPOSDevices();
  const { data: pendingTransactions, isLoading: transactionsLoading } = useSmartPOSPendingTransactions();
  const { data: tefDevices } = useSmartPOSTEFDevices();
  const { data: userRole } = useUserRole();
  const createDevice = useCreateSmartPOSDevice();
  const updateDevice = useUpdateSmartPOSDevice();
  const deleteDevice = useDeleteSmartPOSDevice();
  const cancelTransaction = useCancelSmartPOSTransaction();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<DeviceFormData>(initialFormData);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [linkDialogDevice, setLinkDialogDevice] = useState<string | null>(null);
  const [selectedTefId, setSelectedTefId] = useState<string | null>(null);
  const [printerSettingsDevice, setPrinterSettingsDevice] = useState<SmartPOSDevice | null>(null);

  const { isSuperAdmin } = useUserRoles();
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';

  const handleSubmit = async () => {
    if (!formData.device_serial.trim()) {
      toast.error('Serial do dispositivo é obrigatório');
      return;
    }

    // Se o modo precisa de TEF vinculada e não tem, avisar
    const modeConfig = MODES.find(m => m.value === formData.mode);
    if (modeConfig?.needsLink && !formData.linked_tef_device_id) {
      toast.warning('Atenção: Este dispositivo precisa de uma TEF vinculada para enviar pagamentos');
    }

    try {
      await createDevice.mutateAsync({
        device_serial: formData.device_serial,
        device_name: formData.device_name || null,
        device_model: formData.device_model || null,
        provider: formData.provider,
        mode: formData.mode,
        is_active: formData.is_active,
        linked_tef_device_id: formData.linked_tef_device_id,
      });
      setIsDialogOpen(false);
      setFormData(initialFormData);
    } catch {
      // Error handled in hook
    }
  };

  const handleDelete = async (deviceId: string) => {
    try {
      await deleteDevice.mutateAsync(deviceId);
    } catch {
      // Error handled in hook
    }
  };

  const handleCancelTransaction = async (transactionId: string) => {
    try {
      await cancelTransaction.mutateAsync(transactionId);
    } catch {
      // Error handled in hook
    }
  };

  const handleLinkTef = async (deviceId: string, tefId: string | null) => {
    try {
      await updateDevice.mutateAsync({ id: deviceId, linked_tef_device_id: tefId });
      setLinkDialogDevice(null);
      setSelectedTefId(null);
      toast.success(tefId ? 'TEF vinculada com sucesso' : 'Vínculo removido');
    } catch {
      // Error handled in hook
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-300"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Processando</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-300"><XCircle className="w-3 h-3 mr-1" />Recusado</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-700 border-gray-300"><AlertCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  if (devicesLoading) {
    return (
      <DashboardLayout title="Smart POS">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Smart POS">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-display">Maquininhas Smart POS</CardTitle>
                  <CardDescription>
                    Gerencie seus dispositivos de pagamento integrados
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/pos-simulator'}>
                  <Settings className="w-4 h-4 mr-2" />
                  Simulador
                </Button>
                {isAdmin && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Dispositivo
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Novo Dispositivo Smart POS</DialogTitle>
                        <DialogDescription>
                          Configure as informações do dispositivo para integrá-lo ao sistema.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="serial">Serial do Dispositivo *</Label>
                          <Input
                            id="serial"
                            value={formData.device_serial}
                            onChange={(e) => setFormData({ ...formData, device_serial: e.target.value })}
                            placeholder="Ex: A30S-12345678"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome do Dispositivo</Label>
                          <Input
                            id="name"
                            value={formData.device_name}
                            onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                            placeholder="Ex: Caixa 1, Balcão Principal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="model">Modelo</Label>
                          <Input
                            id="model"
                            value={formData.device_model}
                            onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
                            placeholder="Ex: A30, A920, S920"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Provedor</Label>
                            <Select value={formData.provider} onValueChange={(v) => setFormData({ ...formData, provider: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PROVIDERS.map((p) => (
                                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Modo de Operação</Label>
                            <Select value={formData.mode} onValueChange={(v) => setFormData({ ...formData, mode: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MODES.map((m) => (
                                  <SelectItem key={m.value} value={m.value}>
                                    <span className="flex items-center gap-2">
                                      <span>{m.icon}</span>
                                      <span>{m.label}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {formData.mode && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {MODES.find(m => m.value === formData.mode)?.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Campo de vínculo com TEF - aparece apenas para comandeira */}
                        {MODES.find(m => m.value === formData.mode)?.needsLink && (
                          <div className="space-y-2 p-3 border border-dashed rounded-lg bg-orange-500/5">
                            <Label className="flex items-center gap-2">
                              <Link2 className="w-4 h-4" />
                              TEF Vinculada (Obrigatório)
                            </Label>
                            <Select 
                              value={formData.linked_tef_device_id || ''} 
                              onValueChange={(v) => setFormData({ ...formData, linked_tef_device_id: v || null })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a TEF deste PDV" />
                              </SelectTrigger>
                              <SelectContent>
                                {tefDevices?.map((tef) => (
                                  <SelectItem key={tef.id} value={tef.id}>
                                    {tef.device_name || tef.device_serial}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Os pagamentos deste dispositivo serão enviados para a TEF selecionada
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">Ativo</p>
                            <p className="text-sm text-muted-foreground">Dispositivo pode receber transações</p>
                          </div>
                          <Switch
                            checked={formData.is_active}
                            onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={createDevice.isPending}>
                          {createDevice.isPending ? 'Salvando...' : 'Salvar Dispositivo'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Modos de Operação */}
        <Card className="border-border/50 shadow-soft bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Modos de Operação Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {MODES.map((mode) => (
                <div key={mode.value} className="bg-background rounded-lg p-3 border">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{mode.icon}</span>
                    <span className="font-medium text-sm">{mode.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{mode.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="devices" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="devices">
              <Smartphone className="w-4 h-4 mr-2" />
              Dispositivos
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <CreditCard className="w-4 h-4 mr-2" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart3 className="w-4 h-4 mr-2" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          {/* Devices Tab */}
          <TabsContent value="devices" className="mt-4">
            <Card className="border-border/50 shadow-soft">
              <CardContent className="pt-6">
                {!devices || devices.length === 0 ? (
                  <div className="text-center py-12">
                    <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">Nenhum dispositivo cadastrado</h3>
                    <p className="text-muted-foreground mb-4">
                      Adicione seu primeiro dispositivo Smart POS para começar a receber pagamentos integrados.
                    </p>
                    {isAdmin && (
                      <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Dispositivo
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{devices.length} dispositivo(s) cadastrado(s)</p>
                      <Button variant="outline" size="sm" onClick={() => refetchDevices()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dispositivo</TableHead>
                          <TableHead>Serial</TableHead>
                          <TableHead>Provedor</TableHead>
                          <TableHead>Modo</TableHead>
                          <TableHead>TEF Vinculada</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Última Conexão</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {devices.map((device) => (
                          <TableRow key={device.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{device.device_name || 'Sem nome'}</p>
                                <p className="text-xs text-muted-foreground">{device.device_model || '-'}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded">{device.device_serial}</code>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(device.device_serial)}>
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {PROVIDERS.find((p) => p.value === device.provider)?.label || device.provider}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const mode = MODES.find((m) => m.value === device.mode);
                                return (
                                  <Badge variant="secondary" className="gap-1">
                                    {mode?.icon} {mode?.label || device.mode}
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              {/* Mostrar TEF vinculada apenas para modos que precisam */}
                              {MODES.find(m => m.value === device.mode)?.needsLink ? (
                                device.linked_tef_device ? (
                                  <div className="flex items-center gap-2">
                                    <Link2 className="w-3 h-3 text-green-600" />
                                    <span className="text-sm">{device.linked_tef_device.device_name || device.linked_tef_device.device_serial}</span>
                                    {isAdmin && (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-5 w-5" 
                                        onClick={() => {
                                          setLinkDialogDevice(device.id);
                                          setSelectedTefId(device.linked_tef_device_id);
                                        }}
                                      >
                                        <Settings className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                ) : (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-orange-600 border-orange-300 h-7"
                                    onClick={() => {
                                      setLinkDialogDevice(device.id);
                                      setSelectedTefId(null);
                                    }}
                                  >
                                    <Link2Off className="w-3 h-3 mr-1" />
                                    Vincular TEF
                                  </Button>
                                )
                              ) : device.mode === 'tef' ? (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-300">
                                  É uma TEF
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {device.is_active ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-300">Ativo</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-500/10 text-gray-700 border-gray-300">Inativo</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {device.last_seen_at ? (
                                <span className="text-sm text-muted-foreground">
                                  {formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true, locale: ptBR })}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">Nunca conectou</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Botão de Impressora - apenas para PDV e Ticketeria */}
                                {(device.mode === 'pdv' || device.mode === 'ticketeria') && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setPrinterSettingsDevice(device)}
                                    title="Configurar Impressora"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => setSelectedDevice(device.id)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {isAdmin && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Remover Dispositivo</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja remover este dispositivo? Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(device.id)}>
                                          Remover
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="mt-4">
            <Card className="border-border/50 shadow-soft">
              <CardContent className="pt-6">
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : !pendingTransactions || pendingTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">Nenhuma transação pendente</h3>
                    <p className="text-muted-foreground">
                      Transações pendentes e em processamento aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Parcelas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{formatCurrency(transaction.amount_cents)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {transaction.payment_method === 'credit' && 'Crédito'}
                              {transaction.payment_method === 'debit' && 'Débito'}
                              {transaction.payment_method === 'pix' && 'PIX'}
                              {transaction.payment_method === 'voucher' && 'Voucher'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {transaction.installments > 1 ? `${transaction.installments}x` : 'À vista'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(transaction.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            {(transaction.status === 'pending' || transaction.status === 'processing') && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleCancelTransaction(transaction.id)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Cancelar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-4">
            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">Relatórios por Dispositivo</CardTitle>
                <CardDescription>
                  Visualize transações e métricas por cada dispositivo Smart POS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2">Relatórios em Desenvolvimento</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Em breve você poderá visualizar relatórios detalhados de transações por PDV, 
                    incluindo volume de vendas, métodos de pagamento mais utilizados e tempo médio de processamento.
                  </p>
                </div>
                
                {/* Preview dos dispositivos com contagem de transações */}
                {devices && devices.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Dispositivos Cadastrados</h4>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {devices.map((device) => {
                        const mode = MODES.find(m => m.value === device.mode);
                        return (
                          <div key={device.id} className="p-4 border rounded-lg bg-muted/30">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{mode?.icon}</span>
                              <span className="font-medium">{device.device_name || device.device_serial}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{mode?.label}</p>
                            {device.linked_tef_device && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                                <Link2 className="w-3 h-3" />
                                Vinculado: {device.linked_tef_device.device_name || device.linked_tef_device.device_serial}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog para vincular TEF */}
        <Dialog open={!!linkDialogDevice} onOpenChange={(open) => !open && setLinkDialogDevice(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Vincular TEF ao Dispositivo
              </DialogTitle>
              <DialogDescription>
                Selecione qual máquina TEF receberá os pagamentos deste dispositivo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Máquina TEF</Label>
                <Select value={selectedTefId || ''} onValueChange={setSelectedTefId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma TEF" />
                  </SelectTrigger>
                  <SelectContent>
                    {tefDevices?.map((tef) => (
                      <SelectItem key={tef.id} value={tef.id}>
                        <span className="flex items-center gap-2">
                          <span>💳</span>
                          <span>{tef.device_name || tef.device_serial}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {!tefDevices?.length && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-300 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    Nenhuma TEF cadastrada. Cadastre primeiro um dispositivo no modo "TEF (Recebedor)".
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              {selectedTefId && (
                <Button 
                  variant="outline" 
                  className="text-destructive"
                  onClick={() => linkDialogDevice && handleLinkTef(linkDialogDevice, null)}
                >
                  <Link2Off className="w-4 h-4 mr-2" />
                  Remover Vínculo
                </Button>
              )}
              <Button 
                onClick={() => linkDialogDevice && selectedTefId && handleLinkTef(linkDialogDevice, selectedTefId)}
                disabled={!selectedTefId || updateDevice.isPending}
              >
                {updateDevice.isPending ? 'Salvando...' : 'Vincular TEF'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Integration Instructions */}
        <Card className="border-border/50 shadow-soft bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Como Integrar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-background rounded-lg border">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h4 className="font-medium mb-1">Cadastre o Dispositivo</h4>
                <p className="text-sm text-muted-foreground">
                  Adicione o serial da maquininha e configure o modo de operação.
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h4 className="font-medium mb-1">Instale o App</h4>
                <p className="text-sm text-muted-foreground">
                  Baixe e instale o aplicativo na maquininha Smart POS.
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h4 className="font-medium mb-1">Comece a Usar</h4>
                <p className="text-sm text-muted-foreground">
                  Envie pagamentos diretamente do PDV para a maquininha.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Printer Settings Dialog */}
        <SmartPOSPrinterSettings
          open={!!printerSettingsDevice}
          onOpenChange={(open) => !open && setPrinterSettingsDevice(null)}
          device={printerSettingsDevice}
        />
      </div>
    </DashboardLayout>
  );
}
