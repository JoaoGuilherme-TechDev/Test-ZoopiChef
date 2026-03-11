import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useDining } from "../hooks/useDining";
import { DiningHeader } from "../components/DiningHeader";
import { TableCard } from "../components/TableCard";
import { WaiterCallQueue } from "../components/WaiterCallQueue";
import { DiningFilters, Table } from "../types";
import { Loader2, LayoutGrid, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PrincipalSalaoPage() {
  const [filters, setFilters] = useState<DiningFilters>({});
  
  const { 
    tables, 
    sections, 
    stats, 
    isLoading, 
    refresh 
  } = useDining(filters);

  // Handlers para os modais que faremos a seguir
  const handleTableClick = (table: Table) => {
    console.log("Mesa selecionada:", table);
    // Aqui abriremos o Modal de Detalhes/Pedido ou Checkout
  };

  return (
    <DashboardLayout title="Salão & Pedidos">
      <div className="flex flex-col lg:flex-row gap-6 h-full animate-in fade-in duration-500">
        
        {/* --- COLUNA PRINCIPAL: MAPA DE MESAS --- */}
        <div className="flex-1 space-y-6">
          <DiningHeader 
            filters={filters} 
            setFilters={setFilters} 
            sections={sections} 
            stats={stats} 
          />

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-xs font-black uppercase tracking-widest opacity-50">Sincronizando Salão...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              <AnimatePresence mode="popLayout">
                {tables.length > 0 ? (
                  tables.map((table) => (
                    <motion.div
                      key={table.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <TableCard table={table} onClick={handleTableClick} />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground bg-muted/5 rounded-3xl border-2 border-dashed border-white/5">
                    <LayoutGrid size={40} className="opacity-20 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">Nenhuma mesa encontrada</p>
                    <p className="text-[10px] uppercase font-medium opacity-60">Tente ajustar seus filtros de busca</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* --- SIDEBAR: ATENDIMENTO & ALERTAS --- */}
        <aside className="w-full lg:w-80 space-y-6">
          {/* Fila de Chamados */}
          <WaiterCallQueue />

          {/* Dica Operacional IA */}
          <div className="glass-card p-5 border-primary/20 bg-primary/5 rounded-3xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Insight Zoopi</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground font-medium">
                O tempo médio de ocupação hoje está <span className="text-emerald-500 font-bold">12% mais rápido</span> que o normal. Bom momento para rodar promoções de sobremesa!
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertCircle size={80} />
            </div>
          </div>

          {/* Legenda Rápida */}
          <div className="p-4 rounded-2xl bg-muted/20 border border-white/5 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Status do Salão</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold uppercase">Livre</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-[10px] font-bold uppercase">Ocupada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <span className="text-[10px] font-bold uppercase">Pagamento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-[10px] font-bold uppercase">Reserva</span>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </DashboardLayout>
  );
}