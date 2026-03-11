// ================================================================
// FILE: modules/tables/components/TableBillDialog.tsx
// Dialog for viewing the bill/details of an occupied table
// ================================================================

import { Receipt, UtensilsCrossed, Clock, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RestaurantTable, TABLE_STATUS_CONFIG } from "../types";
import { useState, useEffect } from "react";

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

interface TableBillDialogProps {
  open: boolean;
  table: RestaurantTable;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (tableId: string, status: "occupied" | "free") => void;
}

export function TableBillDialog({
  open,
  table,
  onOpenChange,
  onStatusChange,
}: TableBillDialogProps) {
  if (!open) return null;

  const cfg = TABLE_STATUS_CONFIG[table.status];
  const elapsed = useElapsedSeconds(table.occupiedSince ?? undefined);
  const isFree = table.status === "free";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-background rounded-2xl border border-border/60 overflow-hidden">

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-b from-orange-600 to-orange-800 border border-orange-500/40 flex items-center justify-center">
                <UtensilsCrossed className="h-4 w-4 text-orange-100" />
              </div>
              <div>
                <h2 className="font-bold text-base leading-tight">{table.name}</h2>
                {table.section && (
                  <p className="text-xs text-muted-foreground">{table.section}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-center hover:bg-muted/40 transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-5 flex flex-col gap-4">

          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Status
            </span>
            <span className={cn(
              "text-xs px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1.5",
              cfg.badgeClass
            )}>
              <span className="h-1.5 w-1.5 rounded-full bg-current inline-block" />
              {cfg.label}
            </span>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">

            {/* Capacity */}
            <div className="rounded-xl border border-border/40 bg-muted/10 p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-wide">Capacidade</span>
              </div>
              <p className="text-lg font-black leading-none">
                {table.capacity}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  {table.capacity === 1 ? "lugar" : "lugares"}
                </span>
              </p>
            </div>

            {/* Elapsed time */}
            <div className="rounded-xl border border-border/40 bg-muted/10 p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-wide">Tempo</span>
              </div>
              <p className="text-lg font-black leading-none font-mono tabular-nums">
                {!isFree && table.occupiedSince ? formatElapsed(elapsed) : "—"}
              </p>
            </div>
          </div>

          {/* Commands */}
          {table.commandCount !== undefined && !isFree && (
            <div className="rounded-xl border border-border/40 bg-muted/10 p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">Comandas abertas</span>
              <span className="text-sm font-bold">
                {table.commandCount} {table.commandCount === 1 ? "comanda" : "comandas"}
              </span>
            </div>
          )}

          {/* Total */}
          {table.orderTotal !== undefined && !isFree && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400">
                <Receipt className="h-4 w-4" />
                <span className="text-sm font-semibold">Total</span>
              </div>
              <p className="text-xl font-black text-blue-300">
                R$ {table.orderTotal.toFixed(2).replace(".", ",")}
              </p>
            </div>
          )}

          {isFree && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <p className="text-sm text-muted-foreground">Mesa disponível para receber clientes.</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 pb-5 flex gap-2">
          {!isFree ? (
            <>
              <Button
                variant="outline"
                className="flex-1 h-10 rounded-xl"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
              <Button
                className="flex-1 h-10 rounded-xl font-semibold bg-green-600 hover:bg-green-700"
                onClick={() => {
                  onStatusChange(table.id, "free");
                  onOpenChange(false);
                }}
              >
                Liberar Mesa
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1 h-10 rounded-xl"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
              <Button
                className="flex-1 h-10 rounded-xl font-semibold"
                onClick={() => {
                  onStatusChange(table.id, "occupied");
                  onOpenChange(false);
                }}
              >
                Ocupar Mesa
              </Button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}