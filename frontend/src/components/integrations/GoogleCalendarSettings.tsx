import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useGoogleCalendarIntegration } from '@/hooks/useGoogleCalendarIntegration';
import { Calendar, RefreshCw, Trash2, Link, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function GoogleCalendarSettings() {
  const {
    integration,
    syncEvents,
    isLoading,
    createIntegration,
    updateIntegration,
    deleteIntegration,
  } = useGoogleCalendarIntegration();

  const [calendarId, setCalendarId] = useState('');

  const handleConnect = async () => {
    if (!calendarId.trim()) {
      toast.error('Preencha o ID do calendário');
      return;
    }

    try {
      await createIntegration.mutateAsync({
        calendar_id: calendarId,
      });
      toast.success('Calendário conectado!');
      setCalendarId('');
    } catch (error) {
      toast.error('Erro ao conectar calendário');
    }
  };

  const handleDisconnect = async () => {
    if (!integration) return;

    try {
      await deleteIntegration.mutateAsync(integration.id);
      toast.success('Calendário desconectado');
    } catch (error) {
      toast.error('Erro ao desconectar');
    }
  };

  const handleToggleReservations = async (enabled: boolean) => {
    if (!integration) return;

    try {
      await updateIntegration.mutateAsync({
        id: integration.id,
        sync_reservations: enabled,
      });
      toast.success(enabled ? 'Sincronização de reservas ativada' : 'Sincronização de reservas pausada');
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const handleToggleScheduledOrders = async (enabled: boolean) => {
    if (!integration) return;

    try {
      await updateIntegration.mutateAsync({
        id: integration.id,
        sync_scheduled_orders: enabled,
      });
      toast.success(enabled ? 'Sincronização de pedidos agendados ativada' : 'Sincronização pausada');
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Sincronize reservas automaticamente com o Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integration ? (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Calendário Conectado</p>
                    <p className="text-sm text-muted-foreground">{integration.calendar_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={integration.sync_reservations ? 'default' : 'secondary'}>
                    {integration.sync_reservations ? 'Ativo' : 'Pausado'}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={handleDisconnect}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Sincronizar Reservas</Label>
                  <p className="text-sm text-muted-foreground">
                    Sincronizar reservas automaticamente
                  </p>
                </div>
                <Switch
                  checked={integration.sync_reservations}
                  onCheckedChange={handleToggleReservations}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Sincronizar Pedidos Agendados</Label>
                  <p className="text-sm text-muted-foreground">
                    Sincronizar pedidos agendados automaticamente
                  </p>
                </div>
                <Switch
                  checked={integration.sync_scheduled_orders}
                  onCheckedChange={handleToggleScheduledOrders}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Última sincronização</Label>
                  <p className="text-sm text-muted-foreground">
                    {integration.last_sync_at
                      ? format(new Date(integration.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : 'Nunca sincronizado'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="calendarId">ID do Calendário</Label>
                <Input
                  id="calendarId"
                  placeholder="exemplo@gmail.com ou ID do calendário"
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use seu email do Google ou o ID do calendário específico
                </p>
              </div>

              <Button onClick={handleConnect} disabled={createIntegration.isPending} className="w-full">
                <Link className="h-4 w-4 mr-2" />
                Conectar Calendário
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {integration && syncEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eventos Sincronizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {syncEvents.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{event.entity_type === 'reservation' ? 'Reserva' : 'Pedido Agendado'}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.last_synced_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.sync_status === 'synced' && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sincronizado
                      </Badge>
                    )}
                    {event.sync_status === 'pending' && (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                    {event.sync_status === 'failed' && (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Falhou
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
