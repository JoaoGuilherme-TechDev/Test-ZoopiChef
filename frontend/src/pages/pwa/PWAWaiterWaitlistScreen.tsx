/**
 * PWAWaiterWaitlistScreen - Dedicated waitlist screen for Waiter PWA
 * 
 * Uses WaiterPWALayout for session management (no need for individual WaiterSessionProvider).
 * Route: /:slug/garcom/fila
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useWaiterLayoutSession } from '@/layouts/WaiterPWALayout';
import { usePWAWaiterWaitlistWithCompany, PWAWaitlistEntry } from '@/hooks/usePWAWaiterHooks';
import { TableSelectionModal } from '@/components/waitlist/TableSelectionModal';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function PWAWaiterWaitlistContent() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  // Use layout session - already validated by WaiterPWALayout
  const { companyId, refresh } = useWaiterLayoutSession();
  const {
    entries,
    isLoading: waitlistLoading,
    availableTables,
    addToWaitlist,
    notifyCustomer,
    seatCustomer,
    cancelEntry,
  } = usePWAWaiterWaitlistWithCompany(companyId);

  const isLoading = waitlistLoading;

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PWAWaitlistEntry | null>(null);
  const [newEntry, setNewEntry] = useState({
    customer_name: '',
    customer_phone: '',
    party_size: 2,
    special_requests: '',
  });

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando fila de espera...</p>
        </div>
      </div>
    );
  }

  const handleAdd = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    const trimmedName = newEntry.customer_name.trim();
    if (!trimmedName || trimmedName.length < 2) return;
    
    addToWaitlist.mutate(
      {
        customer_name: trimmedName,
        customer_phone: newEntry.customer_phone.trim() || undefined,
        party_size: newEntry.party_size,
        special_requests: newEntry.special_requests.trim() || undefined,
      },
      {
        onSuccess: () => {
          setAddDialogOpen(false);
          setNewEntry({ customer_name: '', customer_phone: '', party_size: 2, special_requests: '' });
        },
      }
    );
  };

  const handleSeatClick = (entry: PWAWaitlistEntry) => {
    if (availableTables.length > 0) {
      setSelectedEntry(entry);
      setTableModalOpen(true);
    } else {
      import('sonner').then(({ toast }) => {
        toast.error('Não há mesas disponíveis');
      });
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

  const waitingCount = entries.filter((e) => e.status === 'waiting').length;
  const notifiedCount = entries.filter((e) => e.status === 'notified').length;

  // Find next entry that can be seated
  const nextSeatable = (() => {
    for (const entry of entries) {
      if (entry.status === 'waiting' || entry.status === 'notified') {
        const matchingTable = availableTables.find(t => t.capacity >= entry.party_size);
        if (matchingTable) {
          return { entry, table: matchingTable };
        }
      }
    }
    return null;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/${slug}/garcom/app`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                Fila de Espera
              </h1>
              <p className="text-xs text-muted-foreground">
                {entries.length} na fila
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refresh()}
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          <Badge variant="outline" className="whitespace-nowrap">
            <Clock className="h-3 w-3 mr-1" />
            {waitingCount} aguardando
          </Badge>
          <Badge variant="secondary" className="whitespace-nowrap">
            <Bell className="h-3 w-3 mr-1" />
            {notifiedCount} chamados
          </Badge>
          <Badge variant="outline" className="ml-auto text-emerald-600 border-emerald-500 whitespace-nowrap">
            {availableTables.length} mesas livres
          </Badge>
        </div>
      </div>

      {/* Next Seatable Alert */}
      {nextSeatable && (
        <div className="mx-4 mt-4 p-4 rounded-xl border-2 border-primary bg-primary/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Mesa disponível!</p>
              <p className="text-sm text-muted-foreground">
                Mesa {nextSeatable.table.number} para{' '}
                <span className="font-semibold">{nextSeatable.entry.customer_name}</span>{' '}
                ({nextSeatable.entry.party_size} pessoas)
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
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
              {nextSeatable.entry.status === 'notified' && (
                <Button
                  size="sm"
                  onClick={() => handleSeatClick(nextSeatable.entry)}
                  disabled={seatCustomer.isPending}
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Sentar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Queue List */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-3">
          {entries.length === 0 && (
            <div className="text-center py-16">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhum cliente na fila</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione clientes usando o botão abaixo
              </p>
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

      {/* Add Button (Fixed Bottom) */}
      <div className="sticky bottom-0 p-4 border-t bg-background/95 backdrop-blur">
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-14 text-lg" size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Adicionar à Fila
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
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
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="phone">WhatsApp (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newEntry.customer_phone}
                  onChange={(e) => setNewEntry((p) => ({ ...p, customer_phone: e.target.value }))}
                  placeholder="(99) 99999-9999"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recebe notificação quando a mesa estiver pronta
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
                className="w-full h-12"
                onClick={(e) => handleAdd(e)}
                disabled={
                  !newEntry.customer_name.trim() ||
                  newEntry.customer_name.trim().length < 2 ||
                  addToWaitlist.isPending
                }
              >
                {addToWaitlist.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  'Adicionar à Fila'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table Selection Modal */}
      <TableSelectionModal
        open={tableModalOpen}
        onOpenChange={setTableModalOpen}
        tables={availableTables.map(t => ({
          id: t.id,
          number: t.number,
          name: t.name,
          capacity: t.capacity,
        }))}
        customerName={selectedEntry?.customer_name || ''}
        partySize={selectedEntry?.party_size || 2}
        onSelectTable={(table) => handleTableSelected(table.id)}
        isLoading={seatCustomer.isPending}
      />
    </div>
  );
}

interface WaitlistEntryCardProps {
  entry: PWAWaitlistEntry;
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
      className={`transition-all ${
        isNotified ? 'border-primary border-2 bg-primary/5' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Position */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
              isNotified ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            {position}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-lg truncate">{entry.customer_name}</span>
              {isNotified && (
                <Badge variant="default" className="text-xs shrink-0">
                  <Bell className="h-3 w-3 mr-1" />
                  Chamado
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
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
              <a
                href={`tel:${entry.customer_phone}`}
                className="flex items-center gap-1 text-sm text-primary mt-1"
              >
                <Phone className="h-4 w-4" />
                {entry.customer_phone}
              </a>
            )}

            {entry.special_requests && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                {entry.special_requests}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t">
          {!isNotified && (
            <Button
              className="flex-1"
              variant="outline"
              onClick={onNotify}
              disabled={isNotifying}
            >
              <Bell className="h-4 w-4 mr-2" />
              Chamar
            </Button>
          )}
          {isNotified && (
            <Button
              className="flex-1"
              onClick={onSeat}
              disabled={isSeating}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Sentar
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCancel(isNotified)}
            title={isNotified ? 'Não compareceu' : 'Remover'}
          >
            <UserX className="h-5 w-5 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PWAWaiterWaitlistScreen() {
  return <PWAWaiterWaitlistContent />;
}
