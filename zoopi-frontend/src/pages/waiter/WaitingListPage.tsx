// ================================================================
// FILE: waiter/WaitingListPage.tsx
// ================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AvailableTable, WaitlistEntry } from "@/modules/waiter/types";
import { waitlistApi } from "@/modules/waiter/api";
import { PageHeader } from "@/modules/waiter/components/shared/PageHeader";
import { NextSeatableAlert } from "@/modules/waiter/components/waiting-list/NextSeatableAlert";
import { WaitlistCard } from "@/modules/waiter/components/waiting-list/WaitlistCard";
import { AddClientModal } from "@/modules/waiter/components/waiting-list/AddClientModa";
import { TableSelectionModal } from "@/modules/waiter/components/waiting-list/TableSelectionModal";




export default function WaitingListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tableSelectionOpen, setTableSelectionOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Query ─────────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["waitlist"],
    queryFn: waitlistApi.fetchActive,
    refetchInterval: 15000,
  });

  const entries = data?.entries ?? [];
  const availableTables = data?.availableTables ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: waitlistApi.create,
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success(`${entry.customer_name} adicionado à fila!`);
      setIsModalOpen(false);
    },
    onError: () => toast.error("Erro ao adicionar cliente."),
  });

  const notifyMutation = useMutation({
    mutationFn: (id: string) => waitlistApi.notify(id),
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success(`${entry.customer_name} foi chamado!`);
    },
    onError: () => toast.error("Erro ao chamar cliente."),
  });

  const seatMutation = useMutation({
    mutationFn: ({ id, tableId }: { id: string; tableId: string }) =>
      waitlistApi.seat(id, tableId),
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success(
        `${entry.customer_name} acomodado${entry.assignedTable ? ` na Mesa ${entry.assignedTable.number}` : ""}!`
      );
      setTableSelectionOpen(false);
      setSelectedEntry(null);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Erro ao acomodar cliente."),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, noShow }: { id: string; noShow: boolean }) =>
      waitlistApi.cancel(id, noShow),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success(vars.noShow ? "Marcado como não compareceu." : "Removido da fila.");
    },
    onError: () => toast.error("Erro ao remover cliente."),
  });

  // ── Derived state ─────────────────────────────────────────────────────────────

  const waitingEntries = entries.filter((e) => e.status === "waiting");
  const notifiedEntries = entries.filter((e) => e.status === "notified");

  const nextSeatable = (() => {
    if (availableTables.length === 0) return null;
    for (const entry of waitingEntries) {
      const table = availableTables.find((t) => t.capacity >= entry.party_size);
      if (table) return { entry, table };
    }
    return null;
  })();

  const filtered = searchTerm.trim()
    ? entries.filter(
        (e) =>
          e.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.customer_phone?.includes(searchTerm)
      )
    : entries;

  const waitingFiltered = filtered.filter((e) => e.status === "waiting");
  const notifiedFiltered = filtered.filter((e) => e.status === "notified");

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleAddClient = (clientData: {
    name: string; whatsapp: string; people: number; observations: string;
  }) => {
    addMutation.mutate({
      customer_name: clientData.name.trim(),
      customer_phone: clientData.whatsapp.trim() || undefined,
      party_size: clientData.people,
      special_requests: clientData.observations.trim() || undefined,
    });
  };

  const handleSeatClick = (entry: WaitlistEntry) => {
    if (availableTables.length === 0) {
      toast.error("Não há mesas disponíveis.");
      return;
    }
    setSelectedEntry(entry);
    setTableSelectionOpen(true);
  };

  const handleTableSelect = (table: AvailableTable) => {
    if (!selectedEntry) return;
    seatMutation.mutate({ id: selectedEntry.id, tableId: table.id });
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PageHeader
        title="Fila de Espera"
        subtitle={
          isLoading
            ? "Carregando..."
            : `${entries.length} ${entries.length === 1 ? "cliente" : "clientes"} na fila`
        }
        searchOpen={searchOpen}
        searchTerm={searchTerm}
        searchPlaceholder="Buscar cliente ou telefone..."
        onSearchToggle={() => { setSearchOpen((o) => !o); setSearchTerm(""); }}
        onSearchChange={setSearchTerm}
        onBack={() => navigate(-1)}
        badges={
          <>
            <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 font-semibold whitespace-nowrap hidden sm:inline-flex">
              {waitingEntries.length} aguard.
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-400/10 text-green-400 border border-green-400/20 font-semibold whitespace-nowrap hidden sm:inline-flex">
              {notifiedEntries.length} chamados
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20 font-semibold whitespace-nowrap hidden md:inline-flex">
              {availableTables.length} mesas livres
            </span>
          </>
        }
      />

      {nextSeatable && !searchOpen && (
        <NextSeatableAlert
          entry={nextSeatable.entry}
          table={nextSeatable.table}
          isLoading={notifyMutation.isPending}
          onNotify={() => notifyMutation.mutate(nextSeatable.entry.id)}
        />
      )}

      <main className="flex-1 container mx-auto px-4 py-5 max-w-lg">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 pt-20 text-center">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando fila...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-4 pt-20">
            <div className="h-20 w-20 rounded-2xl bg-muted border border-border/60 flex items-center justify-center">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Nenhum cliente na fila</h2>
              <p className="text-sm text-muted-foreground mt-1">Adicione clientes usando o botão abaixo</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-16 text-center">
            <p className="text-sm text-muted-foreground">Nenhum resultado para "{searchTerm}"</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {waitingFiltered.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Aguardando ({waitingFiltered.length})
                  </h2>
                </div>
                <div className="flex flex-col gap-2">
                  {waitingFiltered.map((entry, i) => (
                    <WaitlistCard
                      key={entry.id}
                      entry={entry}
                      position={i + 1}
                      onNotify={() => notifyMutation.mutate(entry.id)}
                      onSeat={() => handleSeatClick(entry)}
                      onCancel={(noShow) => cancelMutation.mutate({ id: entry.id, noShow })}
                      isNotifying={notifyMutation.isPending && notifyMutation.variables === entry.id}
                      isSeating={seatMutation.isPending && selectedEntry?.id === entry.id}
                      isCancelling={cancelMutation.isPending && cancelMutation.variables?.id === entry.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {notifiedFiltered.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Chamados ({notifiedFiltered.length})
                  </h2>
                </div>
                <div className="flex flex-col gap-2">
                  {notifiedFiltered.map((entry, i) => (
                    <WaitlistCard
                      key={entry.id}
                      entry={entry}
                      position={i + 1}
                      onNotify={() => notifyMutation.mutate(entry.id)}
                      onSeat={() => handleSeatClick(entry)}
                      onCancel={(noShow) => cancelMutation.mutate({ id: entry.id, noShow })}
                      isNotifying={notifyMutation.isPending && notifyMutation.variables === entry.id}
                      isSeating={seatMutation.isPending && selectedEntry?.id === entry.id}
                      isCancelling={cancelMutation.isPending && cancelMutation.variables?.id === entry.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 z-10 bg-background/90 backdrop-blur-sm border-t border-border/50 p-4">
        <div className="container mx-auto max-w-lg">
          <Button
            className="w-full h-12 rounded-xl font-semibold text-sm gap-2"
            onClick={() => setIsModalOpen(true)}
            disabled={addMutation.isPending}
          >
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {addMutation.isPending ? "Adicionando..." : "Adicionar à Fila"}
          </Button>
        </div>
      </footer>

      <AddClientModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onAddClient={handleAddClient}
      />

      <TableSelectionModal
        open={tableSelectionOpen}
        onClose={() => { setTableSelectionOpen(false); setSelectedEntry(null); }}
        tables={availableTables}
        customerName={selectedEntry?.customer_name ?? ""}
        partySize={selectedEntry?.party_size ?? 1}
        onSelect={handleTableSelect}
        isLoading={seatMutation.isPending}
      />
    </div>
  );
}