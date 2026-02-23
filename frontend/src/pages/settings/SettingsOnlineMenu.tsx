import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnlineMenuSettings } from '@/hooks/useOnlineMenuSettings';
import { useOnlineStoreSettings } from '@/hooks/useOnlineStoreSettings';
import { useCompany, useUpdateCompany } from '@/hooks/useCompany';
import { useUploadLogo } from '@/hooks/useCompanySettings';
import { useBanners } from '@/hooks/useBanners';
import { toast } from 'sonner';
import { 
  Palette, Store, Image, Upload, Loader2, Trash2, Plus, 
  ExternalLink, Eye, Clock, Power, PowerOff
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';

export default function SettingsOnlineMenu() {
  const { settings, isLoading, updateSettings, uploadCoverBanner } = useOnlineMenuSettings();
  const { data: company } = useCompany();
  const updateCompany = useUpdateCompany();
  const uploadLogo = useUploadLogo();
  const { banners, createBanner, updateBanner, deleteBanner, uploadBannerImage } = useBanners();
  const {
    settings: storeSettings,
    hours,
    status,
    isLoading: storeLoading,
    toggleOpen,
    toggleOverride,
    updateEtaAdjust,
    addHour,
    updateHour,
    deleteHour,
    weekdayNames,
  } = useOnlineStoreSettings();

  const [newHour, setNewHour] = useState({
    weekday: 1,
    start_time: '18:00',
    end_time: '23:00',
  });

  const [activeTab, setActiveTab] = useState('visual');
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [visualForm, setVisualForm] = useState({
    primary_color: settings?.primary_color || '#6366f1',
    secondary_color: settings?.secondary_color || '#8b5cf6',
    background_color: settings?.background_color || '#ffffff',
    text_color: settings?.text_color || '#1f2937',
    public_menu_layout: settings?.public_menu_layout || 'classic',
    public_menu_category_layout: settings?.public_menu_category_layout || 'accordion',
    public_menu_card_layout: settings?.public_menu_card_layout || 'compact',
    public_menu_mode: settings?.public_menu_mode || 'detailed',
  });

  const [storeForm, setStoreForm] = useState({
    address: settings?.address || '',
    phone: settings?.phone || '',
    whatsapp: settings?.whatsapp || '',
    welcome_message: settings?.welcome_message || '',
    public_menu_show_address: settings?.public_menu_show_address ?? true,
    public_menu_show_phone: settings?.public_menu_show_phone ?? true,
    public_menu_show_hours: settings?.public_menu_show_hours ?? true,
    public_menu_show_banner: settings?.public_menu_show_banner ?? true,
  });

  // Update forms when settings load
  useState(() => {
    if (settings) {
      setVisualForm({
        primary_color: settings.primary_color || '#6366f1',
        secondary_color: settings.secondary_color || '#8b5cf6',
        background_color: settings.background_color || '#ffffff',
        text_color: settings.text_color || '#1f2937',
        public_menu_layout: settings.public_menu_layout || 'classic',
        public_menu_category_layout: settings.public_menu_category_layout || 'accordion',
        public_menu_card_layout: settings.public_menu_card_layout || 'compact',
        public_menu_mode: settings.public_menu_mode || 'detailed',
      });
      setStoreForm({
        address: settings.address || '',
        phone: settings.phone || '',
        whatsapp: settings.whatsapp || '',
        welcome_message: settings.welcome_message || '',
        public_menu_show_address: settings.public_menu_show_address ?? true,
        public_menu_show_phone: settings.public_menu_show_phone ?? true,
        public_menu_show_hours: settings.public_menu_show_hours ?? true,
        public_menu_show_banner: settings.public_menu_show_banner ?? true,
      });
    }
  });

  const handleSaveVisual = async () => {
    setSaving(true);
    try {
      await updateSettings.mutateAsync(visualForm);
      toast.success('Configurações visuais salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStore = async () => {
    setSaving(true);
    try {
      await updateSettings.mutateAsync(storeForm);
      toast.success('Informações da loja salvas!');
    } catch (error) {
      toast.error('Erro ao salvar informações');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadLogo.mutateAsync(file);
      toast.success('Logo atualizado!');
    } catch (error) {
      toast.error('Erro ao fazer upload do logo');
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadCoverBanner.mutateAsync(file);
      toast.success('Banner de capa atualizado!');
    } catch (error) {
      toast.error('Erro ao fazer upload do banner');
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company?.id) return;

    try {
      const imageUrl = await uploadBannerImage(file, company.id);
      await createBanner.mutateAsync({
        company_id: company.id,
        image_url: imageUrl,
        banner_type: 'promotion',
        source: 'manual',
      } as any);
      toast.success('Banner de promoção adicionado!');
    } catch (error) {
      toast.error('Erro ao adicionar banner');
    }
  };

  const promotionBanners = banners.filter((b: any) => b.banner_type === 'promotion' || !b.banner_type);
  const menuUrl = company?.slug ? `${window.location.origin}/m/${company.slug}` : '';

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pedido Online</h1>
            <p className="text-muted-foreground">Configure a aparência e funcionalidades do seu cardápio público</p>
          </div>
          {menuUrl && (
            <Button variant="outline" asChild>
              <a href={menuUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Cardápio
              </a>
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="funcionamento" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Funcionamento
            </TabsTrigger>
            <TabsTrigger value="visual" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Loja
            </TabsTrigger>
            <TabsTrigger value="banners" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Banners
            </TabsTrigger>
          </TabsList>

          {/* Tab Funcionamento */}
          <TabsContent value="funcionamento" className="space-y-6">
            {/* Status e Controle Manual */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {status?.allowed_to_order ? (
                    <Power className="h-5 w-5 text-green-500" />
                  ) : (
                    <PowerOff className="h-5 w-5 text-red-500" />
                  )}
                  Status da Loja Online
                </CardTitle>
                <CardDescription>
                  Controle se sua loja está aceitando pedidos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full ${status?.allowed_to_order ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="font-medium">
                        Loja {status?.allowed_to_order ? 'ABERTA' : 'FECHADA'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {status?.reason === 'manual_override' && 'Modo manual ativo'}
                        {status?.reason === 'scheduled' && 'Conforme horário programado'}
                        {status?.reason === 'outside_hours' && 'Fora do horário de funcionamento'}
                        {status?.reason === 'default' && 'Configuração padrão'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Controle Manual</Label>
                      <p className="text-sm text-muted-foreground">
                        Ignorar horários programados e controlar manualmente
                      </p>
                    </div>
                    <Switch
                      checked={storeSettings?.manual_override || false}
                      onCheckedChange={(v) => toggleOverride.mutate(v)}
                    />
                  </div>

                  {storeSettings?.manual_override && (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        variant={storeSettings?.is_online_open ? 'outline' : 'default'}
                        onClick={() => toggleOpen.mutate(true)}
                        disabled={storeSettings?.is_online_open}
                      >
                        <Power className="h-4 w-4 mr-2" />
                        Abrir Loja
                      </Button>
                      <Button
                        className="flex-1"
                        variant={!storeSettings?.is_online_open ? 'outline' : 'destructive'}
                        onClick={() => toggleOpen.mutate(false)}
                        disabled={!storeSettings?.is_online_open}
                      >
                        <PowerOff className="h-4 w-4 mr-2" />
                        Fechar Loja
                      </Button>
                    </div>
                  )}
                </div>

                {/* Ajuste ETA */}
                <div className="border-t pt-4">
                  <Label className="text-base">Ajuste de Tempo Estimado (ETA)</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adicionar minutos extras ao tempo de entrega
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[0, 10, 20, 30, 45, 60].map((mins) => (
                      <Button
                        key={mins}
                        variant={storeSettings?.eta_adjust_minutes === mins ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateEtaAdjust.mutate(mins)}
                      >
                        {mins === 0 ? 'Normal' : `+${mins}min`}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grade de Horários */}
            <Card>
              <CardHeader>
                <CardTitle>Grade de Horários</CardTitle>
                <CardDescription>
                  Configure os horários em que a loja aceita pedidos online
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Adicionar novo horário */}
                <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <Label>Dia</Label>
                    <Select
                      value={String(newHour.weekday)}
                      onValueChange={(v) => setNewHour({ ...newHour, weekday: Number(v) })}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weekdayNames.map((name, idx) => (
                          <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Início</Label>
                    <Input
                      type="time"
                      value={newHour.start_time}
                      onChange={(e) => setNewHour({ ...newHour, start_time: e.target.value })}
                      className="w-[120px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Fim</Label>
                    <Input
                      type="time"
                      value={newHour.end_time}
                      onChange={(e) => setNewHour({ ...newHour, end_time: e.target.value })}
                      className="w-[120px]"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (newHour.start_time >= newHour.end_time) {
                        toast.error('Horário de início deve ser antes do fim');
                        return;
                      }
                      addHour.mutate({
                        weekday: newHour.weekday,
                        start_time: newHour.start_time,
                        end_time: newHour.end_time,
                        active: true,
                      });
                    }}
                    disabled={addHour.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {/* Lista de horários por dia */}
                <div className="space-y-2">
                  {weekdayNames.map((dayName, dayIdx) => {
                    const dayHours = hours.filter((h) => h.weekday === dayIdx);
                    if (dayHours.length === 0) return null;

                    return (
                      <div key={dayIdx} className="flex items-center gap-4 p-3 border rounded-lg">
                        <span className="w-24 font-medium">{dayName}</span>
                        <div className="flex-1 flex flex-wrap gap-2">
                          {dayHours.map((hour) => (
                            <div
                              key={hour.id}
                              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                                hour.active 
                                  ? 'bg-primary/10 text-primary' 
                                  : 'bg-muted text-muted-foreground line-through'
                              }`}
                            >
                              <span>{hour.start_time} - {hour.end_time}</span>
                              <Switch
                                checked={hour.active}
                                onCheckedChange={(v) => updateHour.mutate({ id: hour.id, active: v })}
                                className="scale-75"
                              />
                              <button
                                onClick={() => deleteHour.mutate(hour.id)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {hours.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum horário configurado. A loja segue o controle manual.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Visual */}
          <TabsContent value="visual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Identidade Visual</CardTitle>
                <CardDescription>Personalize as cores e layout do seu cardápio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo */}
                <div className="space-y-2">
                  <Label>Logo da Empresa</Label>
                  <div className="flex items-center gap-4">
                    {settings?.logo_url ? (
                      <img src={settings.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-lg border" />
                    ) : (
                      <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <Button variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadLogo.isPending}>
                      {uploadLogo.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      Alterar Logo
                    </Button>
                  </div>
                </div>

                {/* Cores */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Cor Primária</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="primary_color"
                        value={visualForm.primary_color}
                        onChange={(e) => setVisualForm({ ...visualForm, primary_color: e.target.value })}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={visualForm.primary_color}
                        onChange={(e) => setVisualForm({ ...visualForm, primary_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Cor Secundária</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="secondary_color"
                        value={visualForm.secondary_color}
                        onChange={(e) => setVisualForm({ ...visualForm, secondary_color: e.target.value })}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={visualForm.secondary_color}
                        onChange={(e) => setVisualForm({ ...visualForm, secondary_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="background_color">Fundo</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="background_color"
                        value={visualForm.background_color}
                        onChange={(e) => setVisualForm({ ...visualForm, background_color: e.target.value })}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={visualForm.background_color}
                        onChange={(e) => setVisualForm({ ...visualForm, background_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="text_color">Texto</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="text_color"
                        value={visualForm.text_color}
                        onChange={(e) => setVisualForm({ ...visualForm, text_color: e.target.value })}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={visualForm.text_color}
                        onChange={(e) => setVisualForm({ ...visualForm, text_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Layout */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Layout de Categorias</Label>
                    <Select
                      value={visualForm.public_menu_category_layout}
                      onValueChange={(v) => setVisualForm({ ...visualForm, public_menu_category_layout: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accordion">Acordeão (expansível)</SelectItem>
                        <SelectItem value="tabs">Abas no topo</SelectItem>
                        <SelectItem value="list">Lista contínua</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Layout de Cards</Label>
                    <Select
                      value={visualForm.public_menu_card_layout}
                      onValueChange={(v) => setVisualForm({ ...visualForm, public_menu_card_layout: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compacto</SelectItem>
                        <SelectItem value="large">Imagem grande</SelectItem>
                        <SelectItem value="list">Lista simples</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Modo de Apresentação</Label>
                  <Select
                    value={visualForm.public_menu_mode}
                    onValueChange={(v) => setVisualForm({ ...visualForm, public_menu_mode: v })}
                  >
                    <SelectTrigger className="w-full md:w-1/2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick">Rápido (menos etapas)</SelectItem>
                      <SelectItem value="detailed">Detalhado (opcionais + observação)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSaveVisual} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Loja */}
          <TabsContent value="store" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Loja</CardTitle>
                <CardDescription>Dados que aparecem no cardápio público</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={storeForm.address}
                      onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                      placeholder="Rua, número, bairro..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={storeForm.phone}
                      onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                      placeholder="(00) 0000-0000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={storeForm.whatsapp}
                    onChange={(e) => setStoreForm({ ...storeForm, whatsapp: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="welcome_message">Mensagem de Boas-vindas</Label>
                  <Textarea
                    id="welcome_message"
                    value={storeForm.welcome_message}
                    onChange={(e) => setStoreForm({ ...storeForm, welcome_message: e.target.value })}
                    placeholder="Bem-vindo ao nosso cardápio! Faça seu pedido..."
                    rows={3}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Exibir no Cardápio</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show_address">Mostrar endereço</Label>
                      <Switch
                        id="show_address"
                        checked={storeForm.public_menu_show_address}
                        onCheckedChange={(v) => setStoreForm({ ...storeForm, public_menu_show_address: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show_phone">Mostrar telefone</Label>
                      <Switch
                        id="show_phone"
                        checked={storeForm.public_menu_show_phone}
                        onCheckedChange={(v) => setStoreForm({ ...storeForm, public_menu_show_phone: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show_hours">Mostrar horários</Label>
                      <Switch
                        id="show_hours"
                        checked={storeForm.public_menu_show_hours}
                        onCheckedChange={(v) => setStoreForm({ ...storeForm, public_menu_show_hours: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show_banner">Mostrar banner</Label>
                      <Switch
                        id="show_banner"
                        checked={storeForm.public_menu_show_banner}
                        onCheckedChange={(v) => setStoreForm({ ...storeForm, public_menu_show_banner: v })}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveStore} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Salvar Informações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Banners */}
          <TabsContent value="banners" className="space-y-6">
            {/* Banner de Capa */}
            <Card>
              <CardHeader>
                <CardTitle>Banner de Capa</CardTitle>
                <CardDescription>Imagem principal no topo do cardápio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {settings?.cover_banner_url ? (
                    <div className="relative">
                      <img
                        src={settings.cover_banner_url}
                        alt="Banner de capa"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={async () => {
                          try {
                            await updateSettings.mutateAsync({ cover_banner_url: null } as any);
                            toast.success('Banner removido!');
                          } catch {
                            toast.error('Erro ao remover banner');
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Nenhum banner de capa</p>
                    </div>
                  )}
                  <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                  <Button variant="outline" onClick={() => coverInputRef.current?.click()} disabled={uploadCoverBanner.isPending}>
                    {uploadCoverBanner.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    {settings?.cover_banner_url ? 'Alterar Banner' : 'Adicionar Banner'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Banners de Promoção */}
            <Card>
              <CardHeader>
                <CardTitle>Banners de Promoções</CardTitle>
                <CardDescription>Carousel de promoções abaixo da capa</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {promotionBanners.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {promotionBanners.map((banner: any) => (
                        <div key={banner.id} className="relative group">
                          <img
                            src={banner.image_url}
                            alt={banner.title || 'Banner'}
                            className={`w-full h-32 object-cover rounded-lg ${!banner.active ? 'opacity-50' : ''}`}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateBanner.mutateAsync({ id: banner.id, active: !banner.active })}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm('Excluir banner?')) deleteBanner.mutate(banner.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {banner.source === 'ai' && !banner.approved_at && (
                            <Badge className="absolute top-2 left-2" variant="secondary">IA</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Nenhum banner de promoção</p>
                    </div>
                  )}
                  <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                  <Button variant="outline" onClick={() => bannerInputRef.current?.click()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Banner
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Toggle IA */}
            <Card>
              <CardHeader>
                <CardTitle>Banners Gerados por IA</CardTitle>
                <CardDescription>Permitir sugestões automáticas de banners</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sugestões de IA</p>
                    <p className="text-sm text-muted-foreground">Banners sugeridos precisam de aprovação manual</p>
                  </div>
                  <Switch
                    checked={settings?.ai_banners_enabled || false}
                    onCheckedChange={async (v) => {
                      try {
                        await updateSettings.mutateAsync({ ai_banners_enabled: v } as any);
                        toast.success(v ? 'IA habilitada' : 'IA desabilitada');
                      } catch {
                        toast.error('Erro ao atualizar configuração');
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
