// ================================================================
// FILE: waiter/WaiterTablesPage.tsx
// ================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { useTables } from "@/modules/tables/hooks/useTables";
import { RestaurantTable, TABLE_STAT_FILTERS, TableFilterKey } from "@/modules/tables/types";
import { TableCardAdmin } from "@/modules/tables/components/TableCardAdmin";
import { TableSessionModal } from "@/modules/tables/components/TableSessionModal";
import { PageHeader } from "@/modules/waiter/components/shared/PageHeader";
import { StatFilterBar } from "@/modules/waiter/components/shared/StatFilterBar";
import { WaiterTableModal } from "./WaiterTableModal";

export default function WaiterTablesPage() {
  const navigate = useNavigate();
  const { tables, isLoading } = useTables();

  const [activeFilter, setActiveFilter]   = useState<TableFilterKey>("all");
  const [searchOpen,   setSearchOpen]     = useState(false);
  const [searchTerm,   setSearchTerm]     = useState("");
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  const counts: Record<TableFilterKey, number> = {
    all:            tables.length,
    free:           tables.filter((t) => t.status === "free").length,
    occupied:       tables.filter((t) => t.status === "occupied").length,
    no_consumption: tables.filter((t) => t.status === "no_consumption").length,
    payment:        tables.filter((t) => t.status === "payment").length,
    reserved:       tables.filter((t) => t.status === "reserved").length,
  };

  const base = activeFilter === "all"
    ? tables
    : tables.filter((t) => t.status === activeFilter);

  const filtered = searchTerm.trim()
    ? base.filter((t) => t.number.toString().includes(searchTerm.trim()))
    : base;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PageHeader
        title="Mapa de Mesas"
        subtitle={`${counts.all} mesas · ${counts.occupied} ocupadas · ${counts.free} livres`}
        searchOpen={searchOpen}
        searchTerm={searchTerm}
        searchPlaceholder="Buscar mesa..."
        onSearchToggle={() => { setSearchOpen((o) => !o); setSearchTerm(""); }}
        onSearchChange={setSearchTerm}
        onBack={() => navigate(-1)}
        onRefresh={() => window.location.reload()}
      />

      <main className="flex-1 container mx-auto px-4 py-4 max-w-4xl flex flex-col gap-4">
        <StatFilterBar
          filters={TABLE_STAT_FILTERS}
          counts={counts}
          activeFilter={activeFilter}
          onFilterChange={(key) => setActiveFilter(key as TableFilterKey)}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando mesas...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Search className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma mesa encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {filtered.map((table) => (
              <TableCardAdmin
                key={table.id}
                table={table}
                onOpen={(t) => setSelectedTable(t)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Session modal — same as TablesPage */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-4xl h-[90vh]">
            <WaiterTableModal
              table={selectedTable}
              onClose={() => setSelectedTable(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}