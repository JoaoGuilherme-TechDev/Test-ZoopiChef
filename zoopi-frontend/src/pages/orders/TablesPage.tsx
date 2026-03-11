// ================================================================
// FILE: pages/orders/MesasPage.tsx
// ================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  QrCode,
  Plus,
  Settings,
  Search,
  RefreshCw,
  LayoutGrid,
  CheckCircle2,
  Coffee,
  Receipt,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils";
import { useTables } from "@/modules/tables/hooks/useTables";
import { TableCardAdmin } from "@/modules/tables/components/TableCardAdmin";
import { CreateTableModal } from "@/modules/tables/components/CreateTableModal";
import { TableSessionModal } from "@/modules/tables/components/TableSessionModal";
import {
  RestaurantTable,
  TableFormData,
  TableFilterKey,
} from "@/modules/tables/types";

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, dotClass, active, onClick,
}: {
  label: string; value: number; icon: React.ElementType;
  dotClass: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all duration-150 flex items-start gap-3",
        active
          ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
          : "border-border/40 bg-muted/10 hover:border-border/70"
      )}
    >
      <div className={cn(
        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
        active ? "bg-primary/20" : "bg-muted/30"
      )}>
        <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-2xl font-black leading-none">{value}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className={cn("h-2 w-2 rounded-full shrink-0", dotClass)} />
          <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAT_FILTERS: {
  key: TableFilterKey; label: string; icon: React.ElementType; dotClass: string;
}[] = [
  { key: "all",            label: "Total",       icon: LayoutGrid,    dotClass: "bg-foreground" },
  { key: "free",           label: "Livres",      icon: CheckCircle2,  dotClass: "bg-green-500" },
  { key: "occupied",       label: "Ocupadas",    icon: Users,         dotClass: "bg-blue-500" },
  { key: "no_consumption", label: "Sem consumo", icon: Coffee,        dotClass: "bg-yellow-500" },
  { key: "payment",        label: "Conta",       icon: Receipt,       dotClass: "bg-red-500" },
  { key: "reserved",       label: "Reservadas",  icon: CalendarCheck, dotClass: "bg-orange-500" },
];

const EMPTY_FORM: TableFormData = { number: 1, name: "", capacity: 4, section: "" };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MesasPage() {
  const navigate = useNavigate();
  const {
    tables, isLoading,
    createTable, updateTable,
    isCreating, isUpdating,
  } = useTables();

  const [activeFilter, setActiveFilter]   = useState<TableFilterKey>("all");
  const [search, setSearch]               = useState("");
  const [selectFilter, setSelectFilter]   = useState<TableFilterKey>("all");

  // ── Create/edit modal ─────────────────────────────────────────
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTable, setEditingTable]       = useState<RestaurantTable | null>(null);
  const [formData, setFormData]               = useState<TableFormData>(EMPTY_FORM);

  // ── Session view ──────────────────────────────────────────────
  const [sessionTable, setSessionTable] = useState<RestaurantTable | null>(null);

  // ── Counts ────────────────────────────────────────────────────
  const counts: Record<TableFilterKey, number> = {
    all:            tables.length,
    free:           tables.filter((t) => t.status === "free").length,
    occupied:       tables.filter((t) => t.status === "occupied").length,
    no_consumption: tables.filter((t) => t.status === "no_consumption").length,
    payment:        tables.filter((t) => t.status === "payment").length,
    reserved:       tables.filter((t) => t.status === "reserved").length,
  };

  const effectiveFilter = selectFilter !== "all" ? selectFilter : activeFilter;

  const filtered = tables
    .filter((t) => effectiveFilter === "all" || t.status === effectiveFilter)
    .filter((t) =>
      !search.trim() ||
      t.number.toString().includes(search.trim()) ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.section?.toLowerCase().includes(search.toLowerCase())
    );

  // ── Handlers ──────────────────────────────────────────────────
  const openCreate = () => {
    setEditingTable(null);
    setFormData(EMPTY_FORM);
    setCreateModalOpen(true);
  };

  const handleConfirm = () => {
    if (editingTable) updateTable(editingTable.id, formData);
    else createTable(formData);
    setCreateModalOpen(false);
    setEditingTable(null);
    setFormData(EMPTY_FORM);
  };

  // ─────────────────────────────────────────────────────────────
  // If a table is selected, show its session view instead of grid
  // ─────────────────────────────────────────────────────────────
  if (sessionTable) {
    return (
      <DashboardLayout title="Mesas">
        <div className="h-full min-h-[calc(100vh-4rem)]">
          <TableSessionModal
            table={sessionTable}
            onClose={() => setSessionTable(null)}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mesas">
      <div className="flex flex-col gap-6">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Mapa de Mesas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {counts.all} mesas · {counts.occupied} ocupadas · {counts.free} livres
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline" size="sm"
              className="h-9 gap-2 rounded-xl"
              onClick={() => navigate("/waiter/waiting-list")}
            >
              <Users className="h-4 w-4" />
              Fila
            </Button>
            <Button
              variant="outline" size="sm"
              className="h-9 gap-2 rounded-xl"
            >
              <QrCode className="h-4 w-4" />
              QR Codes
            </Button>
            <Button
              size="sm"
              className="h-9 gap-2 rounded-xl"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              Cadastrar Mesas
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {STAT_FILTERS.map(({ key, label, icon, dotClass }) => (
            <StatCard
              key={key}
              label={label}
              value={counts[key]}
              icon={icon}
              dotClass={dotClass}
              active={activeFilter === key}
              onClick={() => { setActiveFilter(key); setSelectFilter("all"); }}
            />
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar mesa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl border-border/60 bg-muted/20"
            />
          </div>

          <Select
            value={selectFilter}
            onValueChange={(v) => {
              setSelectFilter(v as TableFilterKey);
              setActiveFilter(v as TableFilterKey);
            }}
          >
            <SelectTrigger className="w-44 h-9 rounded-xl border-border/60 bg-muted/20">
              <SelectValue placeholder="Todas as mesas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as mesas</SelectItem>
              <SelectItem value="free">Livres</SelectItem>
              <SelectItem value="occupied">Ocupadas</SelectItem>
              <SelectItem value="no_consumption">Sem consumo</SelectItem>
              <SelectItem value="payment">Conta</SelectItem>
              <SelectItem value="reserved">Reservadas</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost" size="icon"
            className="h-9 w-9 rounded-xl shrink-0"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Grid ── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <LayoutGrid className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-semibold">Nenhuma mesa encontrada</p>
            <p className="text-sm text-muted-foreground">
              {search
                ? `Nenhum resultado para "${search}"`
                : 'Clique em "Cadastrar Mesas" para adicionar.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((table) => (
              <TableCardAdmin
                key={table.id}
                table={table}
                onOpen={setSessionTable}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Create/edit modal ── */}
      <CreateTableModal
        open={createModalOpen}
        editingTable={editingTable}
        formData={formData}
        isLoading={isCreating || isUpdating}
        onFormChange={setFormData}
        onConfirm={handleConfirm}
        onClose={() => { setCreateModalOpen(false); setEditingTable(null); }}
      />
    </DashboardLayout>
  );
}