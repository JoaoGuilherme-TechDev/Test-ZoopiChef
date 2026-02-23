import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CalendarDays, 
  Clock, 
  Users, 
  Plus, 
  Check, 
  X, 
  AlertTriangle,
  Phone,
  Settings,
  ListOrdered,
  CalendarOff
} from 'lucide-react';
import { useReservations, useWaitlist, useReservationSettings } from '@/hooks/useReservations';
import { ReservationDialog } from '@/components/reservations/ReservationDialog';
import { ReservationCard } from '@/components/reservations/ReservationCard';
import { WaitlistCard } from '@/components/reservations/WaitlistCard';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Reservations() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any>(null);

  const { 
    reservations, 
    todayReservations, 
    stats, 
    isLoading,
    confirmReservation,
    cancelReservation,
    markNoShow,
    completeReservation,
    deleteReservation,
  } = useReservations({ 
    start: startOfDay(selectedDate), 
    end: addDays(startOfDay(selectedDate), 1) 
  });

  const { waitlist } = useWaitlist();
  const { settings } = useReservationSettings();

  const selectedDateReservations = reservations.filter(
    r => r.reservation_date === format(selectedDate, 'yyyy-MM-dd')
  );

  // Agrupar por status
  const pendingReservations = selectedDateReservations.filter(r => r.status === 'pending');
  const confirmedReservations = selectedDateReservations.filter(r => r.status === 'confirmed');
  const completedReservations = selectedDateReservations.filter(r => r.status === 'completed');
  const otherReservations = selectedDateReservations.filter(r => 
    r.status === 'cancelled' || r.status === 'no_show'
  );

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      confirmed: { label: 'Confirmada', variant: 'default' },
      completed: { label: 'Concluída', variant: 'outline' },
      cancelled: { label: 'Cancelada', variant: 'destructive' },
      no_show: { label: 'Não compareceu', variant: 'destructive' },
    };
    return config[status] || { label: status, variant: 'secondary' };
  };

  const handleEdit = (reservation: any) => {
    setEditingReservation(reservation);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingReservation(null);
  };

  if (!settings?.enabled) {
    return (
      <DashboardLayout title="Reservas">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarOff className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Reservas Desativadas</h2>
            <p className="text-muted-foreground text-center mb-4">
              O módulo de reservas está desativado. Ative nas configurações para começar a receber reservas.
            </p>
            <Button asChild>
              <Link to="/settings/reservations">
                <Settings className="h-4 w-4 mr-2" />
                Configurar Reservas
              </Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Reservas">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.confirmed}</p>
                  <p className="text-xs text-muted-foreground">Confirmadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">Concluídas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.noShow}</p>
                  <p className="text-xs text-muted-foreground">No-show</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-[300px_1fr] gap-6">
          {/* Calendar Sidebar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Calendário</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                className="rounded-md border"
              />

              <div className="mt-4 space-y-2">
                <Button 
                  className="w-full" 
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Reserva
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/settings/reservations">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reservations List */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </CardTitle>
                    <CardDescription>
                      {selectedDateReservations.length} reserva(s) para este dia
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">
                      Todas ({selectedDateReservations.length})
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                      Pendentes ({pendingReservations.length})
                    </TabsTrigger>
                    <TabsTrigger value="confirmed">
                      Confirmadas ({confirmedReservations.length})
                    </TabsTrigger>
                    <TabsTrigger value="waitlist">
                      Lista de Espera ({waitlist.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-4 space-y-3">
                    {isLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </div>
                    ) : selectedDateReservations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma reserva para este dia</p>
                        <Button 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Criar Reserva
                        </Button>
                      </div>
                    ) : (
                      selectedDateReservations.map((reservation) => (
                        <ReservationCard
                          key={reservation.id}
                          reservation={reservation}
                          onEdit={() => handleEdit(reservation)}
                          onConfirm={() => confirmReservation.mutate(reservation.id)}
                          onCancel={(reason) => cancelReservation.mutate({ id: reservation.id, reason })}
                          onNoShow={() => markNoShow.mutate(reservation.id)}
                          onComplete={() => completeReservation.mutate(reservation.id)}
                          onDelete={() => deleteReservation.mutate(reservation.id)}
                        />
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="pending" className="mt-4 space-y-3">
                    {pendingReservations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhuma reserva pendente
                      </div>
                    ) : (
                      pendingReservations.map((reservation) => (
                        <ReservationCard
                          key={reservation.id}
                          reservation={reservation}
                          onEdit={() => handleEdit(reservation)}
                          onConfirm={() => confirmReservation.mutate(reservation.id)}
                          onCancel={(reason) => cancelReservation.mutate({ id: reservation.id, reason })}
                          onNoShow={() => markNoShow.mutate(reservation.id)}
                          onComplete={() => completeReservation.mutate(reservation.id)}
                          onDelete={() => deleteReservation.mutate(reservation.id)}
                        />
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="confirmed" className="mt-4 space-y-3">
                    {confirmedReservations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhuma reserva confirmada
                      </div>
                    ) : (
                      confirmedReservations.map((reservation) => (
                        <ReservationCard
                          key={reservation.id}
                          reservation={reservation}
                          onEdit={() => handleEdit(reservation)}
                          onConfirm={() => confirmReservation.mutate(reservation.id)}
                          onCancel={(reason) => cancelReservation.mutate({ id: reservation.id, reason })}
                          onNoShow={() => markNoShow.mutate(reservation.id)}
                          onComplete={() => completeReservation.mutate(reservation.id)}
                          onDelete={() => deleteReservation.mutate(reservation.id)}
                        />
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="waitlist" className="mt-4 space-y-3">
                    {waitlist.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ListOrdered className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Lista de espera vazia</p>
                      </div>
                    ) : (
                      waitlist.map((entry) => (
                        <WaitlistCard key={entry.id} entry={entry} />
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog for creating/editing reservation */}
      <ReservationDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        reservation={editingReservation}
        selectedDate={selectedDate}
      />
    </DashboardLayout>
  );
}
