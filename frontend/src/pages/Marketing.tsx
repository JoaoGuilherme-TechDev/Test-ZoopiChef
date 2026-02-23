import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, ExternalLink, AlertTriangle, Facebook, Instagram, BarChart3, Code } from 'lucide-react';
import { useMarketingSettings, useSaveMarketingSettings } from '@/hooks/useMarketingSettings';

export default function Marketing() {
  const { data: settings, isLoading } = useMarketingSettings();
  const saveSettings = useSaveMarketingSettings();

  // Form state
  const [metaPixelId, setMetaPixelId] = useState('');
  const [ga4MeasurementId, setGa4MeasurementId] = useState('');
  const [gtmContainerId, setGtmContainerId] = useState('');
  const [enableMetaPixel, setEnableMetaPixel] = useState(false);
  const [enableGa4, setEnableGa4] = useState(false);
  const [enableGtm, setEnableGtm] = useState(false);
  const [enableOnPublicPagesOnly, setEnableOnPublicPagesOnly] = useState(true);
  const [enableDebug, setEnableDebug] = useState(false);
  const [facebookPageUrl, setFacebookPageUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      setMetaPixelId(settings.meta_pixel_id || '');
      setGa4MeasurementId(settings.ga4_measurement_id || '');
      setGtmContainerId(settings.gtm_container_id || '');
      setEnableMetaPixel(settings.enable_meta_pixel);
      setEnableGa4(settings.enable_ga4);
      setEnableGtm(settings.enable_gtm);
      setEnableOnPublicPagesOnly(settings.enable_on_public_pages_only);
      setEnableDebug(settings.enable_debug);
      setFacebookPageUrl(settings.facebook_page_url || '');
      setInstagramUrl(settings.instagram_url || '');
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    saveSettings.mutate({
      meta_pixel_id: metaPixelId || null,
      ga4_measurement_id: ga4MeasurementId || null,
      gtm_container_id: gtmContainerId || null,
      enable_meta_pixel: enableMetaPixel,
      enable_ga4: enableGa4,
      enable_gtm: enableGtm,
      enable_on_public_pages_only: enableOnPublicPagesOnly,
      enable_debug: enableDebug,
      facebook_page_url: facebookPageUrl || null,
      instagram_url: instagramUrl || null,
    });
  };

  const handleTestDebug = () => {
    setEnableDebug(true);
    // Save with debug enabled, then open a public page
    saveSettings.mutate({
      meta_pixel_id: metaPixelId || null,
      ga4_measurement_id: ga4MeasurementId || null,
      gtm_container_id: gtmContainerId || null,
      enable_meta_pixel: enableMetaPixel,
      enable_ga4: enableGa4,
      enable_gtm: enableGtm,
      enable_on_public_pages_only: enableOnPublicPagesOnly,
      enable_debug: true,
      facebook_page_url: facebookPageUrl || null,
      instagram_url: instagramUrl || null,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Marketing</h1>
          <p className="text-muted-foreground mt-1">
            Configure integrações de marketing e redes sociais
          </p>
        </div>

        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <strong>LGPD:</strong> Estas integrações dependem de consentimento do usuário, se aplicável.
            Nenhum dado sensível (telefone, nome, endereço) é enviado para os pixels.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tracking Pixels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Pixels de Rastreamento
              </CardTitle>
              <CardDescription>
                Configure Meta Pixel (Facebook), Google Analytics 4 e Google Tag Manager
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Meta Pixel */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="meta-pixel" className="text-base font-medium">Meta Pixel (Facebook)</Label>
                    <p className="text-sm text-muted-foreground">Rastreamento de conversões do Facebook/Instagram Ads</p>
                  </div>
                  <Switch
                    checked={enableMetaPixel}
                    onCheckedChange={setEnableMetaPixel}
                  />
                </div>
                <Input
                  id="meta-pixel"
                  placeholder="Ex: 1234567890123456"
                  value={metaPixelId}
                  onChange={(e) => setMetaPixelId(e.target.value)}
                  disabled={!enableMetaPixel}
                />
              </div>

              <Separator />

              {/* GA4 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="ga4" className="text-base font-medium">Google Analytics 4</Label>
                    <p className="text-sm text-muted-foreground">Análise de tráfego e comportamento</p>
                  </div>
                  <Switch
                    checked={enableGa4}
                    onCheckedChange={setEnableGa4}
                  />
                </div>
                <Input
                  id="ga4"
                  placeholder="Ex: G-XXXXXXXXXX"
                  value={ga4MeasurementId}
                  onChange={(e) => setGa4MeasurementId(e.target.value)}
                  disabled={!enableGa4}
                />
              </div>

              <Separator />

              {/* GTM */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="gtm" className="text-base font-medium">Google Tag Manager</Label>
                    <p className="text-sm text-muted-foreground">Gerenciamento centralizado de tags</p>
                  </div>
                  <Switch
                    checked={enableGtm}
                    onCheckedChange={setEnableGtm}
                  />
                </div>
                <Input
                  id="gtm"
                  placeholder="Ex: GTM-XXXXXXX"
                  value={gtmContainerId}
                  onChange={(e) => setGtmContainerId(e.target.value)}
                  disabled={!enableGtm}
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Facebook className="w-5 h-5" />
                Redes Sociais
              </CardTitle>
              <CardDescription>
                Links exibidos no rodapé das páginas públicas (menu, TV)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="facebook" className="flex items-center gap-2">
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Label>
                <Input
                  id="facebook"
                  placeholder="https://facebook.com/sua-pagina"
                  value={facebookPageUrl}
                  onChange={(e) => setFacebookPageUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  placeholder="https://instagram.com/seu-perfil"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Opções Avançadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Apenas páginas públicas</Label>
                  <p className="text-sm text-muted-foreground">
                    Não carregar scripts no painel administrativo
                  </p>
                </div>
                <Switch
                  checked={enableOnPublicPagesOnly}
                  onCheckedChange={setEnableOnPublicPagesOnly}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Modo Debug</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibir logs no console do navegador
                  </p>
                </div>
                <Switch
                  checked={enableDebug}
                  onCheckedChange={setEnableDebug}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="submit" disabled={saveSettings.isPending}>
              {saveSettings.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestDebug}
              disabled={saveSettings.isPending}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Testar (Debug)
            </Button>
          </div>
        </form>

        {/* Events Info */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos Rastreados</CardTitle>
            <CardDescription>
              Estes eventos são disparados automaticamente nas páginas públicas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">PageView</p>
                <p className="text-sm text-muted-foreground">Ao abrir qualquer página pública</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">ViewContent</p>
                <p className="text-sm text-muted-foreground">Ao visualizar detalhes de um produto</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">AddToCart</p>
                <p className="text-sm text-muted-foreground">Ao adicionar item ao carrinho</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">InitiateCheckout</p>
                <p className="text-sm text-muted-foreground">Ao abrir o checkout</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">Purchase</p>
                <p className="text-sm text-muted-foreground">Ao finalizar pedido</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
