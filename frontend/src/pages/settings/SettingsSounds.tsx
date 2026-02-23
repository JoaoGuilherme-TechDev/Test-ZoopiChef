import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Volume2, Play, Save, Bell, AlertTriangle, ShoppingBag, Clock, BellOff, MessageSquare } from 'lucide-react';
import { 
  ALERT_SOUNDS, 
  alertSoundPlayer, 
  getSavedAlertSound, 
  saveAlertSound,
  getSavedVolume,
  saveVolume 
} from '@/lib/alertSounds';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

interface SoundConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultSound: string;
}

const SOUND_CONFIGS: SoundConfig[] = [
  {
    key: 'new_order',
    label: 'Novo Pedido',
    description: 'Som quando chega um novo pedido',
    icon: <ShoppingBag className="w-5 h-5 text-primary" />,
    defaultSound: 'phone_ring',
  },
  {
    key: 'delay_warning',
    label: 'Aviso de Atraso',
    description: 'Som quando um pedido está atrasando',
    icon: <Clock className="w-5 h-5 text-yellow-500" />,
    defaultSound: 'warning',
  },
  {
    key: 'delay_critical',
    label: 'Atraso Crítico',
    description: 'Som para atrasos críticos',
    icon: <AlertTriangle className="w-5 h-5 text-destructive" />,
    defaultSound: 'urgent',
  },
  {
    key: 'order_ready',
    label: 'Pedido Pronto',
    description: 'Som quando pedido está pronto',
    icon: <Bell className="w-5 h-5 text-green-500" />,
    defaultSound: 'success',
  },
  {
    key: 'table_call',
    label: 'Chamado de Mesa',
    description: 'Som quando mesa solicita atendimento',
    icon: <Bell className="w-5 h-5 text-blue-500" />,
    defaultSound: 'doorbell',
  },
  {
    key: 'kitchen_message',
    label: 'Mensagem Interna',
    description: 'Som para mensagens internas/cozinha',
    icon: <Bell className="w-5 h-5 text-orange-500" />,
    defaultSound: 'notification',
  },
];

