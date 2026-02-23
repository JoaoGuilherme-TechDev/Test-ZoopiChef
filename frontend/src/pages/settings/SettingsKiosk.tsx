/**
 * SettingsKiosk - Configurações do Totem de Autoatendimento
 * 
 * Gerencia dispositivos kiosk, configurações de UI, métodos de pagamento, etc.
 */

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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Edit, Monitor, ExternalLink, Copy, Link, Loader2, QrCode, Image, Upload, X, Palette, Check } from 'lucide-react';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase-shim';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrintSectors } from '@/hooks/usePrintSectors';
import { useKioskSettings, useUpsertKioskSettings, KIOSK_COLOR_PALETTES } from '@/hooks/useKioskSettings';
import { ImageSpecsCard } from '@/components/settings/ImageSpecsCard';

interface KioskDevice {
  id: string;
  company_id: string;
  device_code: string;
  name: string;
  is_active: boolean;
  orientation: 'portrait' | 'landscape';
  idle_timeout_seconds: number;
  idle_playlist: unknown;
  ui_config: unknown;
  require_dine_mode: boolean;
  require_customer_info: boolean;
  enabled_payment_methods: string[];
  print_customer_receipt: boolean;
  print_sector_ids: string[] | null;
  default_printer: string | null;
  customer_printer_host: string | null;
  customer_printer_port: number | null;
  upsell_enabled: boolean;
  upsell_max_offers: number;
  access_token: string;
  created_at: string;
  updated_at: string;
}

const PAYMENT_METHODS = [
  { id: 'pix', label: 'PIX' },
  { id: 'card', label: 'Cartão (Crédito/Débito)' },
  { id: 'cashier_qr', label: 'Pagar no Caixa' },
];

