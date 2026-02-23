import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Plus, UserCheck, UserX, MapPin } from "lucide-react";
import { useSmartWaitlistSettings, useWaitlist, WaitlistEntry } from "@/hooks/useSmartWaitlist";
import { useTables } from "@/hooks/useTables";
import { useTodayTableReservations } from "@/hooks/useTableReservations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TableSelectionModal } from "@/components/waitlist/TableSelectionModal";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { toast } from "sonner";

export default function SmartWaitlistPage() {
  const { settings, isLoading, updateSettings } = useSmartWaitlistSettings();
  const { entries, addToWaitlist, seatCustomer, removeFromWaitlist } = useWaitlist();
  const { tables } = useTables();
  const { hasReservation } = useTodayTableReservations();
  
  const [newEntry, setNewEntry] = useState({ customer_name: '', customer_phone: '', party_size: 2 });
  const [open, setOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);

  // Get available tables (status = 'available', active, and NOT reserved)
  const availableTables = tables
    .filter(t => t.active && t.status === 'available' && !hasReservation(t.id))
    .map(t => ({
      id: t.id,
      number: t.number,
      name: t.name,
      capacity: (t as any).capacity || 4,
    }));

  const handleAdd = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    const trimmedName = newEntry.customer_name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return;
    }
    
    addToWaitlist.mutate(
      {
        customer_name: trimmedName,
        customer_phone: newEntry.customer_phone.trim() || undefined,
        party_size: newEntry.party_size,
      },
      { 
        onSuccess: () => { 
          setOpen(false); 
          setNewEntry({ customer_name: '', customer_phone: '', party_size: 2 }); 
        },
      }
    );
  };

  const handleSeatClick = (entry: WaitlistEntry) => {
    if (availableTables.length > 0) {
      setSelectedEntry(entry);
      setTableModalOpen(true);
    } else {
      toast.error('Não há mesas disponíveis');
    }
  };

  const handleTableSelect = (table: { id: string; number: number; name: string | null; capacity: number }) => {
    if (!selectedEntry) return;
    seatCustomer.mutate(
      { id: selectedEntry.id, tableId: table.id },
      {
        onSuccess: () => {
          setTableModalOpen(false);
          setSelectedEntry(null);
        },
      }
    );
  };

  if (isLoading) return <DashboardLayout title="Fila Inteligente"><div className="p-8 text-center">Carregando...</div></DashboardLayout>;

  return (
    <DashboardLayout title="Lista de Espera Inteligente">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Clock className="w-8 h-8" />Lista de Espera Inteligente</h1>
            <p className="text-muted-foreground">Previsão de tempo e notificações automáticas</p>
          </div>
          <div className="flex gap-4 items-center">
            <Badge variant="outline" className="text-emerald-600 border-emerald-500 px-3 py-1">
              <MapPin className="h-4 w-4 mr-1" />
              {availableTables.length} mesas livres
            </Badge>
            <Switch checked={settings?.enabled || false} onCheckedChange={(enabled) => updateSettings.mutate({ enabled })} />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Adicionar</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar à Lista</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Nome</Label><Input value={newEntry.customer_name} onChange={(e) => setNewEntry(p => ({ ...p, customer_name: e.target.value }))} /></div>
                  <div><Label>Telefone</Label><Input value={newEntry.customer_phone} onChange={(e) => setNewEntry(p => ({ ...p, customer_phone: e.target.value }))} /></div>
                  <div><Label>Pessoas</Label><Input type="number" value={newEntry.party_size} onChange={(e) => setNewEntry(p => ({ ...p, party_size: parseInt(e.target.value) }))} /></div>
                  <Button type="button" onClick={(e) => handleAdd(e)} className="w-full" disabled={!newEntry.customer_name.trim() || newEntry.customer_name.trim().length < 2 || addToWaitlist.isPending}>
                    {addToWaitlist.isPending ? 'Adicionando...' : 'Adicionar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4">
          {entries?.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum cliente na fila</CardContent></Card>}
          {entries?.map((entry, idx) => (
            <Card key={entry.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold">{idx + 1}</div>
                  <div>
                    <div className="font-semibold">{entry.customer_name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2"><Users className="w-3 h-3" />{entry.party_size} pessoas</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {entry.estimated_wait_minutes && <Badge variant="outline">{entry.estimated_wait_minutes} min</Badge>}
                  <Badge>{entry.status}</Badge>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleSeatClick(entry)}
                    disabled={availableTables.length === 0 || seatCustomer.isPending}
                    title={availableTables.length === 0 ? 'Sem mesas disponíveis' : 'Selecionar mesa'}
                  >
                    <UserCheck className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeFromWaitlist.mutate({ id: entry.id, noShow: true })}><UserX className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Table Selection Modal */}
      {selectedEntry && (
        <TableSelectionModal
          open={tableModalOpen}
          onOpenChange={setTableModalOpen}
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
