import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useKDSSettings } from '@/hooks/useKDSSettings';
import { useKitchenLoad } from '@/hooks/useKitchenLoad';
import { useCompany, useUpdateCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { Loader2, Timer, AlertTriangle, XCircle, Clock, Activity, Gauge, RefreshCw, Tv, Bell } from 'lucide-react';

export default function SettingsKDS() {
  const { settings, isLoading, updateSettings } = useKDSSettings();
  const { loadState, snapshots, calculateLoad } = useKitchenLoad();
  const { data: company } = useCompany();
  const updateCompany = useUpdateCompany();

  const [orderReadyCallEnabled, setOrderReadyCallEnabled] = useState(true);
  
  const [formData, setFormData] = useState({
    warn_after_minutes: 10,
    danger_after_minutes: 20,
    max_new_minutes: '',
    max_preparing_minutes: '',
    max_ready_minutes: '',
    max_dispatched_minutes: '',
    // Kitchen capacity fields
    kitchen_capacity_units_per_10min: '20',
    dynamic_eta_enabled: false,
    dynamic_eta_min_extra_minutes: '0',
    dynamic_eta_max_extra_minutes: '60',
    warn_load_ratio: '0.9',
    danger_load_ratio: '1.1',
  });

  useEffect(() => {
    if (settings) {
      const s = settings as unknown as Record<string, unknown>;
      setFormData({
        warn_after_minutes: settings.warn_after_minutes,
        danger_after_minutes: settings.danger_after_minutes,
        max_new_minutes: settings.max_new_minutes?.toString() || '',
        max_preparing_minutes: settings.max_preparing_minutes?.toString() || '',
        max_ready_minutes: settings.max_ready_minutes?.toString() || '',
        max_dispatched_minutes: settings.max_dispatched_minutes?.toString() || '',
        kitchen_capacity_units_per_10min: (s.kitchen_capacity_units_per_10min as number)?.toString() || '20',
        dynamic_eta_enabled: (s.dynamic_eta_enabled as boolean) || false,
        dynamic_eta_min_extra_minutes: (s.dynamic_eta_min_extra_minutes as number)?.toString() || '0',
        dynamic_eta_max_extra_minutes: (s.dynamic_eta_max_extra_minutes as number)?.toString() || '60',
        warn_load_ratio: (s.warn_load_ratio as number)?.toString() || '0.9',
        danger_load_ratio: (s.danger_load_ratio as number)?.toString() || '1.1',
      });
    }
  }, [settings]);

  useEffect(() => {
    if (company) {
      setOrderReadyCallEnabled((company as any).enable_order_ready_call ?? true);
    }
  }, [company]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        warn_after_minutes: formData.warn_after_minutes,
        danger_after_minutes: formData.danger_after_minutes,
        max_new_minutes: formData.max_new_minutes ? parseInt(formData.max_new_minutes) : null,
        max_preparing_minutes: formData.max_preparing_minutes ? parseInt(formData.max_preparing_minutes) : null,
        max_ready_minutes: formData.max_ready_minutes ? parseInt(formData.max_ready_minutes) : null,
        max_dispatched_minutes: formData.max_dispatched_minutes ? parseInt(formData.max_dispatched_minutes) : null,
        // Kitchen capacity fields (cast to any for new columns)
        kitchen_capacity_units_per_10min: parseFloat(formData.kitchen_capacity_units_per_10min) || 20,
        dynamic_eta_enabled: formData.dynamic_eta_enabled,
        dynamic_eta_min_extra_minutes: parseInt(formData.dynamic_eta_min_extra_minutes) || 0,
        dynamic_eta_max_extra_minutes: parseInt(formData.dynamic_eta_max_extra_minutes) || 60,
        warn_load_ratio: parseFloat(formData.warn_load_ratio) || 0.9,
        danger_load_ratio: parseFloat(formData.danger_load_ratio) || 1.1,
      } as Record<string, unknown>);
      toast.success('Configurações salvas');
    } catch {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleTestLoad = async () => {
    try {
      await calculateLoad.mutateAsync();
      toast.success('Cálculo de carga executado');
    } catch {
      toast.error('Erro ao calcular carga');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const handleOrderReadyCallToggle = async (enabled: boolean) => {
    if (!company?.id) return;
    try {
      await updateCompany.mutateAsync({ id: company.id, enable_order_ready_call: enabled });
      setOrderReadyCallEnabled(enabled);
      toast.success(enabled ? 'Chamada na TV ativada' : 'Chamada na TV desativada');
    } catch {
      toast.error('Erro ao atualizar configuração');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configurações do KDS</h2>
        <p className="text-muted-foreground">
          Configure os tempos de alerta e capacidade da cozinha
        </p>
      </div>

      {/* Order Ready Call Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="h-5 w-5" />
            Chamada de Pedido Pronto na TV
          </CardTitle>
          <CardDescription>
            Exibe uma notificação na TV de marketing quando um pedido fica pronto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Chamada automática</p>
                <p className="text-sm text-muted-foreground">
                  Ao marcar pedido como "Pronto", a TV exibe o número e nome do cliente por 5 segundos
                </p>
              </div>
            </div>
            <Switch
              checked={orderReadyCallEnabled}
              onCheckedChange={handleOrderReadyCallToggle}
              disabled={updateCompany.isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Limites de Alerta
          </CardTitle>
          <CardDescription>
            Defina quando os pedidos devem exibir alertas visuais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Alerta (amarelo) após
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={formData.warn_after_minutes}
                  onChange={(e) => setFormData({ ...formData, warn_after_minutes: parseInt(e.target.value) || 10 })}
                />
                <span className="text-muted-foreground whitespace-nowrap">minutos</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                Crítico (vermelho) após
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={formData.danger_after_minutes}
                  onChange={(e) => setFormData({ ...formData, danger_after_minutes: parseInt(e.target.value) || 20 })}
                />
                <span className="text-muted-foreground whitespace-nowrap">minutos</span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4" />
              Limites por Etapa (opcional)
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tempo máximo em "Novo"</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Padrão"
                    value={formData.max_new_minutes}
                    onChange={(e) => setFormData({ ...formData, max_new_minutes: e.target.value })}
                  />
                  <span className="text-muted-foreground">min</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tempo máximo em "Preparo"</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Padrão"
                    value={formData.max_preparing_minutes}
                    onChange={(e) => setFormData({ ...formData, max_preparing_minutes: e.target.value })}
                  />
                  <span className="text-muted-foreground">min</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tempo máximo em "Pronto"</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Padrão"
                    value={formData.max_ready_minutes}
                    onChange={(e) => setFormData({ ...formData, max_ready_minutes: e.target.value })}
                  />
                  <span className="text-muted-foreground">min</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tempo máximo em "Em Rota"</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Padrão"
                    value={formData.max_dispatched_minutes}
                    onChange={(e) => setFormData({ ...formData, max_dispatched_minutes: e.target.value })}
                  />
                  <span className="text-muted-foreground">min</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Capacidade da Cozinha (IA)
          </CardTitle>
          <CardDescription>
            Configure a capacidade de produção para ajuste automático de ETA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">ETA Dinâmico</p>
                <p className="text-sm text-muted-foreground">
                  Ajustar previsão de entrega baseado na carga da cozinha
                </p>
              </div>
            </div>
            <Switch
              checked={formData.dynamic_eta_enabled}
              onCheckedChange={(v) => setFormData({ ...formData, dynamic_eta_enabled: v })}
            />
          </div>

          {formData.dynamic_eta_enabled && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Capacidade (unidades/10min)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.kitchen_capacity_units_per_10min}
                    onChange={(e) => setFormData({ ...formData, kitchen_capacity_units_per_10min: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantas unidades de produção a cozinha processa a cada 10 minutos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>ETA Mínimo Extra</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={formData.dynamic_eta_min_extra_minutes}
                      onChange={(e) => setFormData({ ...formData, dynamic_eta_min_extra_minutes: e.target.value })}
                    />
                    <span className="text-muted-foreground">min</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ETA Máximo Extra</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={formData.dynamic_eta_max_extra_minutes}
                      onChange={(e) => setFormData({ ...formData, dynamic_eta_max_extra_minutes: e.target.value })}
                    />
                    <span className="text-muted-foreground">min</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Thresholds de Carga</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Alerta quando ratio ≥
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      max={2}
                      value={formData.warn_load_ratio}
                      onChange={(e) => setFormData({ ...formData, warn_load_ratio: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      0.9 = 90% da capacidade
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      Crítico quando ratio ≥
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      max={2}
                      value={formData.danger_load_ratio}
                      onChange={(e) => setFormData({ ...formData, danger_load_ratio: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      1.1 = 110% da capacidade (sobrecarga)
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Estado Atual
                </h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Nível</p>
                    <p className={`font-bold ${
                      loadState.current_load_level === 'danger' ? 'text-destructive' :
                      loadState.current_load_level === 'warn' ? 'text-warning' : 'text-success'
                    }`}>
                      {loadState.current_load_level === 'danger' ? 'CRÍTICO' :
                       loadState.current_load_level === 'warn' ? 'ALERTA' : 'NORMAL'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ETA Extra</p>
                    <p className="font-bold">+{loadState.current_eta_extra_minutes} min</p>
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestLoad}
                      disabled={calculateLoad.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${calculateLoad.isPending ? 'animate-spin' : ''}`} />
                      Recalcular
                    </Button>
                  </div>
                </div>

                {snapshots.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Último cálculo:</p>
                    <p className="text-xs">{snapshots[0].reason}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
