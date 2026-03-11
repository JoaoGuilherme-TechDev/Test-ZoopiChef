// ================================================================
// FILE: waiter/components/tables/TableCard.tsx
// Individual table card displayed in the tables grid
// ================================================================

import { useState, useEffect } from "react";
import { UtensilsCrossed, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { RestaurantTable, TABLE_STATUS_CONFIG } from "../../types";

function useElapsedSeconds(startDate?: Date) {
  const [elapsed, setElapsed] = useState(() =>
    startDate ? Math.floor((Date.now() - startDate.getTime()) / 1000) : 0
  );
  useEffect(() => {
    if (!startDate) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startDate.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startDate]);
  return elapsed;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface TableCardProps {
  table: RestaurantTable;
  onClick: () => void;
}

export function TableCard({ table, onClick }: TableCardProps) {
  const cfg = TABLE_STATUS_CONFIG[table.status];
  const elapsed = useElapsedSeconds(table.occupiedSince);
  const isFree = table.status === "free";

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 flex flex-col items-center gap-1.5 transition-all duration-150 hover:brightness-110 active:scale-[0.96] text-center w-full",
        cfg.cardClass
      )}
    >
      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-sm font-black text-white", cfg.circleClass)}>
        {table.number}
      </div>

      <div className="h-9 w-12 rounded-lg bg-gradient-to-b from-orange-600 to-orange-800 border border-orange-500/40 flex items-center justify-center">
        <UtensilsCrossed className="h-4 w-4 text-orange-100" />
      </div>

      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1", cfg.badgeClass)}>
        <span className="h-1.5 w-1.5 rounded-full bg-current inline-block" />
        {cfg.label}
      </span>

      {!isFree && table.occupiedSince && (
        <p className="text-[11px] font-mono text-blue-300 leading-none tabular-nums">
          {formatElapsed(elapsed)}
        </p>
      )}

      {table.orderTotal !== undefined && !isFree && (
        <p className="text-sm font-extrabold text-blue-300 leading-none">
          R$ {table.orderTotal.toFixed(2).replace(".", ",")}
        </p>
      )}

      {table.commandCount !== undefined && !isFree && (
        <p className="text-[10px] text-muted-foreground leading-none">
          # {table.commandCount} {table.commandCount === 1 ? "comanda" : "comandas"}
        </p>
      )}

      {isFree ? (
        <p className="text-[10px] text-muted-foreground mt-0.5">Toque para abrir</p>
      ) : (
        <div className="w-full mt-0.5 flex items-center justify-center gap-1 rounded-lg border border-border/40 bg-background/20 py-1.5 text-[10px] font-semibold text-foreground/70">
          <Receipt className="h-3 w-3" />
          Pedir Conta
        </div>
      )}
    </button>
  );
}