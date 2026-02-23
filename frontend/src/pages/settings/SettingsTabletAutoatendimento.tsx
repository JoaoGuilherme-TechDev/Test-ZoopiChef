import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Edit, Tablet, Palette, Timer, ExternalLink, Upload, Image, X, Copy, Link } from 'lucide-react';
import { useTabletSettings, useUpsertTabletSettings } from '@/hooks/useTabletSettings';
import { useTabletDevices, useCreateTabletDevice, useUpdateTabletDevice, useDeleteTabletDevice, TabletDevice } from '@/hooks/useTabletDevices';
import { useTables } from '@/hooks/useTables';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase-shim';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageSpecsCard } from '@/components/settings/ImageSpecsCard';

// Paletas de cores predefinidas para Tablet
const TABLET_COLOR_PALETTES = [
  // PALETAS CLARAS
  {
    name: 'Clean Branco',
    colors: {
      primary_color: '#000000',
      secondary_color: '#666666',
      background_color: '#ffffff',
    },
  },
  {
    name: 'Moderno Claro',
    colors: {
      primary_color: '#2563eb',
      secondary_color: '#60a5fa',
      background_color: '#f8fafc',
    },
  },
  {
    name: 'Natural Claro',
    colors: {
      primary_color: '#16a34a',
      secondary_color: '#4ade80',
      background_color: '#f0fdf4',
    },
  },
  {
    name: 'Elegante Claro',
    colors: {
      primary_color: '#7c3aed',
      secondary_color: '#a78bfa',
      background_color: '#faf5ff',
    },
  },
  {
    name: 'Café Claro',
    colors: {
      primary_color: '#78350f',
      secondary_color: '#d97706',
      background_color: '#fffbeb',
    },
  },
  // PALETAS ESCURAS
  {
    name: 'Clássico Escuro',
    colors: {
      primary_color: '#ffffff',
      secondary_color: '#a1a1aa',
      background_color: '#18181b',
    },
  },
  {
    name: 'Restaurante Elegante',
    colors: {
      primary_color: '#dc2626',
      secondary_color: '#fbbf24',
      background_color: '#1c1c1c',
    },
  },
  {
    name: 'Fast Food Vibrante',
    colors: {
      primary_color: '#ff0000',
      secondary_color: '#ffcc00',
      background_color: '#2d2d2d',
    },
  },
  {
    name: 'Natural & Orgânico',
    colors: {
      primary_color: '#22c55e',
      secondary_color: '#86efac',
      background_color: '#14532d',
    },
  },
  {
    name: 'Sushi Moderno',
    colors: {
      primary_color: '#3b82f6',
      secondary_color: '#93c5fd',
      background_color: '#0f172a',
    },
  },
];

