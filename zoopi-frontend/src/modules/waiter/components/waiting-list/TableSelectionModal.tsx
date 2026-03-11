// ================================================================
// FILE: waiter/components/waitlist/TableSelectionModal.tsx
// Modal for selecting a free table when seating a customer
// ================================================================

import { Button } from "@/components/ui/button";
import { AvailableTable } from "../../types";

interface TableSelectionModalProps {
  open: boolean;
  onClose: () => void;
  tables: AvailableTable[];
  customerName: string;
  partySize: number;
  onSelect: (table: AvailableTable) => void;
  isLoading: boolean;
}

export function TableSelectionModal({
  open,
  onClose,
  tables,
  customerName,
  partySize,
  onSelect,
  isLoading,
}: TableSelectionModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-background rounded-2xl border border-border/60 overflow-hidden">

        <div className="px-5 pt-5 pb-4 border-b border-border/50">
          <h2 className="font-bold text-base">Selecionar Mesa</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {customerName} · {partySize} {partySize === 1 ? "pessoa" : "pessoas"}
          </p>
        </div>

        <div className="p-4 flex flex-col gap-2 max-h-64 overflow-y-auto">
          {tables.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma mesa disponível
            </p>
          ) : (
            tables.map((table) => (
              <button
                key={table.id}
                onClick={() => onSelect(table)}
                disabled={isLoading}
                className="w-full flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 hover:border-border px-4 py-3 transition-all disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="font-semibold text-sm">
                    Mesa {table.number}
                    {table.name && (
                      <span className="text-muted-foreground font-normal"> · {table.name}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{table.capacity} lugares</p>
                </div>
                {partySize > table.capacity && (
                  <span className="text-xs text-yellow-400 border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                    Pequena
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border/50">
          <Button
            variant="outline"
            className="w-full h-10 rounded-xl"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
        </div>

      </div>
    </div>
  );
}