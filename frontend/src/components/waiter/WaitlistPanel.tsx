import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  Plus,
  Clock,
  Phone,
  Bell,
  UserCheck,
  UserX,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { useWaiterWaitlist, WaitlistEntry } from '@/hooks/useWaiterWaitlist';
import { TableSelectionModal } from '@/components/waitlist/TableSelectionModal';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function WaitlistPanel() {
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
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [newEntry, setNewEntry] = useState({
    customer_name: '',
    customer_phone: '',
    party_size: 2,
    special_requests: '',
  });

  const handleSeatClick = (entry: WaitlistEntry) => {
    if (availableTables.length > 0) {
      setSelectedEntry(entry);
      setTableModalOpen(true);
    }
  };

  const handleTableSelected = (tableId: string) => {
    if (selectedEntry) {
      seatCustomer.mutate(
        { waitlistId: selectedEntry.id, tableId },
        {
          onSuccess: () => {
            setTableModalOpen(false);
            setSelectedEntry(null);
          },
        }
      );
    }
  };

  const handleAdd = async (e?: React.MouseEvent) => {
    // Prevent any form submission behavior
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log('[WaitlistPanel] handleAdd triggered');
    console.log('[WaitlistPanel] Form data:', JSON.stringify(newEntry, null, 2));
    
    // Validate before submitting
    const trimmedName = newEntry.customer_name.trim();
    if (!trimmedName) {
      console.error('[WaitlistPanel] Validation failed: empty name');
      return;
    }
    
    if (trimmedName.length < 2) {
      console.error('[WaitlistPanel] Validation failed: name too short');
      return;
    }
    
    console.log('[WaitlistPanel] Calling mutation...');
    
    addToWaitlist.mutate(
      {
        customer_name: trimmedName,
        customer_phone: newEntry.customer_phone.trim() || undefined,
        party_size: newEntry.party_size,
        special_requests: newEntry.special_requests.trim() || undefined,
      },
      {
        onSuccess: () => {
          console.log('[WaitlistPanel] Mutation SUCCESS - closing dialog');
          setAddDialogOpen(false);
          setNewEntry({ customer_name: '', customer_phone: '', party_size: 2, special_requests: '' });
        },
        onError: (error) => {
          console.error('[WaitlistPanel] Mutation ERROR:', error);
          // Don't close dialog on error - let user see the error and retry
        },
      }
    );
  };

  const waitingCount = entries.filter((e) => e.status === 'waiting').length;
  const notifiedCount = entries.filter((e) => e.status === 'notified').length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Users className="h-4 w-4 mr-2" />
          Fila
          {entries.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {entries.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Espera
          </SheetTitle>
        </SheetHeader>

        {/* Stats Bar */}
        <div className="flex gap-2 p-4 border-b bg-muted/30">
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            {waitingCount} aguardando
          </Badge>
          <Badge variant="secondary">
            <Bell className="h-3 w-3 mr-1" />
            {notifiedCount} notificados
          </Badge>
          <Badge variant="outline" className="ml-auto text-emerald-600 border-emerald-500">
            {availableTables.length} mesas livres
          </Badge>
        </div>

        {/* Next Seatable Alert */}
        {nextSeatable && (
          <div className="mx-4 mt-4 p-3 rounded-lg border-2 border-primary bg-primary/10">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Mesa disponível!</p>
                <p className="text-xs text-muted-foreground">
                  Mesa {nextSeatable.table.number} para{' '}
                  <span className="font-semibold">{nextSeatable.entry.customer_name}</span> (
                  {nextSeatable.entry.party_size} pessoas)
                </p>
              </div>
              {nextSeatable.entry.status === 'waiting' && (
                <Button
                  size="sm"
                  onClick={() => notifyCustomer.mutate(nextSeatable.entry.id)}
                  disabled={notifyCustomer.isPending}
                >
                  <Bell className="h-4 w-4 mr-1" />
                  Chamar
                </Button>
              )}
              {nextSeatable.entry.status === 'notified' && availableTables.length > 0 && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => seatCustomer.mutate({ waitlistId: nextSeatable.entry.id, tableId: nextSeatable.table.id })}
                  disabled={seatCustomer.isPending}
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Mesa {nextSeatable.table.number}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Queue List */}
        <ScrollArea className="flex-1 h-[calc(100vh-280px)]">
          <div className="p-4 space-y-3">
            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            )}

            {!isLoading && entries.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum cliente na fila</p>
              </div>
            )}

            {entries.map((entry, idx) => (
              <WaitlistEntryCard
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
        </ScrollArea>

        {/* Add Button */}
        <div className="p-4 border-t">
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
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
                  <Label htmlFor="phone">Telefone (opcional)</Label>
                  <Input
                    id="phone"
                    value={newEntry.customer_phone}
                    onChange={(e) => setNewEntry((p) => ({ ...p, customer_phone: e.target.value }))}
                    placeholder="(99) 99999-9999"
                  />
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

        {/* Table Selection Modal */}
        {selectedEntry && (
          <TableSelectionModal
            open={tableModalOpen}
            onOpenChange={setTableModalOpen}
            tables={availableTables.map(t => ({
              id: t.id,
              number: t.number,
              name: t.name,
              capacity: t.capacity,
            }))}
            customerName={selectedEntry.customer_name}
            partySize={selectedEntry.party_size}
            onSelectTable={(table) => handleTableSelected(table.id)}
            isLoading={seatCustomer.isPending}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface WaitlistEntryCardProps {
  entry: WaitlistEntry;
  position: number;
  onNotify: () => void;
  onSeat: () => void;
  onCancel: (noShow: boolean) => void;
  isNotifying: boolean;
  isSeating: boolean;
}

function WaitlistEntryCard({
  entry,
  position,
  onNotify,
  onSeat,
  onCancel,
  isNotifying,
  isSeating,
}: WaitlistEntryCardProps) {
  const isNotified = entry.status === 'notified';

  return (
    <Card
      className={`p-3 transition-all ${
        isNotified ? 'border-primary bg-primary/5' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Position */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isNotified ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}
        >
          {position}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{entry.customer_name}</span>
            {isNotified && (
              <Badge variant="default" className="text-xs">
                <Bell className="h-3 w-3 mr-1" />
                Chamado
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {entry.party_size} pessoas
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(entry.requested_at), {
                addSuffix: false,
                locale: ptBR,
              })}
            </span>
            {entry.customer_phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {entry.customer_phone}
              </span>
            )}
          </div>

          {entry.special_requests && (
            <p className="text-xs text-muted-foreground mt-1 italic truncate">
              {entry.special_requests}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {!isNotified && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onNotify}
              disabled={isNotifying}
              title="Chamar cliente"
            >
              <Bell className="h-4 w-4" />
            </Button>
          )}
          {isNotified && (
            <Button
              size="icon"
              variant="default"
              onClick={onSeat}
              disabled={isSeating}
              title="Acomodar cliente"
            >
              <UserCheck className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onCancel(isNotified)}
            title={isNotified ? 'Não compareceu' : 'Remover da fila'}
          >
            <UserX className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