export default function SettingsTabletAutoatendimento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();
  const { data: settings, isLoading: settingsLoading } = useTabletSettings();
  const { data: devices = [], isLoading: devicesLoading } = useTabletDevices();
  const { tables } = useTables();
  const upsertSettings = useUpsertTabletSettings();
  const createDevice = useCreateTabletDevice();
  const updateDevice = useUpdateTabletDevice();
  const deleteDevice = useDeleteTabletDevice();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for settings
  const [enabled, setEnabled] = useState(settings?.enabled ?? false);
  const [primaryColor, setPrimaryColor] = useState(settings?.primary_color ?? '#000000');
  const [secondaryColor, setSecondaryColor] = useState(settings?.secondary_color ?? '#ffffff');
  const [backgroundColor, setBackgroundColor] = useState(settings?.background_color ?? '#f5f5f5');
  const [footerText, setFooterText] = useState(settings?.footer_text ?? 'Faça seu pedido pelo tablet');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>(settings?.layout_mode ?? 'grid');
  const [idleMessage, setIdleMessage] = useState(settings?.idle_message ?? 'Toque para começar');
  const [idleTimeout, setIdleTimeout] = useState(settings?.idle_timeout_seconds ?? 60);
  const [requirePin, setRequirePin] = useState(settings?.require_pin ?? true);
  const [adminPin, setAdminPin] = useState('');
  const [adminPassword, setAdminPassword] = useState(settings?.admin_password ?? 'zoopi603329');
  const [allowPixPayment, setAllowPixPayment] = useState(settings?.allow_pix_payment ?? false);
  const [pixProvider, setPixProvider] = useState<'asaas' | 'mercadopago' | ''>(settings?.pix_provider ?? '');
  const [idleImages, setIdleImages] = useState<string[]>(settings?.idle_images ?? []);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Device form states
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState<(TabletDevice & { access_token?: string }) | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [deviceTable, setDeviceTable] = useState('');
  const [deviceMode, setDeviceMode] = useState<'TABLE_ONLY' | 'TABLE_WITH_COMANDA_QR'>('TABLE_ONLY');
  const [deviceAllowOrdering, setDeviceAllowOrdering] = useState(true);
  const [deviceAllowPayment, setDeviceAllowPayment] = useState(false);
  const [devicePin, setDevicePin] = useState('');

  // Fetch devices with access_token
  const { data: devicesWithToken = [] } = useQuery({
    queryKey: ['tablet_devices_with_token', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('tablet_devices')
        .select('*, access_token')
        .eq('company_id', company.id)
        .order('device_name');
      if (error) throw error;
      return data as (TabletDevice & { access_token: string })[];
    },
    enabled: !!company?.id,
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setPrimaryColor(settings.primary_color);
      setSecondaryColor(settings.secondary_color);
      setBackgroundColor(settings.background_color);
      setFooterText(settings.footer_text);
      setLayoutMode(settings.layout_mode);
      setIdleMessage(settings.idle_message);
      setIdleTimeout(settings.idle_timeout_seconds);
      setRequirePin(settings.require_pin);
      setAdminPassword(settings.admin_password ?? 'zoopi603329');
      setAllowPixPayment(settings.allow_pix_payment);
      setPixProvider(settings.pix_provider ?? '');
      setIdleImages(settings.idle_images ?? []);
    }
  }, [settings]);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company?.id) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande (máximo 5MB)');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tablet-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tablet-images')
        .getPublicUrl(fileName);

      setIdleImages(prev => [...prev, publicUrl]);
      toast.success('Imagem enviada!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setIdleImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveSettings = async () => {
    try {
      await upsertSettings.mutateAsync({
        enabled,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        background_color: backgroundColor,
        footer_text: footerText,
        layout_mode: layoutMode,
        idle_message: idleMessage,
        idle_timeout_seconds: idleTimeout,
        require_pin: requirePin,
        admin_pin_hash: adminPin ? btoa(adminPin) : undefined,
        admin_password: adminPassword || 'zoopi603329',
        allow_pix_payment: allowPixPayment,
        pix_provider: pixProvider || null,
        idle_images: idleImages,
      });
      toast.success('Configurações salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleOpenDeviceDialog = (device?: TabletDevice & { access_token?: string }) => {
    if (device) {
      setEditingDevice(device);
      setDeviceName(device.device_name);
      setDeviceTable(device.assigned_table_number || '');
      setDeviceMode(device.mode);
      setDeviceAllowOrdering(device.allow_ordering);
      setDeviceAllowPayment(device.allow_payment);
      setDevicePin('');
    } else {
      setEditingDevice(null);
      setDeviceName('');
      setDeviceTable('');
      setDeviceMode('TABLE_ONLY');
      setDeviceAllowOrdering(true);
      setDeviceAllowPayment(false);
      setDevicePin('');
    }
    setShowDeviceDialog(true);
  };

  const handleSaveDevice = async () => {
    if (!deviceName.trim()) {
      toast.error('Nome do dispositivo é obrigatório');
      return;
    }

    try {
      const data = {
        device_name: deviceName,
        assigned_table_number: deviceTable || null,
        mode: deviceMode,
        allow_ordering: deviceAllowOrdering,
        allow_payment: deviceAllowPayment,
        pin_hash: devicePin ? btoa(devicePin) : undefined,
      };

      if (editingDevice) {
        await updateDevice.mutateAsync({ id: editingDevice.id, ...data });
        toast.success('Dispositivo atualizado!');
      } else {
        await createDevice.mutateAsync(data);
        toast.success('Dispositivo criado!');
      }
      setShowDeviceDialog(false);
      queryClient.invalidateQueries({ queryKey: ['tablet_devices_with_token'] });
    } catch (error) {
      toast.error('Erro ao salvar dispositivo');
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este dispositivo?')) return;
    try {
      await deleteDevice.mutateAsync(id);
      toast.success('Dispositivo excluído!');
      queryClient.invalidateQueries({ queryKey: ['tablet_devices_with_token'] });
    } catch (error) {
      toast.error('Erro ao excluir dispositivo');
    }
  };

  const getTabletUrl = (device: TabletDevice & { access_token?: string }) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/tablet/${device.access_token}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiado!');
  };

  if (settingsLoading || devicesLoading) {
    return (
      <DashboardLayout title="Autoatendimento Tablet">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Autoatendimento Tablet">
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Autoatendimento Tablet</h1>
            <p className="text-muted-foreground">Configure tablets para autoatendimento nas mesas</p>
          </div>
        </div>

        <Tabs defaultValue="devices" className="space-y-4">
          <TabsList>
            <TabsTrigger value="devices">
              <Tablet className="h-4 w-4 mr-2" />
              Dispositivos
            </TabsTrigger>
            <TabsTrigger value="general">
              <Tablet className="h-4 w-4 mr-2" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="idle">
              <Timer className="h-4 w-4 mr-2" />
              Tela Ociosa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Dispositivos Tablet</CardTitle>
                  <CardDescription>
                    Crie tablets e use o link para instalar. A configuração de mesa é feita no próprio tablet.
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenDeviceDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Tablet
                </Button>
              </CardHeader>
              <CardContent>
                {devicesWithToken.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tablet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum dispositivo configurado</p>
                    <p className="text-sm">Clique em "Novo Tablet" para adicionar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {devicesWithToken.map((device) => (
                      <Card key={device.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{device.device_name}</span>
                              <Badge variant={device.is_active ? 'default' : 'secondary'}>
                                {device.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                              {device.assigned_table_number && (
                                <Badge variant="outline">Mesa {device.assigned_table_number}</Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Link className="h-4 w-4" />
                              <code className="bg-muted px-2 py-1 rounded text-xs break-all">
                                {getTabletUrl(device)}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(getTabletUrl(device))}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Modo: {device.mode === 'TABLE_ONLY' ? 'Mesa' : 'Mesa + Comanda'}</span>
                              <span>Pedidos: {device.allow_ordering ? 'Sim' : 'Não'}</span>
                              <span>Pagamento: {device.allow_payment ? 'Sim' : 'Não'}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(getTabletUrl(device), '_blank')}
                              title="Abrir tablet"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDeviceDialog(device)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDevice(device.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Como usar:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Crie um novo dispositivo tablet acima</li>
                    <li>Copie o link gerado e abra no navegador do tablet</li>
                    <li>No tablet, pressione o logo por 5 segundos para acessar as configurações</li>
                    <li>Configure o número da mesa e o PIN diretamente no tablet</li>
                    <li>Ative o modo tela cheia para uma experiência kiosk completa</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>Ative e configure o módulo de autoatendimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ativar Autoatendimento</Label>
                    <p className="text-sm text-muted-foreground">Habilita o módulo para todos os tablets</p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Exigir PIN para Configuração</Label>
                    <p className="text-sm text-muted-foreground">Protege o acesso às configurações do tablet</p>
                  </div>
                  <Switch checked={requirePin} onCheckedChange={setRequirePin} />
                </div>

                {requirePin && (
                  <div className="space-y-2">
                    <Label>PIN de Administração (4 dígitos)</Label>
                    <Input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                      className="w-32"
                    />
                    <p className="text-sm text-muted-foreground">
                      Este PIN serve como backup para acessar qualquer tablet
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Senha de Acesso às Configurações</Label>
                  <Input
                    type="text"
                    placeholder="Senha"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-64"
                  />
                  <p className="text-sm text-muted-foreground">
                    Senha para acessar as configurações através do botão ⚙️ no tablet. Padrão: zoopi603329
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4">Pagamento PIX</h3>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label>Permitir Pagamento PIX no Tablet</Label>
                      <p className="text-sm text-muted-foreground">Clientes podem pagar diretamente pelo tablet</p>
                    </div>
                    <Switch checked={allowPixPayment} onCheckedChange={setAllowPixPayment} />
                  </div>

                  {allowPixPayment && (
                    <div className="space-y-2">
                      <Label>Provedor PIX</Label>
                      <Select value={pixProvider} onValueChange={(v) => setPixProvider(v as 'asaas' | 'mercadopago')}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asaas">Asaas</SelectItem>
                          <SelectItem value="mercadopago">MercadoPago</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveSettings} disabled={upsertSettings.isPending}>
                  {upsertSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Aparência do Tablet</CardTitle>
                <CardDescription>Personalize cores e layout do autoatendimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Paletas de Cores Predefinidas */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Paletas de Cores</Label>
                  <p className="text-sm text-muted-foreground">Escolha uma paleta predefinida ou personalize as cores abaixo</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {TABLET_COLOR_PALETTES.map((palette) => (
                      <button
                        key={palette.name}
                        onClick={() => {
                          setPrimaryColor(palette.colors.primary_color);
                          setSecondaryColor(palette.colors.secondary_color);
                          setBackgroundColor(palette.colors.background_color);
                        }}
                        className="p-3 rounded-lg border hover:border-primary transition-all text-left"
                        style={{ backgroundColor: palette.colors.background_color }}
                      >
                        <div className="flex gap-1 mb-2">
                          <div 
                            className="w-6 h-6 rounded-full border" 
                            style={{ backgroundColor: palette.colors.primary_color }}
                          />
                          <div 
                            className="w-6 h-6 rounded-full border" 
                            style={{ backgroundColor: palette.colors.secondary_color }}
                          />
                        </div>
                        <span 
                          className="text-xs font-medium"
                          style={{ color: palette.colors.primary_color }}
                        >
                          {palette.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold">Cores Personalizadas</Label>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor Secundária</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de Fundo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Layout dos Produtos</Label>
                  <Select value={layoutMode} onValueChange={(v) => setLayoutMode(v as 'grid' | 'list')}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grade (Grid)</SelectItem>
                      <SelectItem value="list">Lista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Texto do Rodapé</Label>
                  <Input
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Faça seu pedido pelo tablet"
                  />
                </div>

                <Button onClick={handleSaveSettings} disabled={upsertSettings.isPending}>
                  {upsertSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="idle">
            <Card>
              <CardHeader>
                <CardTitle>Tela Ociosa</CardTitle>
                <CardDescription>Configure o que aparece quando o tablet está inativo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Tempo de Inatividade (segundos)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={600}
                    value={idleTimeout}
                    onChange={(e) => setIdleTimeout(parseInt(e.target.value) || 60)}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    Após {idleTimeout} segundos sem interação, a tela ociosa será exibida
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Mensagem da Tela Ociosa</Label>
                  <Input
                    value={idleMessage}
                    onChange={(e) => setIdleMessage(e.target.value)}
                    placeholder="Toque para começar"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Imagens de Propaganda</Label>
                      <p className="text-sm text-muted-foreground">
                        Adicione imagens que serão exibidas em carrossel na tela ociosa
                      </p>
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUploadImage}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Adicionar Imagem
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {idleImages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {idleImages.map((url, index) => (
                        <div key={index} className="relative group aspect-video bg-muted rounded-lg overflow-hidden">
                          <img 
                            src={url} 
                            alt={`Propaganda ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <Badge className="absolute bottom-2 left-2" variant="secondary">
                            {index + 1}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                      <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma imagem adicionada</p>
                      <p className="text-sm">As imagens aparecerão em carrossel na tela ociosa</p>
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveSettings} disabled={upsertSettings.isPending}>
                  {upsertSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Device Dialog */}
        <Dialog open={showDeviceDialog} onOpenChange={setShowDeviceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDevice ? 'Editar Tablet' : 'Novo Tablet'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Dispositivo</Label>
                <Input
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Ex: Tablet Mesa 10"
                />
                <p className="text-sm text-muted-foreground">
                  Nome para identificar o tablet (a mesa será configurada no próprio tablet)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Modo de Operação</Label>
                <Select value={deviceMode} onValueChange={(v) => setDeviceMode(v as typeof deviceMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TABLE_ONLY">Mesa Nativa (pedido vai direto para mesa)</SelectItem>
                    <SelectItem value="TABLE_WITH_COMANDA_QR">Mesa + Comanda (lê QR da comanda)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Permite Fazer Pedidos</Label>
                  <p className="text-sm text-muted-foreground">Se desativado, apenas visualiza cardápio</p>
                </div>
                <Switch checked={deviceAllowOrdering} onCheckedChange={setDeviceAllowOrdering} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Permite Pagamento</Label>
                  <p className="text-sm text-muted-foreground">Habilita pagamento PIX no tablet</p>
                </div>
                <Switch checked={deviceAllowPayment} onCheckedChange={setDeviceAllowPayment} />
              </div>

              <div className="space-y-2">
                <Label>PIN do Tablet (4 dígitos)</Label>
                <Input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={devicePin}
                  onChange={(e) => setDevicePin(e.target.value.replace(/\D/g, ''))}
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  {editingDevice ? 'Deixe em branco para manter o PIN atual' : 'PIN para acessar configurações do tablet'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeviceDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveDevice} disabled={createDevice.isPending || updateDevice.isPending}>
                {editingDevice ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Specs Card */}
        <ImageSpecsCard />
      </div>
    </DashboardLayout>
  );
}
