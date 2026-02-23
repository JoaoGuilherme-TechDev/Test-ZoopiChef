import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, MapPin, Clock, Navigation, AlertTriangle, CheckCircle2, Loader2, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCompanyTableSettings } from '@/hooks/useCompanyTableSettings';

export function GeoSecuritySettings() {
  const { data: settings, isLoading, upsert, isPending } = useCompanyTableSettings();
  const { toast } = useToast();
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [formData, setFormData] = useState({
    geo_security_enabled: false,
    geo_security_radius_meters: 100,
    geo_session_duration_minutes: 30,
    location_latitude: null as number | null,
    location_longitude: null as number | null,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        geo_security_enabled: settings.geo_security_enabled || false,
        geo_security_radius_meters: settings.geo_security_radius_meters || 100,
        geo_session_duration_minutes: settings.geo_session_duration_minutes || 30,
        location_latitude: settings.location_latitude,
        location_longitude: settings.location_longitude,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await upsert(formData);
      toast({ title: 'Configurações salvas com sucesso' });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocalização não suportada',
        description: 'Seu navegador não suporta geolocalização',
        variant: 'destructive',
      });
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          location_latitude: position.coords.latitude,
          location_longitude: position.coords.longitude,
        }));
        setIsGettingLocation(false);
        toast({
          title: 'Localização obtida!',
          description: 'Coordenadas do estabelecimento atualizadas',
        });
      },
      (error) => {
        setIsGettingLocation(false);
        let message = 'Erro ao obter localização';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Permissão de localização negada';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Localização indisponível';
            break;
          case error.TIMEOUT:
            message = 'Tempo esgotado ao obter localização';
            break;
        }
        toast({ title: message, variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const hasLocation = formData.location_latitude !== null && formData.location_longitude !== null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Segurança por Geolocalização
        </CardTitle>
        <CardDescription>
          Garante que QR codes, tablets e app de garçom só funcionem dentro do estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">Ativar Verificação de Localização</p>
              {formData.geo_security_enabled && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Ativo
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Clientes precisam estar no estabelecimento para fazer pedidos
            </p>
          </div>
          <Switch
            checked={formData.geo_security_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, geo_security_enabled: checked })}
          />
        </div>

        {formData.geo_security_enabled && !hasLocation && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Localização não configurada</AlertTitle>
            <AlertDescription>
              Você precisa definir a localização do estabelecimento para ativar a segurança geográfica.
            </AlertDescription>
          </Alert>
        )}

        {/* Establishment Location */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Localização do Estabelecimento
          </Label>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="0.0000001"
                placeholder="-23.5505199"
                value={formData.location_latitude ?? ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  location_latitude: e.target.value ? parseFloat(e.target.value) : null 
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.0000001"
                placeholder="-46.6333094"
                value={formData.location_longitude ?? ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  location_longitude: e.target.value ? parseFloat(e.target.value) : null 
                })}
              />
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Obtendo localização...
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4 mr-2" />
                Usar Localização Atual
              </>
            )}
          </Button>

          {hasLocation && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Localização configurada: {formData.location_latitude?.toFixed(6)}, {formData.location_longitude?.toFixed(6)}
            </div>
          )}
        </div>

        {/* Radius */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Raio de Validação
          </Label>
          <Select 
            value={String(formData.geo_security_radius_meters)}
            onValueChange={(v) => setFormData({ ...formData, geo_security_radius_meters: parseInt(v) })}
          >
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50 metros (muito restrito)</SelectItem>
              <SelectItem value="100">100 metros (recomendado)</SelectItem>
              <SelectItem value="200">200 metros</SelectItem>
              <SelectItem value="300">300 metros</SelectItem>
              <SelectItem value="500">500 metros</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Clientes fora deste raio não poderão fazer pedidos
          </p>
        </div>

        {/* Session Duration */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Duração da Sessão
          </Label>
          <Select 
            value={String(formData.geo_session_duration_minutes)}
            onValueChange={(v) => setFormData({ ...formData, geo_session_duration_minutes: parseInt(v) })}
          >
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutos</SelectItem>
              <SelectItem value="30">30 minutos (recomendado)</SelectItem>
              <SelectItem value="60">1 hora</SelectItem>
              <SelectItem value="120">2 horas</SelectItem>
              <SelectItem value="240">4 horas</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Após este tempo, o cliente precisará validar a localização novamente
          </p>
        </div>

        {/* How it works */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Como funciona</AlertTitle>
          <AlertDescription className="space-y-2">
            <ul className="list-disc list-inside text-sm space-y-1 mt-2">
              <li>Ao escanear o QR code ou abrir o tablet, o sistema solicita permissão de localização</li>
              <li>A distância do cliente até o estabelecimento é calculada via GPS</li>
              <li>Se estiver dentro do raio permitido, uma sessão é criada</li>
              <li>A sessão expira após o tempo configurado, exigindo nova validação</li>
              <li>Links compartilhados não funcionarão fora do estabelecimento</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
