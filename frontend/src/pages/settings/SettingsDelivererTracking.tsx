import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useDelivererTrackingSettings } from '@/hooks/useDelivererTrackingSettings';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  Users, 
  Package, 
  Clock, 
  Target,
  Save,
  Loader2,
  Truck,
  Route,
  Settings2,
  Home,
  AlertTriangle,
  Shield,
  CheckCircle2,
  Link2,
  Copy,
  ExternalLink,
  Maximize2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function SettingsDelivererTracking() {
  const { settings, isLoading, updateSettings } = useDelivererTrackingSettings();
  const { company } = useCompanyContext();
  const { data: userRole } = useUserRole();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useUserRoles();
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';

  // Form state - general settings
  const [enabled, setEnabled] = useState(false);
  const [enableAutoDispatch, setEnableAutoDispatch] = useState(true);
  const [enableRegionGrouping, setEnableRegionGrouping] = useState(true);
  const [maxDeliveriesPerTrip, setMaxDeliveriesPerTrip] = useState('3');
  const [maxGroupingRadiusKm, setMaxGroupingRadiusKm] = useState('2.0');
  const [requireLocationForDelivery, setRequireLocationForDelivery] = useState(true);
  const [deliveryLocationRadiusMeters, setDeliveryLocationRadiusMeters] = useState('100');
  const [locationUpdateIntervalSeconds, setLocationUpdateIntervalSeconds] = useState('15');
  const [autoAssignToAvailable, setAutoAssignToAvailable] = useState(true);

  // Alert settings
  const [alertRouteDeviationEnabled, setAlertRouteDeviationEnabled] = useState(true);
  const [alertRouteDeviationMeters, setAlertRouteDeviationMeters] = useState('1000');
  const [alertStoppedEnabled, setAlertStoppedEnabled] = useState(true);
  const [alertStoppedMinutes, setAlertStoppedMinutes] = useState('10');

  // Store address state
  const [storeAddress, setStoreAddress] = useState('');
  const [storeNumber, setStoreNumber] = useState('');
  const [storeCep, setStoreCep] = useState('');
  const [storeCity, setStoreCity] = useState('');
  const [storeState, setStoreState] = useState('');
  const [storeNeighborhood, setStoreNeighborhood] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Public map link state
  const [publicMapEnabled, setPublicMapEnabled] = useState(false);
  const [publicMapToken, setPublicMapToken] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  // Fetch company store address data
  const { data: companyData, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['company-store-address', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('store_address, store_address_number, store_cep, store_city, store_state, store_neighborhood, store_latitude, store_longitude')
        .eq('id', company.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setEnableAutoDispatch(settings.enable_auto_dispatch);
      setEnableRegionGrouping(settings.enable_region_grouping);
      setMaxDeliveriesPerTrip(String(settings.max_deliveries_per_trip));
      setMaxGroupingRadiusKm(String(settings.max_grouping_radius_km));
      setRequireLocationForDelivery(settings.require_location_for_delivery);
      setDeliveryLocationRadiusMeters(String(settings.delivery_location_radius_meters));
      setLocationUpdateIntervalSeconds(String(settings.location_update_interval_seconds));
      setAutoAssignToAvailable(settings.auto_assign_to_available);
      
      // Alert settings - cast to any to access new fields
      const s = settings as any;
      setAlertRouteDeviationEnabled(s.alert_route_deviation_enabled ?? true);
      setAlertRouteDeviationMeters(String(s.alert_route_deviation_meters ?? 1000));
      setAlertStoppedEnabled(s.alert_stopped_enabled ?? true);
      setAlertStoppedMinutes(String(s.alert_stopped_minutes ?? 10));
      
      // Public map settings
      setPublicMapEnabled(s.public_map_enabled ?? false);
      setPublicMapToken(s.public_map_token || null);
    }
  }, [settings]);

  useEffect(() => {
    if (companyData) {
      setStoreAddress(companyData.store_address || '');
      setStoreNumber(companyData.store_address_number || '');
      setStoreCep(companyData.store_cep || '');
      setStoreCity(companyData.store_city || '');
      setStoreState(companyData.store_state || '');
      setStoreNeighborhood(companyData.store_neighborhood || '');
    }
  }, [companyData]);

  // CEP auto-complete
  const handleCepBlur = async () => {
    const cleanCep = storeCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setStoreAddress(data.logradouro || storeAddress);
        setStoreNeighborhood(data.bairro || storeNeighborhood);
        setStoreCity(data.localidade || storeCity);
        setStoreState(data.uf || storeState);
        toast.success('Endereço preenchido automaticamente');
      }
    } catch (error) {
      console.error('CEP lookup failed:', error);
    }
  };

  // Geocode and save store location
  const geocodeMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No company');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/geocode-address`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action: 'geocode_and_save',
            company_id: company.id,
            address: storeAddress,
            number: storeNumber,
            cep: storeCep,
            city: storeCity,
            state: storeState,
            neighborhood: storeNeighborhood,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Geocoding failed');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company-store-address'] });
      queryClient.invalidateQueries({ queryKey: ['deliverer-locations'] });
      toast.success(`Localização salva! (${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)})`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao geocodificar endereço');
    },
  });

  const handleSaveLocation = () => {
    if (!storeCep && !storeAddress) {
      toast.error('Informe pelo menos o CEP ou o endereço');
      return;
    }
    geocodeMutation.mutate();
  };

  // Generate public map token
  const generatePublicToken = async () => {
    if (!company?.id) return;
    
    setIsGeneratingToken(true);
    try {
      const newToken = crypto.randomUUID().replace(/-/g, '').substring(0, 32);
      
      const { error } = await supabase
        .from('deliverer_tracking_settings')
        .update({
          public_map_enabled: true,
          public_map_token: newToken,
        })
        .eq('company_id', company.id);

      if (error) throw error;
      
      setPublicMapToken(newToken);
      setPublicMapEnabled(true);
      toast.success('Link público gerado com sucesso!');
    } catch (error) {
      console.error('Error generating token:', error);
      toast.error('Erro ao gerar link');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Toggle public map
  const togglePublicMap = async (enabled: boolean) => {
    if (!company?.id) return;
    
    try {
      const { error } = await supabase
        .from('deliverer_tracking_settings')
        .update({ public_map_enabled: enabled })
        .eq('company_id', company.id);

      if (error) throw error;
      
      setPublicMapEnabled(enabled);
      toast.success(enabled ? 'Link público ativado' : 'Link público desativado');
    } catch (error) {
      console.error('Error toggling public map:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  // Copy public link
  const copyPublicLink = () => {
    if (!publicMapToken) return;
    const link = `${window.location.origin}/gps/${publicMapToken}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  // Open public link
  const openPublicLink = () => {
    if (!publicMapToken) return;
    const link = `${window.location.origin}/gps/${publicMapToken}`;
    window.open(link, '_blank');
  };

  const publicMapUrl = publicMapToken ? `${window.location.origin}/gps/${publicMapToken}` : null;

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      enabled,
      enable_auto_dispatch: enableAutoDispatch,
      enable_region_grouping: enableRegionGrouping,
      max_deliveries_per_trip: parseInt(maxDeliveriesPerTrip) || 3,
      max_grouping_radius_km: parseFloat(maxGroupingRadiusKm) || 2.0,
      require_location_for_delivery: requireLocationForDelivery,
      delivery_location_radius_meters: parseInt(deliveryLocationRadiusMeters) || 100,
      location_update_interval_seconds: parseInt(locationUpdateIntervalSeconds) || 15,
      auto_assign_to_available: autoAssignToAvailable,
      // Alert settings
      alert_route_deviation_enabled: alertRouteDeviationEnabled,
      alert_route_deviation_meters: parseInt(alertRouteDeviationMeters) || 1000,
      alert_stopped_enabled: alertStoppedEnabled,
      alert_stopped_minutes: parseInt(alertStoppedMinutes) || 10,
    } as any);
  };

  const hasStoreLocation = companyData?.store_latitude && companyData?.store_longitude;

  if (isLoading || isLoadingCompany) {
    return (
      <DashboardLayout title="Rastreio de Entregadores">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Rastreio de Entregadores">
      <div className="max-w-4xl space-y-6 animate-fade-in">
        {/* Main Enable/Disable */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
                <MapPin className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <CardTitle className="font-display">Módulo de Rastreio GPS</CardTitle>
                <CardDescription>
                  Rastreie seus entregadores em tempo real e otimize as entregas
                </CardDescription>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={!isAdmin}
              />
            </div>
          </CardHeader>
          {enabled && (
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Com este módulo ativo, os entregadores poderão compartilhar sua localização GPS em tempo real
                e você poderá acompanhar todas as entregas no mapa.
              </p>
            </CardContent>
          )}
        </Card>

        {enabled && (
          <>
            {/* Store Location */}
            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                    <Home className="w-5 h-5 text-warning" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Endereço do Estabelecimento</CardTitle>
                    <CardDescription>
                      Usado como ponto de origem no mapa e para detectar entregadores "na casa"
                    </CardDescription>
                  </div>
                  {hasStoreLocation ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Não configurado
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="store-cep">CEP *</Label>
                    <Input
                      id="store-cep"
                      placeholder="00000-000"
                      value={storeCep}
                      onChange={(e) => setStoreCep(e.target.value)}
                      onBlur={handleCepBlur}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="store-address">Endereço</Label>
                    <Input
                      id="store-address"
                      placeholder="Rua, Avenida..."
                      value={storeAddress}
                      onChange={(e) => setStoreAddress(e.target.value)}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-number">Número</Label>
                    <Input
                      id="store-number"
                      placeholder="123"
                      value={storeNumber}
                      onChange={(e) => setStoreNumber(e.target.value)}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store-neighborhood">Bairro</Label>
                    <Input
                      id="store-neighborhood"
                      placeholder="Centro"
                      value={storeNeighborhood}
                      onChange={(e) => setStoreNeighborhood(e.target.value)}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store-city">Cidade</Label>
                    <Input
                      id="store-city"
                      placeholder="São Paulo"
                      value={storeCity}
                      onChange={(e) => setStoreCity(e.target.value)}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store-state">Estado</Label>
                    <Input
                      id="store-state"
                      placeholder="SP"
                      maxLength={2}
                      value={storeState}
                      onChange={(e) => setStoreState(e.target.value.toUpperCase())}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                {hasStoreLocation && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <p className="text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4 inline mr-2" />
                      Localização atual: {companyData?.store_latitude?.toFixed(5)}, {companyData?.store_longitude?.toFixed(5)}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleSaveLocation}
                  disabled={!isAdmin || geocodeMutation.isPending}
                  className="w-full"
                >
                  {geocodeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4 mr-2" />
                  )}
                  {geocodeMutation.isPending ? 'Buscando coordenadas...' : 'Salvar Localização do Estabelecimento'}
                </Button>
              </CardContent>
            </Card>

            {/* Public Map Link */}
            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Link Público do Mapa</CardTitle>
                    <CardDescription>
                      Acesse o mapa de entregadores de qualquer dispositivo ou compartilhe com sua equipe
                    </CardDescription>
                  </div>
                  <Switch
                    checked={publicMapEnabled}
                    onCheckedChange={togglePublicMap}
                    disabled={!isAdmin || !publicMapToken}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {publicMapToken ? (
                  <>
                    <div className="flex gap-2">
                      <Input
                        value={publicMapUrl || ''}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" size="icon" onClick={copyPublicLink} title="Copiar link">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={openPublicLink} title="Abrir em nova aba">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use este link para visualizar o mapa em tempo real em outro computador ou monitor.
                      O link possui opção de tela cheia para melhor visualização.
                    </p>
                    {!publicMapEnabled && (
                      <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                        <p className="text-sm text-warning">
                          <AlertTriangle className="w-4 h-4 inline mr-2" />
                          O link público está desativado. Ative o switch acima para permitir o acesso.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Maximize2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Gere um link para acessar o mapa de entregadores em tempo real de qualquer lugar
                    </p>
                    <Button onClick={generatePublicToken} disabled={isGeneratingToken || !isAdmin}>
                      {isGeneratingToken ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Link2 className="w-4 h-4 mr-2" />
                      )}
                      Gerar Link Público
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Alerts */}
            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Alertas de Segurança</CardTitle>
                    <CardDescription>
                      Receba alertas quando algo anormal acontecer com os entregadores
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <div>
                      <Label>Alerta de desvio de rota</Label>
                      <p className="text-sm text-muted-foreground">
                        Avisar quando o entregador sair muito da rota planejada
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={alertRouteDeviationEnabled}
                    onCheckedChange={setAlertRouteDeviationEnabled}
                    disabled={!isAdmin}
                  />
                </div>

                {alertRouteDeviationEnabled && (
                  <div className="ml-8 space-y-2">
                    <Label htmlFor="deviation-meters">Distância máxima de desvio (metros)</Label>
                    <Input
                      id="deviation-meters"
                      type="number"
                      min="100"
                      max="5000"
                      value={alertRouteDeviationMeters}
                      onChange={(e) => setAlertRouteDeviationMeters(e.target.value)}
                      disabled={!isAdmin}
                    />
                    <p className="text-xs text-muted-foreground">
                      Alerta se desviar mais de {alertRouteDeviationMeters}m da rota
                    </p>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-warning" />
                    <div>
                      <Label>Alerta de parada prolongada</Label>
                      <p className="text-sm text-muted-foreground">
                        Avisar quando o entregador ficar parado muito tempo no mesmo lugar
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={alertStoppedEnabled}
                    onCheckedChange={setAlertStoppedEnabled}
                    disabled={!isAdmin}
                  />
                </div>

                {alertStoppedEnabled && (
                  <div className="ml-8 space-y-2">
                    <Label htmlFor="stopped-minutes">Tempo máximo parado (minutos)</Label>
                    <Input
                      id="stopped-minutes"
                      type="number"
                      min="5"
                      max="60"
                      value={alertStoppedMinutes}
                      onChange={(e) => setAlertStoppedMinutes(e.target.value)}
                      disabled={!isAdmin}
                    />
                    <p className="text-xs text-muted-foreground">
                      Alerta se parado por mais de {alertStoppedMinutes} minutos
                    </p>
                  </div>
                )}

                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <Shield className="w-3 h-3 inline mr-1" />
                    O sistema mantém histórico de todas as localizações para segurança em caso de incidentes
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Auto Dispatch Settings */}
            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Despacho Automático</CardTitle>
                    <CardDescription>
                      Configure como as entregas são atribuídas aos entregadores
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Navigation className="w-5 h-5 text-primary" />
                    <div>
                      <Label>Despacho automático</Label>
                      <p className="text-sm text-muted-foreground">
                        Atribuir entregas automaticamente aos entregadores disponíveis
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={enableAutoDispatch}
                    onCheckedChange={setEnableAutoDispatch}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <Label>Atribuir ao disponível</Label>
                      <p className="text-sm text-muted-foreground">
                        Despachar para entregadores que estão livres automaticamente
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={autoAssignToAvailable}
                    onCheckedChange={setAutoAssignToAvailable}
                    disabled={!isAdmin}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Region Grouping Settings */}
            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <Route className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Agrupamento por Região</CardTitle>
                    <CardDescription>
                      Agrupar entregas próximas para otimizar rotas
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-success" />
                    <div>
                      <Label>Agrupar por proximidade</Label>
                      <p className="text-sm text-muted-foreground">
                        Entregas próximas são despachadas juntas para o mesmo entregador
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={enableRegionGrouping}
                    onCheckedChange={setEnableRegionGrouping}
                    disabled={!isAdmin}
                  />
                </div>

                {enableRegionGrouping && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="max-deliveries">Máximo de entregas por viagem</Label>
                      <Input
                        id="max-deliveries"
                        type="number"
                        min="1"
                        max="10"
                        value={maxDeliveriesPerTrip}
                        onChange={(e) => setMaxDeliveriesPerTrip(e.target.value)}
                        disabled={!isAdmin}
                      />
                      <p className="text-xs text-muted-foreground">
                        Limite de entregas que podem ser agrupadas
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="grouping-radius">Raio de agrupamento (km)</Label>
                      <Input
                        id="grouping-radius"
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="10"
                        value={maxGroupingRadiusKm}
                        onChange={(e) => setMaxGroupingRadiusKm(e.target.value)}
                        disabled={!isAdmin}
                      />
                      <p className="text-xs text-muted-foreground">
                        Distância máxima para agrupar entregas
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Validation Settings */}
            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Validação de Entrega</CardTitle>
                    <CardDescription>
                      Confirmar que o entregador está no local antes de concluir
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-warning" />
                    <div>
                      <Label>Exigir localização para confirmar</Label>
                      <p className="text-sm text-muted-foreground">
                        Entregador só pode confirmar entrega quando estiver no endereço
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={requireLocationForDelivery}
                    onCheckedChange={setRequireLocationForDelivery}
                    disabled={!isAdmin}
                  />
                </div>

                {requireLocationForDelivery && (
                  <div className="space-y-2">
                    <Label htmlFor="delivery-radius">Raio de validação (metros)</Label>
                    <Input
                      id="delivery-radius"
                      type="number"
                      min="10"
                      max="500"
                      value={deliveryLocationRadiusMeters}
                      onChange={(e) => setDeliveryLocationRadiusMeters(e.target.value)}
                      disabled={!isAdmin}
                    />
                    <p className="text-xs text-muted-foreground">
                      Distância máxima do endereço para permitir confirmação
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Technical Settings */}
            <Card className="border-border/50 shadow-soft">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <Settings2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Configurações Técnicas</CardTitle>
                    <CardDescription>
                      Ajustes de performance e consumo de bateria
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="update-interval" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Intervalo de atualização (segundos)
                  </Label>
                  <Input
                    id="update-interval"
                    type="number"
                    min="5"
                    max="60"
                    value={locationUpdateIntervalSeconds}
                    onChange={(e) => setLocationUpdateIntervalSeconds(e.target.value)}
                    disabled={!isAdmin}
                  />
                  <p className="text-xs text-muted-foreground">
                    Intervalo menor = mais precisão, porém maior consumo de bateria
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Save Button */}
        {isAdmin && (
          <Button 
            onClick={handleSave} 
            disabled={updateSettings.isPending}
            className="w-full"
            size="lg"
          >
            {updateSettings.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {updateSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        )}
      </div>
    </DashboardLayout>
  );
}
