// ================================================================
// FILE: waiter/WaiterComandasPage.tsx
// ================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Comanda, COMANDA_STAT_FILTERS, ComandaFilterKey } from "@/modules/waiter/types";
import { PageHeader } from "@/modules/waiter/components/shared/PageHeader";
import { StatFilterBar } from "@/modules/waiter/components/shared/StatFilterBar";
import { ComandaCard } from "@/modules/waiter/components/comandas/ComandaCard";
import { CreateComandaModal } from "@/modules/waiter/components/comandas/CreateComandaModal";



// ─── Mock data (replace with useQuery when backend is ready) ──────────────────

const MOCK_COMANDAS: Comanda[] = [
  { id: "1",  number: 1,  status: "free" },
  { id: "2",  number: 2,  status: "occupied",  openedAt: new Date(Date.now() - (360 * 60 + 38) * 1000), total: 85.73,  serviceCharge: 10 },
  { id: "3",  number: 3,  status: "occupied",  openedAt: new Date(Date.now() - (379 * 60 + 10) * 1000), total: 215.60, serviceCharge: 10 },
  { id: "4",  number: 4,  status: "free" },
  { id: "5",  number: 5,  status: "free" },
  { id: "6",  number: 6,  status: "free" },
  { id: "7",  number: 7,  status: "closed" },
  { id: "8",  number: 8,  status: "closed" },
  { id: "9",  number: 9,  status: "free" },
  { id: "10", number: 10, status: "payment",   openedAt: new Date(Date.now() - (1488 * 60 + 45) * 1000), total: 36.25, serviceCharge: 10 },
  { id: "11", number: 11, status: "payment",   clientName: "João",     openedAt: new Date(Date.now() - (1360 * 60 + 26) * 1000), total: 44.00, serviceCharge: 10 },
  { id: "12", number: 12, status: "payment",   clientName: "5",        openedAt: new Date(Date.now() - (879 * 60 + 13) * 1000),  total: 59.73 },
  { id: "13", number: 13, status: "payment",   clientName: "PDV Loja", openedAt: new Date(Date.now() - (667 * 60 + 34) * 1000),  total: 6.00 },
  { id: "14", number: 14, status: "occupied",  clientName: "PDV Loja", openedAt: new Date(Date.now() - (695 * 60 + 23) * 1000),  total: 6.00 },
  { id: "15", number: 15, status: "free",      clientName: "PDV Loja" },
  { id: "16", number: 16, status: "free",      clientName: "PDV Loja" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function WaiterComandasPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<ComandaFilterKey>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  const counts: Record<ComandaFilterKey, number> = {
    all:            MOCK_COMANDAS.length,
    free:           MOCK_COMANDAS.filter((c) => c.status === "free").length,
    occupied:       MOCK_COMANDAS.filter((c) => c.status === "occupied").length,
    no_consumption: MOCK_COMANDAS.filter((c) => c.status === "no_consumption").length,
    payment:        MOCK_COMANDAS.filter((c) => c.status === "payment").length,
    closed:         MOCK_COMANDAS.filter((c) => c.status === "closed").length,
  };

  const base = activeFilter === "all"
    ? MOCK_COMANDAS
    : MOCK_COMANDAS.filter((c) => c.status === activeFilter);

  const filtered = searchTerm.trim()
    ? base.filter(
        (c) =>
          c.number.toString().includes(searchTerm.trim()) ||
          c.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : base;

  const handleConfirm = () => {
    // TODO: call createComanda mutation with { clientName: newClientName.trim() || undefined }
    setCreateModalOpen(false);
    setNewClientName("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PageHeader
        title="Mapa de Comandas"
        subtitle={`${counts.all} comandas · ${counts.occupied} ocupadas · ${counts.free} livres`}
        searchOpen={searchOpen}
        searchTerm={searchTerm}
        searchPlaceholder="Buscar comanda ou cliente..."
        onSearchToggle={() => { setSearchOpen((o) => !o); setSearchTerm(""); }}
        onSearchChange={setSearchTerm}
        onBack={() => navigate(-1)}
        onRefresh={() => window.location.reload()}
      />

      <main className="flex-1 container mx-auto px-4 py-4 max-w-4xl flex flex-col gap-4">
        <StatFilterBar
          filters={COMANDA_STAT_FILTERS}
          counts={counts}
          activeFilter={activeFilter}
          onFilterChange={(key) => setActiveFilter(key as ComandaFilterKey)}
        />

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Search className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma comanda encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {filtered.map((comanda) => (
              <ComandaCard key={comanda.id} comanda={comanda} onClick={() => {}} />
            ))}
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 z-10 bg-background/90 backdrop-blur-sm border-t border-border/50 p-4">
        <div className="container mx-auto max-w-4xl">
          <Button
            className="w-full h-12 rounded-xl font-semibold text-sm gap-2"
            onClick={() => { setNewClientName(""); setCreateModalOpen(true); }}
          >
            <Plus className="h-4 w-4" />
            Nova Comanda
          </Button>
        </div>
      </footer>

      <CreateComandaModal
        open={createModalOpen}
        clientName={newClientName}
        onClientNameChange={setNewClientName}
        onConfirm={handleConfirm}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}