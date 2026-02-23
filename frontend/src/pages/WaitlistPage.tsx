import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  Plus,
  Clock,
  Phone,
  Bell,
  UserCheck,
  UserX,
  MapPin,
} from 'lucide-react';
import { useWaiterWaitlist, WaitlistEntry } from '@/hooks/useWaiterWaitlist';
import { TableSelectionModal } from '@/components/waitlist/TableSelectionModal';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function WaitlistPage() {
  const {
    entries,
    isLoading,
    availableTables,
    nextSeatable,
    addToWaitlist,
    notifyCustomer,
    seatCustomer,
    cancelEntry,
  } = useWaiterWaitlist();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [tableSelectionOpen, setTableSelectionOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [newEntry, setNewEntry] = useState({
    customer_name: '',
    customer_phone: '',
    party_size: 2,
    special_requests: '',
  });

  const handleAdd = async (e?: React.MouseEvent) => {
    // Prevent any form submission behavior
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log('[WaitlistPage] handleAdd triggered');
    console.log('[WaitlistPage] Form data:', JSON.stringify(newEntry, null, 2));
    
    // Validate before submitting
    const trimmedName = newEntry.customer_name.trim();
    if (!trimmedName) {
      console.error('[WaitlistPage] Validation failed: empty name');
      return;
    }
    
    if (trimmedName.length < 2) {
      console.error('[WaitlistPage] Validation failed: name too short');
      return;
    }
    
    console.log('[WaitlistPage] Calling mutation...');
    
    addToWaitlist.mutate(
      {
        customer_name: trimmedName,
        customer_phone: newEntry.customer_phone.trim() || undefined,
        party_size: newEntry.party_size,
        special_requests: newEntry.special_requests.trim() || undefined,
      },
      {
        onSuccess: () => {
          console.log('[WaitlistPage] Mutation SUCCESS - closing dialog');
          setAddDialogOpen(false);
          setNewEntry({ customer_name: '', customer_phone: '', party_size: 2, special_requests: '' });
        },
        onError: (error) => {
          console.error('[WaitlistPage] Mutation ERROR:', error);
          // Don't close dialog on error - let user see the error and retry
        },
      }
    );
  };

  const handleSeatClick = (entry: WaitlistEntry) => {
    // Always show table selection modal if there are tables
    if (availableTables.length > 0) {
      setSelectedEntry(entry);
      setTableSelectionOpen(true);
    } else {
      // No tables available - show error
      import('sonner').then(({ toast }) => {
        toast.error('Não há mesas disponíveis');
      });
    }
  };

  const handleTableSelect = (table: { id: string; number: number; name: string | null; capacity: number }) => {
    if (!selectedEntry) return;
    seatCustomer.mutate(
      { waitlistId: selectedEntry.id, tableId: table.id },
      {
        onSuccess: () => {
          setTableSelectionOpen(false);
          setSelectedEntry(null);
        },
      }
    );
  };

  const waitingCount = entries.filter((e) => e.status === 'waiting').length;
  const notifiedCount = entries.filter((e) => e.status === 'notified').length;

  return (
    <DashboardLayout title="Fila de Espera">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              {waitingCount} aguardando
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Bell className="h-4 w-4 mr-2" />
              {notifiedCount} chamados
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2 text-emerald-600 border-emerald-500">
              <MapPin className="h-4 w-4 mr-2" />
              {availableTables.length} mesas livres
            </Badge>
          </div>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Adicionar à Fila
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Cliente à Fila</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Nome do Cliente *</Label>
                  <Input
                    id="name"
                    value={newEntry.customer_name}
                    onChange={(e) => setNewEntry((p) => ({ ...p, customer_name: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone (para WhatsApp)</Label>
                  <Input
                    id="phone"
                    value={newEntry.customer_phone}
                    onChange={(e) => setNewEntry((p) => ({ ...p, customer_phone: e.target.value }))}
                    placeholder="(99) 99999-9999"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O cliente receberá notificação quando a mesa estiver pronta
                  </p>
                </div>
                <div>
                  <Label htmlFor="party">Número de Pessoas</Label>
                  <Input
                    id="party"
                    type="number"
                    min={1}
                    max={20}
                    value={newEntry.party_size}
                    onChange={(e) =>
                      setNewEntry((p) => ({ ...p, party_size: parseInt(e.target.value) || 1 }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={newEntry.special_requests}
                    onChange={(e) => setNewEntry((p) => ({ ...p, special_requests: e.target.value }))}
                    placeholder="Preferência de mesa, necessidades especiais..."
                    rows={2}
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  onClick={(e) => handleAdd(e)}
                  disabled={!newEntry.customer_name.trim() || newEntry.customer_name.trim().length < 2 || addToWaitlist.isPending}
                >
                  {addToWaitlist.isPending ? 'Adicionando...' : 'Adicionar à Fila'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Next Seatable Alert */}
        {nextSeatable && (
          <Card className="border-2 border-primary bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    <Bell className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Mesa disponível!</p>
                    <p className="text-muted-foreground">
                      Mesa {nextSeatable.table.number} para{' '}
                      <span className="font-semibold">{nextSeatable.entry.customer_name}</span> (
                      {nextSeatable.entry.party_size} pessoas)
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {nextSeatable.entry.status === 'waiting' && (
                    <Button
                      onClick={() => notifyCustomer.mutate(nextSeatable.entry.id)}
                      disabled={notifyCustomer.isPending}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Chamar
                    </Button>
                  )}
                  {nextSeatable.entry.status === 'notified' && (
                    <Button
                      variant="default"
                      onClick={() => handleSeatClick(nextSeatable.entry)}
                      disabled={seatCustomer.isPending}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Acomodar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Queue Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Carregando...
            </div>
          )}

          {!isLoading && entries.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground">Nenhum cliente na fila</p>
              <p className="text-sm text-muted-foreground mt-2">
                Adicione clientes clicando no botão acima
              </p>
            </div>
          )}

          {entries.map((entry, idx) => (
            <WaitlistCard
              key={entry.id}
              entry={entry}
              position={idx + 1}
              onNotify={() => notifyCustomer.mutate(entry.id)}
              onSeat={() => handleSeatClick(entry)}
              onCancel={(noShow) => cancelEntry.mutate({ id: entry.id, noShow })}
              isNotifying={notifyCustomer.isPending}
              isSeating={seatCustomer.isPending}
            />
          ))}
        </div>

        {/* Available Tables */}
        {availableTables.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Mesas Disponíveis ({availableTables.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {availableTables.map((table) => (
                  <Badge key={table.id} variant="outline" className="text-lg px-4 py-2">
                    Mesa {table.number}
                    {table.name && <span className="text-muted-foreground ml-1">({table.name})</span>}
                    <span className="ml-2 text-xs text-muted-foreground">{table.capacity} lugares</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Table Selection Modal */}
      {selectedEntry && (
        <TableSelectionModal
          open={tableSelectionOpen}
          onOpenChange={setTableSelectionOpen}
          tables={availableTables}
          customerName={selectedEntry.customer_name}
          partySize={selectedEntry.party_size}
          onSelectTable={handleTableSelect}
          isLoading={seatCustomer.isPending}
        />
      )}
    </DashboardLayout>
  );
}

interface WaitlistCardProps {
  entry: WaitlistEntry;
  position: number;
  onNotify: () => void;
  onSeat: () => void;
  onCancel: (noShow: boolean) => void;
  isNotifying: boolean;
  isSeating: boolean;
}

function WaitlistCard({
  entry,
  position,
  onNotify,
  onSeat,
  onCancel,
  isNotifying,
  isSeating,
}: WaitlistCardProps) {
  const isNotified = entry.status === 'notified';

  return (
    <Card className={`transition-all ${isNotified ? 'border-primary border-2 bg-primary/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Position */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
              isNotified ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            {position}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg truncate">{entry.customer_name}</span>
              {isNotified && (
                <Badge variant="default">
                  <Bell className="h-3 w-3 mr-1" />
                  Chamado
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {entry.party_size} pessoas
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDistanceToNow(new Date(entry.requested_at), {
                  addSuffix: false,
                  locale: ptBR,
                })}
              </span>
            </div>

            {entry.customer_phone && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {entry.customer_phone}
              </p>
            )}

            {entry.special_requests && (
              <p className="text-sm text-muted-foreground mt-1 italic">
                {entry.special_requests}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          {!isNotified && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onNotify}
              disabled={isNotifying}
            >
              <Bell className="h-4 w-4 mr-1" />
              Chamar
            </Button>
          )}
          {isNotified && (
            <Button
              size="sm"
              className="flex-1"
              onClick={onSeat}
              disabled={isSeating}
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Acomodar
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCancel(isNotified)}
            title={isNotified ? 'Não compareceu' : 'Remover da fila'}
          >
            <UserX className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
