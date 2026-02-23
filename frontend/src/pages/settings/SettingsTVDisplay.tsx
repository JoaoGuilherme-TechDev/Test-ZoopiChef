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
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { ArrowLeft, Palette, Tv, Upload, X, Check, Image, Clock, CloudSun, Volume2, Play, RotateCcw, Music } from 'lucide-react';
import { useTVDisplaySettings, useUpsertTVDisplaySettings, TV_COLOR_PALETTES, TV_SOUND_PRESETS, type SoundType } from '@/hooks/useTVDisplaySettings';
import { useTVOrderReadySound } from '@/hooks/useTVOrderReadySound';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase-shim';
import { ImageSpecsCard } from '@/components/settings/ImageSpecsCard';

export default function SettingsTVDisplay() {
  const navigate = useNavigate();
  const { company } = useCompanyContext();
  const { data: settings, isLoading } = useTVDisplaySettings();
  const upsertSettings = useUpsertTVDisplaySettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const soundFileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [enabled, setEnabled] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a');
  const [accentColor, setAccentColor] = useState('#ff6b00');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [showLogo, setShowLogo] = useState(true);
  const [showClock, setShowClock] = useState(true);
  const [showWeather, setShowWeather] = useState(false);
  const [transitionStyle, setTransitionStyle] = useState<'fade' | 'slide' | 'zoom'>('fade');
  const [transitionDuration, setTransitionDuration] = useState(500);
  const [slideDuration, setSlideDuration] = useState(10);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);
  const [tickerMessage, setTickerMessage] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundType, setSoundType] = useState<SoundType>('chime');
  const [soundVolume, setSoundVolume] = useState(0.7);
  const [customSoundUrl, setCustomSoundUrl] = useState<string | null>(null);
  const [uploadingSound, setUploadingSound] = useState(false);
  const [orderReadyDuration, setOrderReadyDuration] = useState(5);
  const [soundLoop, setSoundLoop] = useState(false);

  // Sound preview hook
  const { previewSound } = useTVOrderReadySound({
    enabled: true,
    soundType,
    volume: soundVolume,
    customSoundUrl,
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setLogoUrl(settings.logo_url);
      setPrimaryColor(settings.primary_color);
      setSecondaryColor(settings.secondary_color);
      setBackgroundColor(settings.background_color);
      setAccentColor(settings.accent_color);
      setTextColor(settings.text_color);
      setFontFamily(settings.font_family);
      setShowLogo(settings.show_logo);
      setShowClock(settings.show_clock);
      setShowWeather(settings.show_weather);
      setTransitionStyle(settings.transition_style);
      setTransitionDuration(settings.transition_duration_ms);
      setSlideDuration(settings.slide_duration_seconds);
      setTickerMessage(settings.ticker_message || '');
      setSoundEnabled(settings.sound_enabled ?? true);
      setSoundType((settings.sound_type as SoundType) ?? 'chime');
      setSoundVolume(settings.sound_volume ?? 0.7);
      setCustomSoundUrl(settings.custom_sound_url);
      setOrderReadyDuration(settings.order_ready_duration_seconds ?? 5);
      setSoundLoop(settings.sound_loop ?? false);
    }
  }, [settings]);

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
      const fileName = `${company.id}/tv-logo-${Date.now()}.${fileExt}`;
      
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

  const handleRemoveLogo = () => {
    setLogoUrl(null);
  };

  const handleApplyPalette = (paletteName: string) => {
    const palette = TV_COLOR_PALETTES.find(p => p.name === paletteName);
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

  const handleUploadSound = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company?.id) return;

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'];
    if (!validTypes.includes(file.type)) {
      toast.error('Apenas arquivos MP3 ou WAV são permitidos');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máximo 5MB)');
      return;
    }

    setUploadingSound(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}/tv-sound-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tv-sounds')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tv-sounds')
        .getPublicUrl(fileName);

      setCustomSoundUrl(publicUrl);
      setSoundType('custom');
      toast.success('Som personalizado enviado!');
    } catch (error: any) {
      console.error('Error uploading sound:', error);
      const errorMessage = error?.message || error?.error_description || 'Erro desconhecido';
      toast.error(`Erro ao enviar som: ${errorMessage}`);
    } finally {
      setUploadingSound(false);
      if (soundFileInputRef.current) {
        soundFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveCustomSound = () => {
    setCustomSoundUrl(null);
    if (soundType === 'custom') {
      setSoundType('chime');
    }
  };

  const handleResetSoundDefaults = () => {
    setSoundType('chime');
    setSoundVolume(0.7);
    setCustomSoundUrl(null);
    setOrderReadyDuration(5);
    setSoundLoop(false);
    toast.success('Configurações de som restauradas!');
  };

  const handlePreviewSound = async () => {
    const success = await previewSound();
    if (!success) {
      toast.error('Não foi possível reproduzir o som. Clique na tela primeiro.');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await upsertSettings.mutateAsync({
        enabled,
        logo_url: logoUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        background_color: backgroundColor,
        accent_color: accentColor,
        text_color: textColor,
        font_family: fontFamily,
        show_logo: showLogo,
        show_clock: showClock,
        show_weather: showWeather,
        transition_style: transitionStyle,
        transition_duration_ms: transitionDuration,
        slide_duration_seconds: slideDuration,
        ticker_message: tickerMessage || null,
        sound_enabled: soundEnabled,
        sound_type: soundType,
        sound_volume: soundVolume,
        custom_sound_url: customSoundUrl,
        order_ready_duration_seconds: orderReadyDuration,
        sound_loop: soundLoop,
      });
      toast.success('Configurações salvas!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Configurações TV">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configurações TV">
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Telas de TV</h1>
            <p className="text-muted-foreground">Configure a aparência das telas de TV e totens</p>
          </div>
        </div>

        <Tabs defaultValue="branding" className="space-y-4">
          <TabsList>
            <TabsTrigger value="branding">
              <Image className="h-4 w-4 mr-2" />
              Logo & Marca
            </TabsTrigger>
            <TabsTrigger value="colors">
              <Palette className="h-4 w-4 mr-2" />
              Cores
            </TabsTrigger>
            <TabsTrigger value="display">
              <Tv className="h-4 w-4 mr-2" />
              Exibição
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>Logo e Marca</CardTitle>
                <CardDescription>Configure a logo que será exibida nas telas de TV</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ativar Customização TV</Label>
                    <p className="text-sm text-muted-foreground">Aplica cores e logo personalizados nas TVs</p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>

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
                          onClick={handleRemoveLogo}
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
                        Recomendado: PNG ou SVG com fundo transparente. Tamanho máximo: 2MB.
                      </p>
                      <div className="flex items-center gap-2">
                        <Switch checked={showLogo} onCheckedChange={setShowLogo} />
                        <Label>Exibir logo nas telas</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Família de Fonte</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter (Moderna)</SelectItem>
                      <SelectItem value="Roboto">Roboto (Clean)</SelectItem>
                      <SelectItem value="Poppins">Poppins (Friendly)</SelectItem>
                      <SelectItem value="Playfair Display">Playfair (Elegante)</SelectItem>
                      <SelectItem value="Oswald">Oswald (Bold)</SelectItem>
                      <SelectItem value="Montserrat">Montserrat (Profissional)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSaveSettings} disabled={upsertSettings.isPending}>
                  {upsertSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="colors">
            <Card>
              <CardHeader>
                <CardTitle>Paleta de Cores</CardTitle>
                <CardDescription>Escolha uma paleta predefinida ou personalize as cores</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Paletas Predefinidas */}
                <div className="space-y-3">
                  <Label>Paletas Predefinidas</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {TV_COLOR_PALETTES.map((palette) => (
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
                          <div 
                            className="w-6 h-6 rounded" 
                            style={{ backgroundColor: palette.colors.primary_color }}
                          />
                          <div 
                            className="w-6 h-6 rounded" 
                            style={{ backgroundColor: palette.colors.secondary_color }}
                          />
                          <div 
                            className="w-6 h-6 rounded" 
                            style={{ backgroundColor: palette.colors.accent_color }}
                          />
                          <div 
                            className="w-6 h-6 rounded border" 
                            style={{ backgroundColor: palette.colors.background_color }}
                          />
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
                <div className="border-t pt-6">
                  <Label className="text-lg font-medium">Cores Personalizadas</Label>
                  <p className="text-sm text-muted-foreground mb-4">Ajuste as cores manualmente</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Cor Primária</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => { setPrimaryColor(e.target.value); setSelectedPalette(null); }}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => { setPrimaryColor(e.target.value); setSelectedPalette(null); }}
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
                          onChange={(e) => { setSecondaryColor(e.target.value); setSelectedPalette(null); }}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={secondaryColor}
                          onChange={(e) => { setSecondaryColor(e.target.value); setSelectedPalette(null); }}
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
                          onChange={(e) => { setBackgroundColor(e.target.value); setSelectedPalette(null); }}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={backgroundColor}
                          onChange={(e) => { setBackgroundColor(e.target.value); setSelectedPalette(null); }}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Cor de Destaque</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={accentColor}
                          onChange={(e) => { setAccentColor(e.target.value); setSelectedPalette(null); }}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={accentColor}
                          onChange={(e) => { setAccentColor(e.target.value); setSelectedPalette(null); }}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Cor do Texto</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={textColor}
                          onChange={(e) => { setTextColor(e.target.value); setSelectedPalette(null); }}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={textColor}
                          onChange={(e) => { setTextColor(e.target.value); setSelectedPalette(null); }}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="border-t pt-6">
                  <Label className="text-lg font-medium">Preview</Label>
                  <div 
                    className="mt-4 rounded-lg p-6 min-h-[200px]"
                    style={{ backgroundColor }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      {logoUrl && showLogo ? (
                        <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
                      ) : (
                        <div 
                          className="h-10 w-24 rounded flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: primaryColor, color: secondaryColor }}
                        >
                          LOGO
                        </div>
                      )}
                      <span style={{ color: textColor }} className="text-sm">12:34</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((i) => (
                        <div 
                          key={i}
                          className="rounded-lg p-3"
                          style={{ backgroundColor: secondaryColor + '20' }}
                        >
                          <div 
                            className="h-16 rounded mb-2"
                            style={{ backgroundColor: primaryColor + '40' }}
                          />
                          <p style={{ color: textColor }} className="text-sm font-medium">Produto {i}</p>
                          <p style={{ color: accentColor }} className="text-sm font-bold">R$ 29,90</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveSettings} disabled={upsertSettings.isPending}>
                  {upsertSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="display">
            <Card>
              <CardHeader>
                <CardTitle>Opções de Exibição</CardTitle>
                <CardDescription>Configure elementos adicionais e transições</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mensagem do rodapé (ticker) */}
                <div className="space-y-2">
                  <Label>Mensagem do Rodapé (Ticker)</Label>
                  <Input
                    value={tickerMessage}
                    onChange={(e) => setTickerMessage(e.target.value)}
                    placeholder="Ex: Peça pelo WhatsApp: (11) 99999-9999 • Entregas em toda a cidade!"
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Esta mensagem será exibida em loop no rodapé da TV. Deixe em branco para usar a descrição do banner.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label>Exibir Relógio</Label>
                        <p className="text-sm text-muted-foreground">Mostra hora atual na tela</p>
                      </div>
                    </div>
                    <Switch checked={showClock} onCheckedChange={setShowClock} />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <CloudSun className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label>Exibir Clima</Label>
                        <p className="text-sm text-muted-foreground">Mostra temperatura local</p>
                      </div>
                    </div>
                    <Switch checked={showWeather} onCheckedChange={setShowWeather} />
                  </div>
                </div>

                {/* Sound Configuration Section */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Volume2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label className="text-lg font-medium">Som de Pedido Pronto</Label>
                        <p className="text-sm text-muted-foreground">Toca quando um pedido fica pronto na TV</p>
                      </div>
                    </div>
                    <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                  </div>

                  {soundEnabled && (
                    <div className="space-y-6 pl-8 border-l-2 border-muted ml-2">
                      {/* Sound Type Selection */}
                      <div className="space-y-3">
                        <Label>Tipo de Som</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {TV_SOUND_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => {
                                if (preset.id === 'custom' && !customSoundUrl) {
                                  soundFileInputRef.current?.click();
                                } else {
                                  setSoundType(preset.id as SoundType);
                                }
                              }}
                              className={`relative p-3 rounded-lg border-2 text-left transition-all ${
                                soundType === preset.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-muted hover:border-muted-foreground/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Music className="h-4 w-4" />
                                <span className="font-medium text-sm">{preset.name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{preset.description}</p>
                              {soundType === preset.id && (
                                <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Sound Upload */}
                      {soundType === 'custom' && (
                        <div className="space-y-3">
                          <Label>Som Personalizado</Label>
                          {customSoundUrl ? (
                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                              <Music className="h-5 w-5 text-primary" />
                              <span className="flex-1 text-sm truncate">
                                Arquivo de áudio carregado
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRemoveCustomSound}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              onClick={() => soundFileInputRef.current?.click()}
                              className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed cursor-pointer hover:border-primary transition-colors"
                            >
                              <Upload className="h-5 w-5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {uploadingSound ? 'Enviando...' : 'Clique para enviar MP3 ou WAV (máx 5MB)'}
                              </span>
                            </div>
                          )}
                          <input
                            ref={soundFileInputRef}
                            type="file"
                            accept="audio/mpeg,audio/wav,audio/mp3"
                            className="hidden"
                            onChange={handleUploadSound}
                            disabled={uploadingSound}
                          />
                        </div>
                      )}

                      {/* Volume Control */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Volume</Label>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(soundVolume * 100)}%
                          </span>
                        </div>
                        <Slider
                          value={[soundVolume]}
                          onValueChange={([v]) => setSoundVolume(v)}
                          min={0}
                          max={1}
                          step={0.05}
                          className="w-full"
                        />
                      </div>

                      {/* Order Ready Duration */}
                      <div className="space-y-3">
                        <Label>Duração do Aviso na Tela</Label>
                        <Select value={String(orderReadyDuration)} onValueChange={(v) => setOrderReadyDuration(Number(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 segundos</SelectItem>
                            <SelectItem value="10">10 segundos</SelectItem>
                            <SelectItem value="15">15 segundos</SelectItem>
                            <SelectItem value="30">30 segundos</SelectItem>
                            <SelectItem value="0">Infinito (até fechar manualmente)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Tempo que o aviso de pedido pronto fica na tela
                        </p>
                      </div>

                      {/* Sound Loop Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Repetir Som</Label>
                          <p className="text-xs text-muted-foreground">
                            Som toca em loop até o aviso fechar
                          </p>
                        </div>
                        <Switch checked={soundLoop} onCheckedChange={setSoundLoop} />
                      </div>

                      {/* Preview and Reset */}
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviewSound}
                          className="gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Testar Som
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleResetSoundDefaults}
                          className="gap-2 text-muted-foreground"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restaurar Padrão
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-6">
                  <Label className="text-lg font-medium mb-4 block">Transições</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Estilo de Transição</Label>
                      <Select value={transitionStyle} onValueChange={(v) => setTransitionStyle(v as typeof transitionStyle)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fade">Fade (Suave)</SelectItem>
                          <SelectItem value="slide">Slide (Deslizar)</SelectItem>
                          <SelectItem value="zoom">Zoom (Aproximar)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Duração da Transição (ms)</Label>
                      <Input
                        type="number"
                        value={transitionDuration}
                        onChange={(e) => setTransitionDuration(Number(e.target.value))}
                        min={100}
                        max={2000}
                        step={100}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tempo por Slide (segundos)</Label>
                      <Input
                        type="number"
                        value={slideDuration}
                        onChange={(e) => setSlideDuration(Number(e.target.value))}
                        min={3}
                        max={60}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveSettings} disabled={upsertSettings.isPending}>
                  {upsertSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Image Specs Card */}
        <ImageSpecsCard />
      </div>
    </DashboardLayout>
  );
}
