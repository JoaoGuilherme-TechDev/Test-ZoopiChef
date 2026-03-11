import { Search, Filter, Layers, UtensilsCrossed, Users, Receipt, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DiningFilters, TableStatus } from "../types";
import { cn } from "@/lib/utils";

interface DiningHeaderProps {
  filters: DiningFilters;
  setFilters: (f: DiningFilters) => void;
  sections: string[];
  stats: {
    total: number;
    occupied: number;
    waitingPayment: number;
    free: number;
    revenueInOpenBills: number;
  };
}

export function DiningHeader({ filters, setFilters, sections, stats }: DiningHeaderProps) {
  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  return (
    <div className="space-y-6">
      {/* --- KPIs DO SALÃO --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 border-white/5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Mesas Ativas</p>
            <p className="text-xl font-black">{stats.occupied}<span className="text-sm text-muted-foreground">/{stats.total}</span></p>
          </div>
        </div>

        <div className="glass-card p-4 border-purple-500/20 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Receipt size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pediram Conta</p>
            <p className="text-xl font-black text-purple-400">{stats.waitingPayment}</p>
          </div>
        </div>

        <div className="glass-card p-4 border-emerald-500/20 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Mesas Livres</p>
            <p className="text-xl font-black text-emerald-400">{stats.free}</p>
          </div>
        </div>

        <div className="glass-card p-4 border-primary/20 bg-primary/5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Consumo Total</p>
            <p className="text-xl font-black text-primary">{formatCurrency(stats.revenueInOpenBills)}</p>
          </div>
        </div>
      </div>

      {/* --- BARRA DE FILTROS --- */}
      <div className="glass-card p-2 border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {/* Busca por Número/Nome */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar mesa..."
              value={filters.search || ""}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9 h-11 bg-muted/30 border-none rounded-xl text-xs font-bold"
            />
          </div>

          {/* Filtro de Seção */}
          <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl w-full md:w-auto">
            <Layers className="h-4 w-4 text-muted-foreground ml-2" />
            <Select 
              value={filters.section || "all"} 
              onValueChange={(val) => setFilters({ ...filters, section: val === "all" ? undefined : val })}
            >
              <SelectTrigger className="w-[140px] h-8 bg-transparent border-none text-[10px] font-black uppercase tracking-widest">
                <SelectValue placeholder="Seção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Seções</SelectItem>
                {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status Quick Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
          {(["all", "free", "occupied", "waiting_payment"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilters({ ...filters, status: st === "all" ? undefined : (st as TableStatus) })}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                (filters.status === st || (st === "all" && !filters.status))
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                  : "bg-muted/30 border-white/5 text-muted-foreground hover:bg-muted"
              )}
            >
              {st === "all" ? "Todos" : st === "free" ? "Livres" : st === "occupied" ? "Ocupadas" : "Pedindo Conta"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}