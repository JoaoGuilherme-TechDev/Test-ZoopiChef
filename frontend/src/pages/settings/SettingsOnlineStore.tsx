import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Store, Clock, Plus, Trash2, AlertCircle, Check, X, Timer,
  Minus, History, RefreshCw
} from 'lucide-react';
import { useOnlineStoreSettings, OnlineStoreHour } from '@/hooks/useOnlineStoreSettings';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ETA_ADJUSTMENTS = [-15, -10, -5, 0, 5, 10, 15, 20, 30];

export default function SettingsOnlineStore() {
  const {
    settings,
    hours,
    events,
    status,
    isLoading,
    toggleOpen,
    toggleOverride,
    updateEtaAdjust,
    addHour,
    updateHour,
    deleteHour,
    weekdayNames,
  } = useOnlineStoreSettings();

  const [newHour, setNewHour] = useState<Partial<OnlineStoreHour>>({
    weekday: 1,
    start_time: '11:00',
    end_time: '23:00',
    active: true,
  });

  const handleAddHour = async () => {
    if (!newHour.weekday === undefined || !newHour.start_time || !newHour.end_time) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (newHour.start_time >= newHour.end_time) {
      toast.error('Horário de início deve ser menor que o de fim');
      return;
    }

    await addHour.mutateAsync({
      weekday: newHour.weekday!,
      start_time: newHour.start_time!,
      end_time: newHour.end_time!,
      active: true,
    });

    setNewHour({
      weekday: 1,
      start_time: '11:00',
      end_time: '23:00',
      active: true,
    });
  };

  const formatEventType = (type: string) => {
    const types: Record<string, string> = {
      manual_open: 'Abriu manualmente',
      manual_close: 'Fechou manualmente',
      override_on: 'Ativou override manual',
      override_off: 'Desativou override manual',
      eta_adjust: 'Ajustou ETA',
    };
    return types[type] || type;
  };

  const formatNextOpen = (dateStr: string | null) => {
    if (!dateStr) return 'Não programado';
    try {
      return format(parseISO(dateStr), "EEEE 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const isOpen = settings?.manual_override 
    ? settings.is_online_open 
    : status?.allowed_to_order || false;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Loja Online</h1>
          <p className="text-muted-foreground">
            Controle quando seu cardápio aceita pedidos online
          </p>
        </div>

        {/* Status atual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Status Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-lg font-semibold">
                  Loja {isOpen ? 'ABERTA' : 'FECHADA'}
                </span>
                {settings?.manual_override && (
                  <Badge variant="outline">Override Manual</Badge>
                )}
              </div>
              <Badge variant={isOpen ? 'default' : 'destructive'} className="text-lg px-4 py-1">
                {isOpen ? 'Recebendo Pedidos' : 'Pedidos Bloqueados'}
              </Badge>
            </div>

            {!isOpen && status?.next_open_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Próxima abertura: {formatNextOpen(status.next_open_at)}</span>
              </div>
            )}

            <Separator />

            {/* Controle Manual */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Override Manual</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativo, ignora os horários programados
                  </p>
                </div>
                <Switch
                  checked={settings?.manual_override || false}
                  onCheckedChange={(checked) => toggleOverride.mutate(checked)}
                  disabled={toggleOverride.isPending}
                />
              </div>

              {settings?.manual_override && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => toggleOpen.mutate(true)}
                    disabled={settings.is_online_open || toggleOpen.isPending}
                    className="flex-1"
                    variant={settings.is_online_open ? 'default' : 'outline'}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Abrir Loja
                  </Button>
                  <Button
                    onClick={() => toggleOpen.mutate(false)}
                    disabled={!settings.is_online_open || toggleOpen.isPending}
                    className="flex-1"
                    variant={!settings.is_online_open ? 'destructive' : 'outline'}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Fechar Loja
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ajuste de ETA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Ajuste de ETA (Tempo de Entrega)
            </CardTitle>
            <CardDescription>
              Ajuste rápido para dias de alta/baixa demanda. Não altera configurações por bairro/km.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold">
                  {(settings?.eta_adjust_minutes || 0) > 0 ? '+' : ''}
                  {settings?.eta_adjust_minutes || 0} min
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {settings?.eta_adjust_minutes === 0 
                    ? 'Sem ajuste' 
                    : settings?.eta_adjust_minutes > 0 
                      ? 'Adicionando tempo extra' 
                      : 'Reduzindo tempo'}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {ETA_ADJUSTMENTS.map((adj) => (
                  <Button
                    key={adj}
                    variant={settings?.eta_adjust_minutes === adj ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateEtaAdjust.mutate(adj)}
                    disabled={updateEtaAdjust.isPending}
                    className="min-w-[60px]"
                  >
                    {adj > 0 ? `+${adj}` : adj === 0 ? '0' : adj}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Horários Programados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horários de Funcionamento
            </CardTitle>
            <CardDescription>
              Configure os horários em que a loja online aceita pedidos automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Adicionar novo horário */}
            <div className="flex flex-wrap gap-2 items-end p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <Label className="text-xs">Dia</Label>
                <Select
                  value={String(newHour.weekday)}
                  onValueChange={(v) => setNewHour({ ...newHour, weekday: parseInt(v) })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weekdayNames.map((name, i) => (
                      <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Início</Label>
                <Input
                  type="time"
                  value={newHour.start_time}
                  onChange={(e) => setNewHour({ ...newHour, start_time: e.target.value })}
                  className="w-28"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Fim</Label>
                <Input
                  type="time"
                  value={newHour.end_time}
                  onChange={(e) => setNewHour({ ...newHour, end_time: e.target.value })}
                  className="w-28"
                />
              </div>

              <Button onClick={handleAddHour} disabled={addHour.isPending}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {/* Lista de horários por dia */}
            <div className="space-y-2">
              {weekdayNames.map((dayName, dayIndex) => {
                const dayHours = hours.filter((h) => h.weekday === dayIndex);
                
                return (
                  <div key={dayIndex} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-24 font-medium">{dayName}</div>
                    <div className="flex-1">
                      {dayHours.length === 0 ? (
                        <span className="text-sm text-muted-foreground">Fechado</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {dayHours.map((h) => (
                            <div
                              key={h.id}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                                h.active 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              <span>{h.start_time.slice(0, 5)} - {h.end_time.slice(0, 5)}</span>
                              <button
                                onClick={() => updateHour.mutate({ id: h.id, active: !h.active })}
                                className="hover:opacity-70"
                              >
                                {h.active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              </button>
                              <button
                                onClick={() => deleteHour.mutate(h.id)}
                                className="hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Eventos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Alterações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma alteração registrada ainda
                </p>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 p-2 border-b last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{formatEventType(event.event_type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {event.new_value && (
                        <Badge variant="outline" className="text-xs">
                          {JSON.stringify(event.new_value)}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