export default function SettingsKiosk() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();
  const { sectors = [] } = usePrintSectors();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Branding settings
  const { data: brandingSettings, isLoading: brandingLoading } = useKioskSettings();
  const upsertBranding = useUpsertKioskSettings();
  
  // Branding form states
  const [brandingEnabled, setBrandingEnabled] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a');
  const [accentColor, setAccentColor] = useState('#ff6b00');
  const [textColor, setTextColor] = useState('#ffffff');
  const [buttonRadius, setButtonRadius] = useState<'rounded' | 'pill' | 'square'>('rounded');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [menuHierarchy, setMenuHierarchy] = useState<'category_subcategory_products' | 'subcategory_products' | 'products_only'>('category_subcategory_products');
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Load branding settings
  useEffect(() => {
    if (brandingSettings) {
      setBrandingEnabled(brandingSettings.enabled);
      setLogoUrl(brandingSettings.logo_url);
      setPrimaryColor(brandingSettings.primary_color);
      setSecondaryColor(brandingSettings.secondary_color);
      setBackgroundColor(brandingSettings.background_color);
      setAccentColor(brandingSettings.accent_color);
      setTextColor(brandingSettings.text_color);
      setButtonRadius(brandingSettings.button_radius);
      setFontFamily(brandingSettings.font_family);
      setMenuHierarchy(brandingSettings.menu_hierarchy || 'category_subcategory_products');
    }
  }, [brandingSettings]);

  // Fetch devices
  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['kiosk_devices', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('kiosk_devices')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      if (error) throw error;
      return data as KioskDevice[];
    },
    enabled: !!company?.id,
  });

  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState<KioskDevice | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDeviceCode, setFormDeviceCode] = useState('');
  const [formOrientation, setFormOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [formIdleTimeout, setFormIdleTimeout] = useState(60);
  const [formRequireDineMode, setFormRequireDineMode] = useState(true);
  const [formRequireCustomerInfo, setFormRequireCustomerInfo] = useState(false);
  const [formPaymentMethods, setFormPaymentMethods] = useState<string[]>(['pix', 'card']);
  const [formPrintReceipt, setFormPrintReceipt] = useState(true);
  const [formPrintSectorIds, setFormPrintSectorIds] = useState<string[]>([]);
  const [formCustomerPrinterHost, setFormCustomerPrinterHost] = useState('');
  const [formCustomerPrinterPort, setFormCustomerPrinterPort] = useState(9100);
  const [formUpsellEnabled, setFormUpsellEnabled] = useState(true);
  const [formUpsellMax, setFormUpsellMax] = useState(2);
  
  // Promo/Banner form states
  const [formHeaderPromoEnabled, setFormHeaderPromoEnabled] = useState(false);
  const [formHeaderPromoHeight, setFormHeaderPromoHeight] = useState(120);
  const [formHeaderPromoInterval, setFormHeaderPromoInterval] = useState(5);
  const [formHeaderPromoBanners, setFormHeaderPromoBanners] = useState<Array<{
    id: string;
    image_url: string;
    title?: string;
    subtitle?: string;
    type: 'image' | 'video';
  }>>([]);
  const [formUpsellTypes, setFormUpsellTypes] = useState<string[]>(['combo', 'acompanhamento', 'bebida']);
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerSubtitle, setNewBannerSubtitle] = useState('');
  
  // Idle screen images (attract screen) - stored in idle_playlist
  const [formIdleImages, setFormIdleImages] = useState<Array<{
    type: 'image' | 'video';
    url: string;
    seconds: number;
  }>>([]);
  const [formIdleImageSeconds, setFormIdleImageSeconds] = useState(8);
  const [uploadingIdleImage, setUploadingIdleImage] = useState(false);
  const idleImageInputRef = useRef<HTMLInputElement>(null);

  // Reset form
  const resetForm = () => {
    setFormName('');
    setFormDeviceCode('');
    setFormOrientation('portrait');
    setFormIdleTimeout(60);
    setFormRequireDineMode(true);
    setFormRequireCustomerInfo(false);
    setFormPaymentMethods(['pix', 'card']);
    setFormPrintReceipt(true);
    setFormPrintSectorIds([]);
    setFormCustomerPrinterHost('');
    setFormCustomerPrinterPort(9100);
    setFormUpsellEnabled(true);
    setFormUpsellMax(2);
    setFormHeaderPromoEnabled(false);
    setFormHeaderPromoHeight(120);
    setFormHeaderPromoInterval(5);
    setFormHeaderPromoBanners([]);
    setFormUpsellTypes(['combo', 'acompanhamento', 'bebida']);
    setNewBannerUrl('');
    setNewBannerTitle('');
    setNewBannerSubtitle('');
    setFormIdleImages([]);
    setFormIdleImageSeconds(8);
    setEditingDevice(null);
  };

  // Load device into form
  const loadDevice = (device: KioskDevice) => {
    setFormName(device.name);
    setFormDeviceCode(device.device_code);
    setFormOrientation(device.orientation);
    setFormIdleTimeout(device.idle_timeout_seconds);
    setFormRequireDineMode(device.require_dine_mode);
    setFormRequireCustomerInfo(device.require_customer_info);
    setFormPaymentMethods(device.enabled_payment_methods || ['pix', 'card']);
    setFormPrintReceipt(device.print_customer_receipt);
    setFormPrintSectorIds(device.print_sector_ids || []);
    setFormCustomerPrinterHost(device.customer_printer_host || '');
    setFormCustomerPrinterPort(device.customer_printer_port || 9100);
    setFormUpsellEnabled(device.upsell_enabled);
    setFormUpsellMax(device.upsell_max_offers);
    
    // Load idle_playlist (attract screen images)
    const playlist = device.idle_playlist as Array<{ type: 'image' | 'video'; url: string; seconds: number }> | null;
    setFormIdleImages(playlist || []);
    
    // Load ui_config promo settings
    const uiConfig = device.ui_config as {
      headerPromoEnabled?: boolean;
      headerPromoHeight?: number;
      headerPromoInterval?: number;
      headerPromoBanners?: Array<{ id: string; image_url: string; title?: string; subtitle?: string; type: 'image' | 'video' }>;
      upsellTypes?: string[];
    } | null;
    
    setFormHeaderPromoEnabled(uiConfig?.headerPromoEnabled || false);
    setFormHeaderPromoHeight(uiConfig?.headerPromoHeight || 120);
    setFormHeaderPromoInterval(uiConfig?.headerPromoInterval || 5);
    setFormHeaderPromoBanners(uiConfig?.headerPromoBanners || []);
    setFormUpsellTypes(uiConfig?.upsellTypes || ['combo', 'acompanhamento', 'bebida']);
    
    setEditingDevice(device);
    setShowDialog(true);
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      device_code: string;
      name: string;
      orientation: string;
      idle_timeout_seconds: number;
      require_dine_mode: boolean;
      require_customer_info: boolean;
      enabled_payment_methods: string[];
      print_customer_receipt: boolean;
      print_sector_ids: string[] | null;
      upsell_enabled: boolean;
      upsell_max_offers: number;
    }) => {
      const { error } = await supabase
        .from('kiosk_devices')
        .insert([{ ...data, company_id: company?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk_devices'] });
      toast.success('Totem criado com sucesso!');
      setShowDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar totem: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: {
      device_code?: string;
      name?: string;
      orientation?: string;
      idle_timeout_seconds?: number;
      require_dine_mode?: boolean;
      require_customer_info?: boolean;
      enabled_payment_methods?: string[];
      print_customer_receipt?: boolean;
      print_sector_ids?: string[] | null;
      upsell_enabled?: boolean;
      upsell_max_offers?: number;
    }}) => {
      const { error } = await supabase
        .from('kiosk_devices')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk_devices'] });
      toast.success('Totem atualizado!');
      setShowDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kiosk_devices')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk_devices'] });
      toast.success('Totem removido!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('kiosk_devices')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk_devices'] });
    },
  });

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formDeviceCode.trim()) {
      toast.error('Código do dispositivo é obrigatório');
      return;
    }

    // Build ui_config with promo settings
    const ui_config = {
      headerPromoEnabled: formHeaderPromoEnabled,
      headerPromoHeight: formHeaderPromoHeight,
      headerPromoInterval: formHeaderPromoInterval,
      headerPromoBanners: formHeaderPromoBanners,
      upsellTypes: formUpsellTypes,
    };

    const data = {
      name: formName,
      device_code: formDeviceCode,
      orientation: formOrientation,
      idle_timeout_seconds: formIdleTimeout,
      idle_playlist: formIdleImages, // Attract screen images
      require_dine_mode: formRequireDineMode,
      require_customer_info: formRequireCustomerInfo,
      enabled_payment_methods: formPaymentMethods,
      print_customer_receipt: formPrintReceipt,
      print_sector_ids: formPrintSectorIds.length > 0 ? formPrintSectorIds : null,
      customer_printer_host: formCustomerPrinterHost || null,
      customer_printer_port: formCustomerPrinterPort || null,
      upsell_enabled: formUpsellEnabled,
      upsell_max_offers: formUpsellMax,
      ui_config,
    };

    if (editingDevice) {
      updateMutation.mutate({ id: editingDevice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Add banner to list
  const handleAddBanner = () => {
    if (!newBannerUrl.trim()) {
      toast.error('URL da imagem é obrigatória');
      return;
    }
    
    const isVideo = newBannerUrl.match(/\.(mp4|webm|mov)$/i);
    const newBanner = {
      id: crypto.randomUUID(),
      image_url: newBannerUrl,
      title: newBannerTitle || undefined,
      subtitle: newBannerSubtitle || undefined,
      type: isVideo ? 'video' as const : 'image' as const,
    };
    
    setFormHeaderPromoBanners([...formHeaderPromoBanners, newBanner]);
    setNewBannerUrl('');
    setNewBannerTitle('');
    setNewBannerSubtitle('');
    toast.success('Banner adicionado!');
  };

  // Remove banner from list
  const handleRemoveBanner = (id: string) => {
    setFormHeaderPromoBanners(formHeaderPromoBanners.filter(b => b.id !== id));
  };

  // Upload idle image (attract screen)
  const handleUploadIdleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company?.id) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Apenas imagens ou vídeos são permitidos');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máximo 10MB)');
      return;
    }

    setUploadingIdleImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}/kiosk-idle-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      const isVideo = file.type.startsWith('video/');
      setFormIdleImages(prev => [...prev, {
        type: isVideo ? 'video' : 'image',
        url: publicUrl,
        seconds: formIdleImageSeconds,
      }]);
      toast.success('Mídia adicionada!');
    } catch (error) {
      console.error('Error uploading idle image:', error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploadingIdleImage(false);
      if (idleImageInputRef.current) {
        idleImageInputRef.current.value = '';
      }
    }
  };

  // Remove idle image
  const handleRemoveIdleImage = (index: number) => {
    setFormIdleImages(prev => prev.filter((_, i) => i !== index));
  };

  // Branding handlers
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company?.id) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande (máximo 2MB)');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}/kiosk-logo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      toast.success('Logo enviada!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyPalette = (paletteName: string) => {
    const palette = KIOSK_COLOR_PALETTES.find(p => p.name === paletteName);
    if (palette) {
      setPrimaryColor(palette.colors.primary_color);
      setSecondaryColor(palette.colors.secondary_color);
      setBackgroundColor(palette.colors.background_color);
      setAccentColor(palette.colors.accent_color);
      setTextColor(palette.colors.text_color);
      setSelectedPalette(paletteName);
      toast.success(`Paleta "${paletteName}" aplicada!`);
    }
  };

  const handleSaveBranding = async () => {
    try {
      await upsertBranding.mutateAsync({
        enabled: brandingEnabled,
        logo_url: logoUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        background_color: backgroundColor,
        accent_color: accentColor,
        text_color: textColor,
        button_radius: buttonRadius,
        font_family: fontFamily,
        menu_hierarchy: menuHierarchy,
      });
      toast.success('Branding salvo!');
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error('Erro ao salvar branding');
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/kiosk/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const openKiosk = (token: string) => {
    window.open(`/kiosk/${token}`, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Totem de Autoatendimento</h1>
            <p className="text-muted-foreground">Configure seus totens de autoatendimento</p>
          </div>
        </div>

        {/* Devices List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Dispositivos Totem</CardTitle>
              <CardDescription>Gerencie seus totens de autoatendimento</CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Totem
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum totem configurado</p>
                <p className="text-sm">Clique em "Novo Totem" para começar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Orientação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{device.device_code}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {device.orientation === 'portrait' ? 'Retrato' : 'Paisagem'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={device.is_active}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: device.id, isActive: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyLink(device.access_token)}
                            title="Copiar link"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openKiosk(device.access_token)}
                            title="Abrir totem"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => loadDevice(device)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('Remover este totem?')) {
                                deleteMutation.mutate(device.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <QrCode className="w-8 h-8 text-blue-500 shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Como funciona</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Crie um dispositivo para cada totem físico</li>
                  <li>• Configure as opções de pagamento e impressão</li>
                  <li>• Copie o link e abra no navegador do totem em modo tela cheia</li>
                  <li>• Para exibir produtos no totem, ative a opção "Aparece no Totem" em cada produto</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Identidade Visual do Totem
            </CardTitle>
            <CardDescription>
              Personalize cores, logo e estilo dos seus totens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Ativar Branding Personalizado</Label>
                <p className="text-sm text-muted-foreground">Aplica cores e logo personalizados nos totens</p>
              </div>
              <Switch checked={brandingEnabled} onCheckedChange={setBrandingEnabled} />
            </div>

            {brandingEnabled && (
              <>
                {/* Logo upload */}
                <div className="space-y-4">
                  <Label>Logo da Empresa</Label>
                  <div className="flex items-start gap-4">
                    {logoUrl ? (
                      <div className="relative">
                        <div 
                          className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden"
                          style={{ backgroundColor }}
                        >
                          <img 
                            src={logoUrl} 
                            alt="Logo" 
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => setLogoUrl(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="text-center text-muted-foreground">
                          <Upload className="h-8 w-8 mx-auto mb-2" />
                          <span className="text-xs">Enviar Logo</span>
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadLogo}
                      disabled={uploadingLogo}
                    />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Recomendado: PNG ou SVG com fundo transparente. Tamanho: 400×200px, máx 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Paletas Predefinidas */}
                <div className="space-y-3">
                  <Label>Paletas Predefinidas</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {KIOSK_COLOR_PALETTES.map((palette) => (
                      <button
                        key={palette.name}
                        onClick={() => handleApplyPalette(palette.name)}
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          selectedPalette === palette.name
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-muted hover:border-muted-foreground/50'
                        }`}
                      >
                        <div className="flex gap-1 mb-2">
                          <div className="w-5 h-5 rounded" style={{ backgroundColor: palette.colors.primary_color }} />
                          <div className="w-5 h-5 rounded" style={{ backgroundColor: palette.colors.secondary_color }} />
                          <div className="w-5 h-5 rounded" style={{ backgroundColor: palette.colors.accent_color }} />
                          <div className="w-5 h-5 rounded border" style={{ backgroundColor: palette.colors.background_color }} />
                        </div>
                        <p className="text-xs font-medium truncate">{palette.name}</p>
                        {selectedPalette === palette.name && (
                          <Check className="absolute top-1 right-1 h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cores Personalizadas */}
                <div className="border-t pt-4">
                  <Label className="text-base font-medium">Cores Personalizadas</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Cor Primária</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); setSelectedPalette(null); }} className="w-12 h-10 p-1" />
                        <Input value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); setSelectedPalette(null); }} className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cor Secundária</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={secondaryColor} onChange={(e) => { setSecondaryColor(e.target.value); setSelectedPalette(null); }} className="w-12 h-10 p-1" />
                        <Input value={secondaryColor} onChange={(e) => { setSecondaryColor(e.target.value); setSelectedPalette(null); }} className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cor de Fundo</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={backgroundColor} onChange={(e) => { setBackgroundColor(e.target.value); setSelectedPalette(null); }} className="w-12 h-10 p-1" />
                        <Input value={backgroundColor} onChange={(e) => { setBackgroundColor(e.target.value); setSelectedPalette(null); }} className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cor de Destaque</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={accentColor} onChange={(e) => { setAccentColor(e.target.value); setSelectedPalette(null); }} className="w-12 h-10 p-1" />
                        <Input value={accentColor} onChange={(e) => { setAccentColor(e.target.value); setSelectedPalette(null); }} className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cor do Texto</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={textColor} onChange={(e) => { setTextColor(e.target.value); setSelectedPalette(null); }} className="w-12 h-10 p-1" />
                        <Input value={textColor} onChange={(e) => { setTextColor(e.target.value); setSelectedPalette(null); }} className="flex-1" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estilo, Fonte e Hierarquia */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Estilo dos Botões</Label>
                    <Select value={buttonRadius} onValueChange={(v) => setButtonRadius(v as 'rounded' | 'pill' | 'square')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rounded">Arredondado</SelectItem>
                        <SelectItem value="pill">Pill (muito arredondado)</SelectItem>
                        <SelectItem value="square">Quadrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fonte</Label>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter (Moderna)</SelectItem>
                        <SelectItem value="Roboto">Roboto (Clean)</SelectItem>
                        <SelectItem value="Poppins">Poppins (Friendly)</SelectItem>
                        <SelectItem value="Montserrat">Montserrat (Profissional)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label>Hierarquia do Menu</Label>
                    <Select value={menuHierarchy} onValueChange={(v) => setMenuHierarchy(v as 'category_subcategory_products' | 'subcategory_products' | 'products_only')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="category_subcategory_products">Categoria → Subcategoria → Produtos</SelectItem>
                        <SelectItem value="subcategory_products">Subcategoria → Produtos</SelectItem>
                        <SelectItem value="products_only">Apenas Produtos</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Define como o menu é organizado no totem</p>
                  </div>
                </div>


                {/* Preview */}
                <div className="border-t pt-4">
                  <Label className="text-base font-medium mb-3 block">Preview</Label>
                  <div 
                    className="p-6 rounded-lg"
                    style={{ backgroundColor, color: textColor }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 object-contain" />}
                      <span className="text-sm opacity-70">Meu Restaurante</span>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        className={`px-4 py-2 text-sm font-medium ${
                          buttonRadius === 'pill' ? 'rounded-full' : buttonRadius === 'square' ? 'rounded-none' : 'rounded-lg'
                        }`}
                        style={{ backgroundColor: primaryColor, color: secondaryColor }}
                      >
                        Botão Primário
                      </button>
                      <button 
                        className={`px-4 py-2 text-sm font-medium ${
                          buttonRadius === 'pill' ? 'rounded-full' : buttonRadius === 'square' ? 'rounded-none' : 'rounded-lg'
                        }`}
                        style={{ backgroundColor: accentColor, color: '#fff' }}
                      >
                        Botão Destaque
                      </button>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveBranding} disabled={upsertBranding.isPending} className="w-full">
                  {upsertBranding.isPending ? 'Salvando...' : 'Salvar Branding'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Image Specs Card */}
        <ImageSpecsCard />
      </div>

      {/* Device Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDevice ? 'Editar Totem' : 'Novo Totem'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="idle">Descanso</TabsTrigger>
              <TabsTrigger value="promos">Promoções</TabsTrigger>
              <TabsTrigger value="payment">Pagamento</TabsTrigger>
              <TabsTrigger value="printing">Impressão</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Totem *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Totem Entrada"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código do Dispositivo *</Label>
                  <Input
                    value={formDeviceCode}
                    onChange={(e) => setFormDeviceCode(e.target.value.toUpperCase())}
                    placeholder="Ex: TOTEM01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Orientação da Tela</Label>
                  <Select value={formOrientation} onValueChange={(v) => setFormOrientation(v as 'portrait' | 'landscape')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Retrato (Vertical)</SelectItem>
                      <SelectItem value="landscape">Paisagem (Horizontal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tempo de Inatividade (segundos)</Label>
                  <Input
                    type="number"
                    value={formIdleTimeout}
                    onChange={(e) => setFormIdleTimeout(parseInt(e.target.value) || 60)}
                    min={10}
                    max={300}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Perguntar Local/Viagem</Label>
                    <p className="text-xs text-muted-foreground">Perguntar se é "Comer Aqui" ou "Para Levar"</p>
                  </div>
                  <Switch checked={formRequireDineMode} onCheckedChange={setFormRequireDineMode} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Coletar Dados do Cliente</Label>
                    <p className="text-xs text-muted-foreground">Pedir nome e telefone do cliente</p>
                  </div>
                  <Switch checked={formRequireCustomerInfo} onCheckedChange={setFormRequireCustomerInfo} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sugestões de Venda (Upsell)</Label>
                    <p className="text-xs text-muted-foreground">Sugerir produtos adicionais no carrinho</p>
                  </div>
                  <Switch checked={formUpsellEnabled} onCheckedChange={setFormUpsellEnabled} />
                </div>

                {formUpsellEnabled && (
                  <div className="space-y-4 pl-4 p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label>Máximo de sugestões por pedido</Label>
                      <Input
                        type="number"
                        value={formUpsellMax}
                        onChange={(e) => setFormUpsellMax(parseInt(e.target.value) || 2)}
                        min={1}
                        max={5}
                        className="w-24"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tipos de Sugestões</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Selecione os tipos de produtos a sugerir
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'combo', label: '🍔 Combos' },
                          { id: 'acompanhamento', label: '🍟 Acompanhamentos' },
                          { id: 'bebida', label: '🥤 Bebidas' },
                          { id: 'sobremesa', label: '🍰 Sobremesas' },
                        ].map((type) => (
                          <div key={type.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`upsell-${type.id}`}
                              checked={formUpsellTypes.includes(type.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormUpsellTypes([...formUpsellTypes, type.id]);
                                } else {
                                  setFormUpsellTypes(formUpsellTypes.filter((t) => t !== type.id));
                                }
                              }}
                            />
                            <Label htmlFor={`upsell-${type.id}`} className="cursor-pointer text-sm">
                              {type.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tela de Descanso Tab */}
            <TabsContent value="idle" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Imagens/Vídeos da Tela de Descanso</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Adicione mídias que serão exibidas quando o totem estiver ocioso. 
                    Sem limite de imagens. Cada mídia será exibida pelo tempo configurado.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tempo de exibição (segundos)</Label>
                  <Input
                    type="number"
                    value={formIdleImageSeconds}
                    onChange={(e) => setFormIdleImageSeconds(parseInt(e.target.value) || 8)}
                    min={3}
                    max={60}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">Tempo que cada imagem ficará na tela</p>
                </div>

                {/* Current images list */}
                {formIdleImages.length > 0 && (
                  <div className="space-y-2">
                    <Label>Mídias configuradas ({formIdleImages.length})</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {formIdleImages.map((item, index) => (
                        <div key={index} className="relative rounded-lg overflow-hidden border group">
                          {item.type === 'video' ? (
                            <video 
                              src={item.url} 
                              className="w-full aspect-video object-cover"
                              muted
                            />
                          ) : (
                            <img 
                              src={item.url} 
                              alt={`Idle ${index + 1}`}
                              className="w-full aspect-video object-cover"
                            />
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 flex items-center justify-between">
                            <span className="text-xs text-white">
                              {item.seconds}s • {item.type === 'video' ? '🎬' : '🖼️'}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-white hover:text-destructive hover:bg-transparent"
                              onClick={() => handleRemoveIdleImage(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload button */}
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    ref={idleImageInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleUploadIdleImage}
                    disabled={uploadingIdleImage}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      {uploadingIdleImage ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Upload className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Adicionar Mídia</p>
                      <p className="text-sm text-muted-foreground">Imagem ou vídeo (máx 10MB)</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => idleImageInputRef.current?.click()}
                      disabled={uploadingIdleImage}
                    >
                      <Image className="h-4 w-4 mr-2" />
                      Escolher Arquivo
                    </Button>
                  </div>
                </div>

                {formIdleImages.length === 0 && (
                  <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                    <p>Nenhuma mídia configurada.</p>
                    <p>Uma imagem padrão será usada na tela de descanso.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Promoções Tab */}
            <TabsContent value="promos" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Header de Promoções</Label>
                  <p className="text-xs text-muted-foreground">Exibir carrossel de promoções no topo da tela</p>
                </div>
                <Switch checked={formHeaderPromoEnabled} onCheckedChange={setFormHeaderPromoEnabled} />
              </div>

              {formHeaderPromoEnabled && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Altura do Banner (px)</Label>
                      <Input
                        type="number"
                        value={formHeaderPromoHeight}
                        onChange={(e) => setFormHeaderPromoHeight(parseInt(e.target.value) || 120)}
                        min={80}
                        max={300}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Intervalo (segundos)</Label>
                      <Input
                        type="number"
                        value={formHeaderPromoInterval}
                        onChange={(e) => setFormHeaderPromoInterval(parseInt(e.target.value) || 5)}
                        min={2}
                        max={30}
                      />
                    </div>
                  </div>

                  {/* Banner list */}
                  <div className="space-y-2">
                    <Label>Banners de Promoção</Label>
                    <p className="text-xs text-muted-foreground">
                      Adicione imagens ou vídeos que serão exibidos no carrossel
                    </p>
                    
                    {formHeaderPromoBanners.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {formHeaderPromoBanners.map((banner, index) => (
                          <div key={banner.id} className="flex items-center gap-2 p-2 bg-background rounded border">
                            <div className="w-20 h-12 rounded overflow-hidden bg-muted shrink-0">
                              {banner.type === 'video' ? (
                                <video src={banner.image_url} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {banner.title || `Banner ${index + 1}`}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {banner.subtitle || banner.image_url}
                              </p>
                            </div>
                            <Badge variant="outline" className="shrink-0">
                              {banner.type === 'video' ? '🎬' : '🖼️'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveBanner(banner.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new banner */}
                    <div className="space-y-2 p-3 border border-dashed rounded-lg mt-4">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Image className="w-4 h-4" /> Adicionar Banner
                      </p>
                      <div className="space-y-2">
                        <Input
                          value={newBannerUrl}
                          onChange={(e) => setNewBannerUrl(e.target.value)}
                          placeholder="URL da imagem ou vídeo (ex: https://...)"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={newBannerTitle}
                            onChange={(e) => setNewBannerTitle(e.target.value)}
                            placeholder="Título (opcional)"
                          />
                          <Input
                            value={newBannerSubtitle}
                            onChange={(e) => setNewBannerSubtitle(e.target.value)}
                            placeholder="Subtítulo (opcional)"
                          />
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleAddBanner}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Banner
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="payment" className="space-y-4 mt-4">
              <div className="space-y-4">
                <Label>Métodos de Pagamento Aceitos</Label>
                {PAYMENT_METHODS.map((method) => (
                  <div key={method.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={method.id}
                      checked={formPaymentMethods.includes(method.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormPaymentMethods([...formPaymentMethods, method.id]);
                        } else {
                          setFormPaymentMethods(formPaymentMethods.filter((m) => m !== method.id));
                        }
                      }}
                    />
                    <Label htmlFor={method.id} className="cursor-pointer">{method.label}</Label>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="printing" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Imprimir Comprovante do Cliente</Label>
                  <p className="text-xs text-muted-foreground">Imprimir ticket para o cliente levar</p>
                </div>
                <Switch checked={formPrintReceipt} onCheckedChange={setFormPrintReceipt} />
              </div>

              {/* Customer Receipt Printer Config */}
              {formPrintReceipt && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <Label className="text-base font-semibold">Impressora do Comprovante do Cliente</Label>
                  <p className="text-xs text-muted-foreground">
                    Configure a impressora térmica para imprimir o ticket do cliente no totem
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>IP da Impressora</Label>
                      <Input
                        value={formCustomerPrinterHost}
                        onChange={(e) => setFormCustomerPrinterHost(e.target.value)}
                        placeholder="Ex: 192.168.1.100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Porta</Label>
                      <Input
                        type="number"
                        value={formCustomerPrinterPort}
                        onChange={(e) => setFormCustomerPrinterPort(parseInt(e.target.value) || 9100)}
                        placeholder="9100"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Setores de Impressão (Produção)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecione os setores que receberão os pedidos do totem
                </p>
                {sectors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum setor configurado. Configure em Configurações → Impressão.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sectors.map((sector) => (
                      <div key={sector.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sector-${sector.id}`}
                          checked={formPrintSectorIds.includes(sector.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormPrintSectorIds([...formPrintSectorIds, sector.id]);
                            } else {
                              setFormPrintSectorIds(formPrintSectorIds.filter((id) => id !== sector.id));
                            }
                          }}
                        />
                        <Label htmlFor={`sector-${sector.id}`} className="cursor-pointer">
                          {sector.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingDevice ? 'Salvar' : 'Criar Totem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
