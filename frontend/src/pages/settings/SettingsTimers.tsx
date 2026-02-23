import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useKDSSettings } from '@/hooks/useKDSSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { AlertTriangle, Zap, ChefHat, Save } from 'lucide-react';

export default function SettingsTimers() {
  const { settings, updateSettings, isLoading } = useKDSSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [localSettings, setLocalSettings] = useState({
    warn_after_minutes: 10,
    danger_after_minutes: 20,
    kitchen_capacity_units_per_10min: 20,
    dynamic_eta_enabled: false,
    dynamic_eta_min_extra_minutes: 0,
    dynamic_eta_max_extra_minutes: 60,
    warn_load_ratio: 0.9,
    danger_load_ratio: 1.1,
  });

  // Sync with loaded settings
  useEffect(() => {
    if (settings && !initialized) {
      setLocalSettings({
        warn_after_minutes: settings.warn_after_minutes || 10,
        danger_after_minutes: settings.danger_after_minutes || 20,
        kitchen_capacity_units_per_10min: settings.kitchen_capacity_units_per_10min || 20,
        dynamic_eta_enabled: settings.dynamic_eta_enabled || false,
        dynamic_eta_min_extra_minutes: settings.dynamic_eta_min_extra_minutes || 0,
        dynamic_eta_max_extra_minutes: settings.dynamic_eta_max_extra_minutes || 60,
        warn_load_ratio: settings.warn_load_ratio || 0.9,
        danger_load_ratio: settings.danger_load_ratio || 1.1,
      });
      setInitialized(true);
    }
  }, [settings, initialized]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings.mutateAsync(localSettings);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Configurações de Tempos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configurações de Tempos">
      <div className="space-y-6 animate-fade-in max-w-3xl">
        {/* Alert Thresholds */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Limites de Alerta
          </CardTitle>
          <CardDescription>
            Configure quando os alertas de atraso devem ser acionados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Warn Threshold */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  Alerta de Atenção
                </Label>
                <span className="text-sm font-bold text-yellow-500">
                  {localSettings.warn_after_minutes} min
                </span>
              </div>
              <Slider
                value={[localSettings.warn_after_minutes]}
                onValueChange={(v) => setLocalSettings(s => ({ ...s, warn_after_minutes: v[0] }))}
                min={5}
                max={30}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Pedido fica amarelo e emite alerta visual
              </p>
            </div>

            {/* Danger Threshold */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  Alerta Crítico
                </Label>
                <span className="text-sm font-bold text-red-500">
                  {localSettings.danger_after_minutes} min
                </span>
              </div>
              <Slider
                value={[localSettings.danger_after_minutes]}
                onValueChange={(v) => setLocalSettings(s => ({ ...s, danger_after_minutes: v[0] }))}
                min={10}
                max={60}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Pedido fica vermelho, pisca e emite som de alerta
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kitchen Capacity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-orange-500" />
            Capacidade da Cozinha
          </CardTitle>
          <CardDescription>
            Define quantos pedidos sua cozinha consegue processar em 10 minutos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Capacidade (pedidos/10min)</Label>
              <Input
                type="number"
                value={localSettings.kitchen_capacity_units_per_10min}
                onChange={(e) => setLocalSettings(s => ({ 
                  ...s, 
                  kitchen_capacity_units_per_10min: parseInt(e.target.value) || 10 
                }))}
                className="w-24 text-center"
                min={5}
                max={100}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Usado para calcular o nível de carga da cozinha e sugerir pausas
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  Carga Intensa (%)
                </Label>
                <span className="text-sm font-bold">
                  {Math.round((localSettings.warn_load_ratio || 0.9) * 100)}%
                </span>
              </div>
              <Slider
                value={[Math.round((localSettings.warn_load_ratio || 0.9) * 100)]}
                onValueChange={(v) => setLocalSettings(s => ({ ...s, warn_load_ratio: v[0] / 100 }))}
                min={50}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  Carga Crítica (%)
                </Label>
                <span className="text-sm font-bold">
                  {Math.round((localSettings.danger_load_ratio || 1.1) * 100)}%
                </span>
              </div>
              <Slider
                value={[Math.round((localSettings.danger_load_ratio || 1.1) * 100)]}
                onValueChange={(v) => setLocalSettings(s => ({ ...s, danger_load_ratio: v[0] / 100 }))}
                min={100}
                max={150}
                step={5}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic ETA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            ETA Dinâmico
          </CardTitle>
          <CardDescription>
            Ajusta automaticamente o tempo estimado com base na carga atual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar ETA Dinâmico</Label>
              <p className="text-xs text-muted-foreground">
                Adiciona tempo extra ao ETA quando a cozinha está sobrecarregada
              </p>
            </div>
            <Switch
              checked={localSettings.dynamic_eta_enabled || false}
              onCheckedChange={(checked) => setLocalSettings(s => ({ ...s, dynamic_eta_enabled: checked }))}
            />
          </div>

          {localSettings.dynamic_eta_enabled && (
            <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
              <div className="space-y-2">
                <Label>Mínimo extra (min)</Label>
                <Input
                  type="number"
                  value={localSettings.dynamic_eta_min_extra_minutes}
                  onChange={(e) => setLocalSettings(s => ({ 
                    ...s, 
                    dynamic_eta_min_extra_minutes: parseInt(e.target.value) || 0 
                  }))}
                  min={0}
                  max={30}
                />
              </div>
              <div className="space-y-2">
                <Label>Máximo extra (min)</Label>
                <Input
                  type="number"
                  value={localSettings.dynamic_eta_max_extra_minutes}
                  onChange={(e) => setLocalSettings(s => ({ 
                    ...s, 
                    dynamic_eta_max_extra_minutes: parseInt(e.target.value) || 60 
                  }))}
                  min={0}
                  max={120}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
      </div>
    </DashboardLayout>
  );
}
