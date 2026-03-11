// ================================================================
// FILE: modules/waiter/components/tables/tabs/WaiterTabTransferir.tsx
// ================================================================

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { OrderItem, Command, RestaurantTable } from "@/modules/tables/types";

interface Props {
  tableId: string;
  allTables: RestaurantTable[];
  items: OrderItem[];
  commands: Command[];
  isTransferring: boolean;
  onTransferItems: (p: { itemIds: string[]; targetTableId: string }) => void;
  onTransferTable: (targetTableId: string) => void;
}

type Mode = "items" | "table";

export function WaiterTabTransferir({
  tableId, allTables, items, isTransferring,
  onTransferItems, onTransferTable,
}: Props) {
  const [mode, setMode]               = useState<Mode>("table");
  const [targetId, setTargetId]       = useState<string>("");
  const [selectedItems, setSelected]  = useState<string[]>([]);

  const otherTables = allTables.filter((t) => t.id !== tableId);

  const toggleItem = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const handleConfirm = () => {
    if (!targetId) return;
    if (mode === "table") {
      onTransferTable(targetId);
    } else {
      if (selectedItems.length === 0) return;
      onTransferItems({ itemIds: selectedItems, targetTableId: targetId });
    }
  };

  const canConfirm =
    !!targetId && (mode === "table" || selectedItems.length > 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mode toggle */}
      <div className="px-4 py-3 border-b border-border/20">
        <div className="flex rounded-xl overflow-hidden border border-border/40">
          {(["table", "items"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 py-2.5 text-sm font-bold transition-colors",
                mode === m
                  ? "bg-blue-600 text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "table" ? "Mesa inteira" : "Itens específicos"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Target table picker */}
        <div className="px-4 py-3 border-b border-border/20">
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Transferir para
          </p>
          <div className="grid grid-cols-4 gap-2">
            {otherTables.map((t) => (
              <button
                key={t.id}
                onClick={() => setTargetId(t.id)}
                className={cn(
                  "py-3 rounded-xl border text-sm font-bold transition-all",
                  targetId === t.id
                    ? "border-blue-500 bg-blue-500/15 text-blue-400"
                    : "border-border/40 bg-muted/10 text-foreground"
                )}
              >
                {t.number}
              </button>
            ))}
          </div>
        </div>

        {/* Item selection (only in items mode) */}
        {mode === "items" && (
          <div>
            <div className="px-4 py-2 bg-muted/30 border-b border-border/40">
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Selecione os itens
              </p>
            </div>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 border-b border-border/20 text-left transition-colors",
                  selectedItems.includes(item.id) ? "bg-blue-500/10" : "active:bg-muted/20"
                )}
              >
                <div className={cn(
                  "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                  selectedItems.includes(item.id)
                    ? "border-blue-500 bg-blue-500"
                    : "border-border/60"
                )}>
                  {selectedItems.includes(item.id) && (
                    <span className="text-white text-[10px] font-black">✓</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity}×</p>
                </div>
                <p className="text-sm font-bold shrink-0">
                  R$ {item.total.toFixed(2).replace(".", ",")}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Confirm */}
      <div className="p-4 border-t border-border/40">
        <Button
          className="w-full h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
          disabled={!canConfirm || isTransferring}
          onClick={handleConfirm}
        >
          {isTransferring ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ArrowRight className="h-4 w-4" />
              {mode === "table" ? "Transferir mesa" : `Transferir ${selectedItems.length} item(s)`}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}