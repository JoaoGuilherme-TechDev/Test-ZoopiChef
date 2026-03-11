import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCustomers, Customer } from "@/modules/customers/hooks/useCustomers";
import { CustomerDetailModal } from "@/modules/customers/components/CustomerDetailModal";
import { CustomerImportModal } from "@/modules/customers/components/CustomerImportModal";
import {
  Users, Plus, Search, Phone, Trash2, FileDown, FileUp, X,
  TrendingDown, AlertCircle, AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDataHub } from "@/modules/products/hooks/useDataHub";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Math.abs(cents) / 100
  );

function BalanceDot({ cents }: { cents: number }) {
  if (cents > 0)
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-black text-orange-400 uppercase tracking-wide">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
        {fmtCurrency(cents)}
      </span>
    );
  if (cents < 0)
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-wide">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Crédito
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/25 uppercase tracking-wide">
      <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
      Em dia
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/5">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/5 animate-pulse shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-32 rounded-full bg-white/5 animate-pulse" />
            <div className="h-2 w-20 rounded-full bg-white/[0.03] animate-pulse" />
          </div>
        </div>
      </td>
      <td className="p-4"><div className="h-3 w-28 rounded-full bg-white/5 animate-pulse" /></td>
      <td className="p-4"><div className="h-3 w-16 rounded-full bg-white/5 animate-pulse" /></td>
      <td className="p-4 text-right"><div className="h-7 w-7 rounded-lg bg-white/5 animate-pulse ml-auto" /></td>
    </tr>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [searchTerm, setSearchTerm]               = useState("");
  const [isModalOpen, setIsModalOpen]             = useState(false);
  const [selectedCustomer, setSelectedCustomer]   = useState<Customer | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget]           = useState<Customer | null>(null);

  const { customers, isLoading, deleteCustomer } = useCustomers(searchTerm);
  const { handleExport } = useDataHub();

  // ── Keyboard shortcut: N = new customer ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "n" || e.key === "N") openCreate();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const openCreate = useCallback(() => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  }, []);

  const openDetail = useCallback((c: Customer) => {
    setSelectedCustomer(c);
    setIsModalOpen(true);
  }, []);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteCustomer.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Cliente excluído.");
        setDeleteTarget(null);
      },
    });
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalDebt   = customers.filter(c => c.balance_cents > 0).reduce((s, c) => s + c.balance_cents, 0);
    const totalCredit = customers.filter(c => c.balance_cents < 0).reduce((s, c) => s + c.balance_cents, 0);
    const debtors     = customers.filter(c => c.balance_cents > 0).length;
    return { totalDebt, totalCredit, debtors };
  }, [customers]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Clientes">
      <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">

        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shrink-0">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">Clientes</h1>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {isLoading ? "Carregando…" : `${customers.length} registro${customers.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 font-bold rounded-xl text-xs uppercase border-white/10 hover:border-white/20"
              onClick={() => handleExport("customers")}
            >
              <FileDown className="h-3.5 w-3.5 mr-1.5" /> Exportar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 font-bold rounded-xl text-xs uppercase border-white/10 hover:border-white/20"
              onClick={() => setIsImportModalOpen(true)}
            >
              <FileUp className="h-3.5 w-3.5 mr-1.5" /> Importar
            </Button>
            <Button onClick={openCreate} className="btn-neon gap-1.5 h-9 px-4 text-xs font-black uppercase">
              <Plus className="w-3.5 h-3.5" /> Novo Cliente
              <kbd className="ml-1.5 text-[9px] opacity-50 font-mono border border-white/20 rounded px-1 py-0.5">N</kbd>
            </Button>
          </div>
        </div>

        {/* ── STATS BAR ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="panel p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Users size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total</p>
              <p className="text-xl font-black text-white">{customers.length}</p>
            </div>
          </div>

          <div className="panel p-4 rounded-2xl border border-orange-500/10 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <TrendingDown size={15} className="text-orange-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-orange-400/70 tracking-widest">A Receber</p>
              <p className="text-xl font-black text-orange-400">
                {isLoading ? "—" : fmtCurrency(stats.totalDebt)}
              </p>
              {stats.debtors > 0 && (
                <p className="text-[10px] text-orange-400/50 font-bold">
                  {stats.debtors} devedor{stats.debtors !== 1 ? "es" : ""}
                </p>
              )}
            </div>
          </div>

          <div className="panel p-4 rounded-2xl border border-emerald-500/10 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <TrendingDown size={15} className="text-emerald-400 rotate-180" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-emerald-400/70 tracking-widest">Crédito</p>
              <p className="text-xl font-black text-emerald-400">
                {isLoading ? "—" : fmtCurrency(stats.totalCredit)}
              </p>
            </div>
          </div>
        </div>

        {/* ── SEARCH ───────────────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome, telefone ou CPF…"
            className="pl-11 pr-10 h-12 bg-card border-white/5 rounded-2xl focus:border-primary/40 text-sm font-medium transition-colors"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* ── TABLE ────────────────────────────────────────────────────────── */}
        <Card className="panel border-none overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/[0.03] border-b border-white/5">
                  <tr>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/40">Cliente</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/40">Telefone</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/40">Situação</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                    : customers.map(c => (
                      <tr
                        key={c.id}
                        className="group hover:bg-white/[0.025] transition-colors cursor-pointer"
                        onClick={() => openDetail(c)}
                      >
                        {/* Identity */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm border shrink-0 select-none transition-colors",
                              c.is_blocked
                                ? "bg-red-500/10 border-red-500/20 text-red-400"
                                : "bg-primary/10 border-primary/15 text-primary"
                            )}>
                              {c.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold truncate leading-tight">
                                {c.name}
                                {c.is_blocked && (
                                  <Badge variant="destructive" className="ml-2 text-[9px] py-0 px-1.5 h-4">Bloq.</Badge>
                                )}
                              </span>
                              <span className="text-[10px] text-white/30 font-mono mt-0.5">
                                {c.tax_id || "S/ DOCUMENTO"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                            <Phone size={11} className="text-primary/50 shrink-0" />
                            {c.phone || <span className="opacity-30">---</span>}
                          </div>
                        </td>
                        
                        {/* Balance */}
                        <td className="p-4">
                          {c.allow_fiado ? (<BalanceDot cents={c.balance_cents} />) : <p className="text-xs text-white/60">Não obtante pelo fiado</p>}
                          
                        </td>

                        {/* Delete — row click opens detail, this only deletes */}
                        <td className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-red-500/30 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                            onClick={e => { e.stopPropagation(); setDeleteTarget(c); }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>

              {/* Empty state */}
              {!isLoading && customers.length === 0 && (
                <div className="py-20 flex flex-col items-center gap-4 text-center">
                  <div className="h-16 w-16 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                    {searchTerm
                      ? <AlertCircle size={28} className="text-white/20" />
                      : <Users size={28} className="text-white/20" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase text-white/30">
                      {searchTerm ? "Nenhum resultado" : "Nenhum cliente cadastrado"}
                    </p>
                    <p className="text-xs text-white/20 mt-1">
                      {searchTerm
                        ? `Sem resultados para "${searchTerm}"`
                        : "Clique em Novo Cliente ou pressione N"}
                    </p>
                  </div>
                  {!searchTerm && (
                    <Button onClick={openCreate} className="btn-neon gap-2 h-9 px-5 text-xs mt-2">
                      <Plus size={14} /> Novo Cliente
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── MODALS ───────────────────────────────────────────────────────── */}
        <CustomerDetailModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          customer={selectedCustomer}
        />
        <CustomerImportModal
          isOpen={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
        />

        {/* ── DELETE CONFIRM DIALOG ─────────────────────────────────────────── */}
        <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
          <DialogContent className="max-w-sm border-white/10 bg-[#0e0e1a] rounded-3xl p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={18} className="text-red-400" />
                </div>
                <div className="space-y-1.5">
                  <DialogTitle className="text-base font-black uppercase tracking-tight">
                    Excluir cliente?
                  </DialogTitle>
                  <DialogDescription className="text-xs text-white/40 leading-relaxed">
                    <span className="text-white/70 font-bold">{deleteTarget?.name}</span> será removido
                    permanentemente. Esta ação não pode ser desfeita.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <DialogFooter className="px-6 pb-6 gap-2 flex-row">
              <Button
                variant="ghost"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-10 rounded-xl font-black uppercase text-[10px] text-white/40 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleteCustomer.isPending}
                className="flex-1 h-10 rounded-xl font-black uppercase text-[10px] bg-red-600 hover:bg-red-700 text-white border-none"
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}