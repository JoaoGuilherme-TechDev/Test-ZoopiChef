// ================================================================
// FILE: modules/tables/components/TableCardAdmin.tsx
// ================================================================

import { useEffect, useMemo, useState } from "react";
import { UtensilsCrossed, Receipt, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { RestaurantTable, TABLE_STATUS_CONFIG } from "../types";
import { tablesApi } from "../api";
import { useQueryClient } from "@tanstack/react-query";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeDate(value?: Date | string | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

function useElapsedSeconds(startDate?: Date) {
  const [elapsed, setElapsed] = useState(() =>
    startDate ? Math.floor((Date.now() - startDate.getTime()) / 1000) : 0
  );

  useEffect(() => {
    if (!startDate) { setElapsed(0); return; }
    setElapsed(Math.floor((Date.now() - startDate.getTime()) / 1000));
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startDate.getTime()) / 1000)),
      1000
    );
    return () => clearInterval(id);
  }, [startDate]);

  return elapsed;
}

function formatElapsed(s: number) {
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// Statuses that should display the running timer
const TIMED_STATUSES: RestaurantTable["status"][] = [
  "occupied",
  "no_consumption",
  "payment",
];

// ─── Timer badge ──────────────────────────────────────────────────────────────

const TIMER_COLORS: Partial<Record<RestaurantTable["status"], string>> = {
  occupied:       "text-blue-400",
  no_consumption: "text-yellow-400",
  payment:        "text-red-400",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface TableCardAdminProps {
  table: RestaurantTable;
  onOpen: (table: RestaurantTable) => void;
}

export function TableCardAdmin({ table, onOpen }: TableCardAdminProps) {
  const qc  = useQueryClient();
  const cfg = TABLE_STATUS_CONFIG[table.status];

  const isFree  = table.status === "free";
  const isTimed = TIMED_STATUSES.includes(table.status);

  const occupiedSince = useMemo(
    () => normalizeDate(table.occupiedSince as Date | string | null | undefined),
    [table.occupiedSince]
  );

  const elapsed      = useElapsedSeconds(isTimed ? occupiedSince : undefined);
  const timerColor   = TIMER_COLORS[table.status] ?? "text-muted-foreground";
  const [requesting, setRequesting] = useState(false);

  // ── "Pedir Conta" sets status → payment ───────────────────────
  const handleRequestBill = async (e: React.MouseEvent) => {
    e.stopPropagation(); // don't open the session modal
    if (requesting) return;
    setRequesting(true);
    try {
      await tablesApi.updateStatus(table.id, "payment");
      qc.invalidateQueries({ queryKey: ["tables"] });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div
      onClick={() => onOpen(table)}
      className={cn(
        "rounded-xl border p-4 flex flex-col items-center gap-2 text-center w-full cursor-pointer transition-all duration-150 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]",
        cfg.cardClass
      )}
    >
      {/* Number circle */}
      <div
        className={cn(
          "h-12 w-12 rounded-full flex items-center justify-center text-base font-black text-white",
          cfg.circleClass
        )}
      >
        {table.number}
      </div>

      {/* Table icon */}
      <div className="h-10 w-14 rounded-lg bg-gradient-to-b from-orange-600 to-orange-800 border border-orange-500/40 flex items-center justify-center">
        <UtensilsCrossed className="h-5 w-5 text-orange-100" />
      </div>

      {/* Status badge */}
      <span
        className={cn(
          "text-[11px] px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1",
          cfg.badgeClass
        )}
      >
        <Users className="h-3 w-3" />
        {cfg.label}
      </span>

      {/* ── Timer — shown for occupied / no_consumption / payment ── */}
      {isTimed && occupiedSince && (
        <p className={cn(
          "text-[12px] font-mono leading-none tabular-nums font-bold tracking-tight",
          timerColor
        )}>
          ⏱ {formatElapsed(elapsed)}
        </p>
      )}

      {/* Order total */}
      {table.orderTotal !== undefined && !isFree && (
        <p className="text-base font-extrabold text-blue-300 leading-none">
          R$ {table.orderTotal.toFixed(2).replace(".", ",")}
        </p>
      )}

      {/* Command count */}
      {table.commandCount !== undefined && !isFree && (
        <p className="text-[11px] text-muted-foreground leading-none">
          # {table.commandCount}{" "}
          {table.commandCount === 1 ? "comanda" : "comandas"}
        </p>
      )}

      {/* Footer action */}
      {isFree ? (
        <p className="text-[11px] text-muted-foreground mt-0.5">Toque para abrir</p>
      ) : table.status === "payment" ? (
        // Already in payment — show static label, no button needed
        <div className="w-full mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-[11px] font-semibold text-red-400">
          <Receipt className="h-3.5 w-3.5" />
          Aguardando Pagamento
        </div>
      ) : (
        // occupied / no_consumption — show "Pedir Conta" button
        <button
          onClick={handleRequestBill}
          disabled={requesting}
          className={cn(
            "w-full mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-border/40 bg-background/20 py-2 text-[11px] font-semibold text-foreground/80 transition-all",
            requesting
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
          )}
        >
          <Receipt className="h-3.5 w-3.5" />
          {requesting ? "Solicitando..." : "Pedir Conta"}
        </button>
      )}
    </div>
  );
}