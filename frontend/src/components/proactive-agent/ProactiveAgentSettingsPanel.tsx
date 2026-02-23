import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Zap,
  TrendingDown,
  Clock,
  Users,
  Package,
  MessageSquare,
  Instagram,
  Shield,
  Settings,
  Save,
  Play,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProactiveAgentSettings, useProactiveAlerts, ProactiveAgentSettings } from '@/hooks/useProactiveAgent';
import { cn } from '@/lib/utils';

const defaultSettings: Omit<ProactiveAgentSettings, 'company_id'> = {
  is_enabled: true,
  trigger_low_revenue: true,
  trigger_peak_no_movement: true,
  trigger_inactive_customers: true,
  trigger_stale_inventory: true,
  revenue_threshold_percent: 30,
  peak_hours_start: 11,
  peak_hours_end: 14,
  inactive_days_threshold: 30,
  stale_inventory_days: 14,
  max_alerts_per_day: 3,
  max_campaigns_per_week: 5,
  cooldown_hours: 4,
  auto_whatsapp: true,
  auto_instagram: false,
  require_approval: true,
  target_audience: 'all',
  max_customers_per_blast: 100,
};

export function ProactiveAgentSettingsPanel() {
  const { settings: savedSettings, isLoading, updateSettings, isUpdating } = useProactiveAgentSettings();
  const { triggerCheck, isChecking, alerts } = useProactiveAlerts();
  
  const [localSettings, setLocalSettings] = useState<Omit<ProactiveAgentSettings, 'company_id'>>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (savedSettings) {
      setLocalSettings({
        is_enabled: savedSettings.is_enabled,
        trigger_low_revenue: savedSettings.trigger_low_revenue,
        trigger_peak_no_movement: savedSettings.trigger_peak_no_movement,
        trigger_inactive_customers: savedSettings.trigger_inactive_customers,
        trigger_stale_inventory: savedSettings.trigger_stale_inventory,
        revenue_threshold_percent: savedSettings.revenue_threshold_percent,
        peak_hours_start: savedSettings.peak_hours_start,
        peak_hours_end: savedSettings.peak_hours_end,
        inactive_days_threshold: savedSettings.inactive_days_threshold,
        stale_inventory_days: savedSettings.stale_inventory_days,
        max_alerts_per_day: savedSettings.max_alerts_per_day,
        max_campaigns_per_week: savedSettings.max_campaigns_per_week,
        cooldown_hours: savedSettings.cooldown_hours,
        auto_whatsapp: savedSettings.auto_whatsapp,
        auto_instagram: savedSettings.auto_instagram,
        require_approval: savedSettings.require_approval,
        target_audience: savedSettings.target_audience,
        max_customers_per_blast: savedSettings.max_customers_per_blast,
      });
    }
  }, [savedSettings]);

  const updateLocal = <K extends keyof typeof localSettings>(
    key: K,
    value: (typeof localSettings)[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Agente IA Proativo</h2>
            <p className="text-sm text-muted-foreground">
              Configure quando e como a IA deve agir automaticamente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {alerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {alerts.length} alerta(s) pendente(s)
            </Badge>
          )}
          
          <Switch
            checked={localSettings.is_enabled}
            onCheckedChange={(checked) => updateLocal('is_enabled', checked)}
          />
        </div>
      </div>

      <div className={cn(
        "space-y-6 transition-opacity",
        !localSettings.is_enabled && "opacity-50 pointer-events-none"
      )}>
        {/* Gatilhos de Ativação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-primary" />
              Gatilhos de Ativação
            </CardTitle>
            <CardDescription>
              Defina quais situações devem ativar o agente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TriggerRow
              icon={TrendingDown}
              label="Faturamento abaixo da média"
              description="Quando as vendas do dia estão abaixo do esperado"
              enabled={localSettings.trigger_low_revenue}
              onChange={(v) => updateLocal('trigger_low_revenue', v)}
            >
              <div className="flex items-center gap-2">
                <Label className="text-xs">Threshold:</Label>
                <Slider
                  value={[localSettings.revenue_threshold_percent]}
                  onValueChange={([v]) => updateLocal('revenue_threshold_percent', v)}
                  min={10}
                  max={50}
                  step={5}
                  className="w-24"
                />
                <span className="text-xs font-medium w-8">{localSettings.revenue_threshold_percent}%</span>
              </div>
            </TriggerRow>

            <Separator />

            <TriggerRow
              icon={Clock}
              label="Horário de pico sem movimento"
              description="Quando não há pedidos em horários de alta demanda"
              enabled={localSettings.trigger_peak_no_movement}
              onChange={(v) => updateLocal('trigger_peak_no_movement', v)}
            >
              <div className="flex items-center gap-2 text-xs">
                <Label>Das</Label>
                <Select
                  value={String(localSettings.peak_hours_start)}
                  onValueChange={(v) => updateLocal('peak_hours_start', Number(v))}
                >
                  <SelectTrigger className="w-16 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {String(i).padStart(2, '0')}h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label>às</Label>
                <Select
                  value={String(localSettings.peak_hours_end)}
                  onValueChange={(v) => updateLocal('peak_hours_end', Number(v))}
                >
                  <SelectTrigger className="w-16 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {String(i).padStart(2, '0')}h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TriggerRow>

            <Separator />

            <TriggerRow
              icon={Users}
              label="Clientes inativos"
              description="Quando detecta clientes que pararam de comprar"
              enabled={localSettings.trigger_inactive_customers}
              onChange={(v) => updateLocal('trigger_inactive_customers', v)}
            >
              <div className="flex items-center gap-2">
                <Label className="text-xs">Após</Label>
                <Input
                  type="number"
                  value={localSettings.inactive_days_threshold}
                  onChange={(e) => updateLocal('inactive_days_threshold', Number(e.target.value))}
                  className="w-16 h-7 text-xs"
                  min={7}
                  max={90}
                />
                <Label className="text-xs">dias</Label>
              </div>
            </TriggerRow>

            <Separator />

            <TriggerRow
              icon={Package}
              label="Estoque parado"
              description="Produtos sem vendas que precisam de promoção"
              enabled={localSettings.trigger_stale_inventory}
              onChange={(v) => updateLocal('trigger_stale_inventory', v)}
            >
              <div className="flex items-center gap-2">
                <Label className="text-xs">Após</Label>
                <Input
                  type="number"
                  value={localSettings.stale_inventory_days}
                  onChange={(e) => updateLocal('stale_inventory_days', Number(e.target.value))}
                  className="w-16 h-7 text-xs"
                  min={7}
                  max={60}
                />
                <Label className="text-xs">dias</Label>
              </div>
            </TriggerRow>
          </CardContent>
        </Card>

        {/* Limites de Ação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4 text-primary" />
              Limites de Ação
            </CardTitle>
            <CardDescription>
              Controle a frequência e volume de ações do agente
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Alertas por dia</Label>
              <Slider
                value={[localSettings.max_alerts_per_day]}
                onValueChange={([v]) => updateLocal('max_alerts_per_day', v)}
                min={1}
                max={10}
                step={1}
              />
              <p className="text-xs text-muted-foreground text-center">
                Máximo {localSettings.max_alerts_per_day} alertas/dia
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Campanhas por semana</Label>
              <Slider
                value={[localSettings.max_campaigns_per_week]}
                onValueChange={([v]) => updateLocal('max_campaigns_per_week', v)}
                min={1}
                max={20}
                step={1}
              />
              <p className="text-xs text-muted-foreground text-center">
                Máximo {localSettings.max_campaigns_per_week} campanhas/semana
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Intervalo entre alertas</Label>
              <Slider
                value={[localSettings.cooldown_hours]}
                onValueChange={([v]) => updateLocal('cooldown_hours', v)}
                min={1}
                max={12}
                step={1}
              />
              <p className="text-xs text-muted-foreground text-center">
                Mínimo {localSettings.cooldown_hours} horas entre alertas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Canais e Comportamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="w-4 h-4 text-primary" />
              Canais e Comportamento
            </CardTitle>
            <CardDescription>
              Configure como as campanhas serão executadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-green-600" />
                <div>
                  <Label>Disparo automático WhatsApp</Label>
                  <p className="text-xs text-muted-foreground">Enviar mensagens automaticamente</p>
                </div>
              </div>
              <Switch
                checked={localSettings.auto_whatsapp}
                onCheckedChange={(v) => updateLocal('auto_whatsapp', v)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Instagram className="w-4 h-4 text-pink-600" />
                <div>
                  <Label>Publicação automática Instagram</Label>
                  <p className="text-xs text-muted-foreground">Postar automaticamente no feed</p>
                </div>
              </div>
              <Switch
                checked={localSettings.auto_instagram}
                onCheckedChange={(v) => updateLocal('auto_instagram', v)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-primary" />
                <div>
                  <Label>Requer aprovação</Label>
                  <p className="text-xs text-muted-foreground">Exibir modal antes de executar</p>
                </div>
              </div>
              <Switch
                checked={localSettings.require_approval}
                onCheckedChange={(v) => updateLocal('require_approval', v)}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Público alvo</Label>
                <Select
                  value={localSettings.target_audience}
                  onValueChange={(v) => updateLocal('target_audience', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    <SelectItem value="vip">Apenas VIPs</SelectItem>
                    <SelectItem value="inactive">Apenas inativos</SelectItem>
                    <SelectItem value="recent">Compradores recentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Máx. clientes por disparo</Label>
                <Input
                  type="number"
                  value={localSettings.max_customers_per_blast}
                  onChange={(e) => updateLocal('max_customers_per_blast', Number(e.target.value))}
                  min={10}
                  max={500}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => triggerCheck()}
          disabled={isChecking || !localSettings.is_enabled}
        >
          <Play className={cn("w-4 h-4 mr-2", isChecking && "animate-spin")} />
          {isChecking ? 'Verificando...' : 'Verificar agora'}
        </Button>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || isUpdating}
        >
          <Save className="w-4 h-4 mr-2" />
          {isUpdating ? 'Salvando...' : 'Salvar configurações'}
        </Button>
      </div>
    </div>
  );
}

// Componente auxiliar para cada gatilho
function TriggerRow({
  icon: Icon,
  label,
  description,
  enabled,
  onChange,
  children,
}: {
  icon: typeof TrendingDown;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 flex-1">
        <div className={cn(
          "p-2 rounded-lg transition-colors",
          enabled ? "bg-primary/10" : "bg-muted"
        )}>
          <Icon className={cn("w-4 h-4", enabled ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Label className={cn(!enabled && "text-muted-foreground")}>{label}</Label>
            <Switch checked={enabled} onCheckedChange={onChange} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          {enabled && children && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2"
            >
              {children}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