export default function SettingsSounds() {
  const { preferences, togglePreference } = useNotificationPreferences();
  
  const [sounds, setSounds] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    SOUND_CONFIGS.forEach(config => {
      initial[config.key] = getSavedAlertSound(config.key, config.defaultSound);
    });
    return initial;
  });

  const [volumes, setVolumes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    SOUND_CONFIGS.forEach(config => {
      initial[config.key] = getSavedVolume(config.key, 0.5);
    });
    return initial;
  });

  const [globalVolume, setGlobalVolume] = useState(() => getSavedVolume('global', 0.7));

  const handleSoundChange = (key: string, soundId: string) => {
    setSounds(prev => ({ ...prev, [key]: soundId }));
  };

  const handleVolumeChange = (key: string, value: number[]) => {
    setVolumes(prev => ({ ...prev, [key]: value[0] }));
  };

  const handlePlaySound = async (key: string) => {
    const soundId = sounds[key];
    const volume = volumes[key] * globalVolume;
    await alertSoundPlayer.play(soundId, volume);
  };

  const handleSave = () => {
    SOUND_CONFIGS.forEach(config => {
      saveAlertSound(config.key, sounds[config.key]);
      saveVolume(config.key, volumes[config.key]);
    });
    saveVolume('global', globalVolume);
    toast.success('Configurações de som salvas!');
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'order': return 'bg-primary/20 text-primary';
      case 'alert': return 'bg-yellow-500/20 text-yellow-700';
      case 'urgent': return 'bg-red-500/20 text-red-700';
      case 'notification': return 'bg-blue-500/20 text-blue-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout title="Configurações de Sons">
      <div className="max-w-2xl space-y-6 animate-fade-in">
        {/* Notification Toggles */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                {preferences.orderNotificationsEnabled ? (
                  <Bell className="w-6 h-6 text-primary" />
                ) : (
                  <BellOff className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="font-display">Notificações</CardTitle>
                <CardDescription>
                  Ative ou desative os diferentes tipos de notificação
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Notificações de Pedidos */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Notificações de Pedidos</p>
                  <p className="text-sm text-muted-foreground">Sons e alertas quando chegam novos pedidos</p>
                </div>
              </div>
              <Switch
                checked={preferences.orderNotificationsEnabled}
                onCheckedChange={() => togglePreference('orderNotificationsEnabled')}
              />
            </div>

            {preferences.orderNotificationsEnabled && (
              <div className="ml-4 space-y-3 border-l-2 border-muted pl-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Tocar som</span>
                  </div>
                  <Switch
                    checked={preferences.orderSoundEnabled}
                    onCheckedChange={() => togglePreference('orderSoundEnabled')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Mostrar balão/toast</span>
                  </div>
                  <Switch
                    checked={preferences.orderToastEnabled}
                    onCheckedChange={() => togglePreference('orderToastEnabled')}
                  />
                </div>
              </div>
            )}

            {/* Avisos de Atraso */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Avisos de Atraso</p>
                  <p className="text-sm text-muted-foreground">Alertas quando pedidos estão atrasando</p>
                </div>
              </div>
              <Switch
                checked={preferences.delayNotificationsEnabled}
                onCheckedChange={() => togglePreference('delayNotificationsEnabled')}
              />
            </div>

            {/* Mensagens Internas */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="font-medium">Mensagens Internas</p>
                  <p className="text-sm text-muted-foreground">Mensagens do caixa/cozinha (KDS)</p>
                </div>
              </div>
              <Switch
                checked={preferences.internalMessagesEnabled}
                onCheckedChange={() => togglePreference('internalMessagesEnabled')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Global Volume */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Volume2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Volume Global</CardTitle>
                <CardDescription>
                  Controle o volume geral de todas as notificações
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Volume2 className="w-5 h-5 text-muted-foreground" />
              <Slider
                value={[globalVolume]}
                onValueChange={(v) => setGlobalVolume(v[0])}
                max={1}
                step={0.1}
                className="flex-1"
              />
              <span className="text-sm font-medium w-12 text-right">
                {Math.round(globalVolume * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Individual Sound Configs */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">Sons de Alerta</CardTitle>
                <CardDescription>
                  Escolha sons diferentes para cada tipo de notificação
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {SOUND_CONFIGS.map((config) => (
              <div key={config.key} className="p-4 bg-muted/50 rounded-lg space-y-4">
                <div className="flex items-center gap-3">
                  {config.icon}
                  <div className="flex-1">
                    <p className="font-medium">{config.label}</p>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Som</Label>
                    <div className="flex gap-2">
                      <Select
                        value={sounds[config.key]}
                        onValueChange={(v) => handleSoundChange(config.key, v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALERT_SOUNDS.map((sound) => (
                            <SelectItem key={sound.id} value={sound.id}>
                              <div className="flex items-center gap-2">
                                <span>{sound.name}</span>
                                <Badge variant="outline" className={`text-[10px] ${getCategoryColor(sound.category)}`}>
                                  {sound.category}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePlaySound(config.key)}
                        title="Testar som"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Volume Individual</Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[volumes[config.key]]}
                        onValueChange={(v) => handleVolumeChange(config.key, v)}
                        max={1}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-10 text-right">
                        {Math.round(volumes[config.key] * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Button onClick={handleSave} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações de Som
            </Button>
          </CardContent>
        </Card>

        {/* Sound Library Preview */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <CardTitle className="font-display text-lg">Biblioteca de Sons</CardTitle>
            <CardDescription>
              Clique para ouvir cada som disponível
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALERT_SOUNDS.map((sound) => (
                <Button
                  key={sound.id}
                  variant="outline"
                  size="sm"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => alertSoundPlayer.play(sound.id, globalVolume)}
                >
                  <span className="text-sm font-medium">{sound.name}</span>
                  <Badge variant="outline" className={`text-[9px] ${getCategoryColor(sound.category)}`}>
                    {sound.category}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
