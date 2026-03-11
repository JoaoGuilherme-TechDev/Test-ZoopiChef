// ================================================================
// FILE: modules/waiter/components/tables/tabs/WaiterTabItens.tsx
// ================================================================

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, OrderItem } from "@/modules/tables/types";

interface Props {
  items: OrderItem[];
  commands: Command[];
  onDeleteItem: (itemId: string) => void;
}

export function WaiterTabItens({ items, commands, onDeleteItem }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
        <p className="text-3xl">🍽️</p>
        <p className="text-sm font-semibold text-muted-foreground">Nenhum item lançado ainda</p>
      </div>
    );
  }

  // Group items by command
  const grouped = commands.map((cmd) => ({
    cmd,
    items: items.filter((i) => i.commandId === cmd.id),
  })).filter((g) => g.items.length > 0);

  const ungrouped = items.filter((i) => !i.commandId || !commands.find((c) => c.id === i.commandId));

  const total = items.reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      {grouped.map(({ cmd, items: cmdItems }) => (
        <div key={cmd.id} className="mb-1">
          <div className="px-4 py-2 bg-muted/30 border-b border-border/40">
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              {cmd.name}
            </p>
          </div>
          {cmdItems.map((item) => (
            <ItemRow key={item.id} item={item} onDelete={onDeleteItem} />
          ))}
        </div>
      ))}

      {ungrouped.length > 0 && (
        <div className="mb-1">
          <div className="px-4 py-2 bg-muted/30 border-b border-border/40">
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Sem comanda
            </p>
          </div>
          {ungrouped.map((item) => (
            <ItemRow key={item.id} item={item} onDelete={onDeleteItem} />
          ))}
        </div>
      )}

      {/* Total strip */}
      <div className="mx-4 mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 flex items-center justify-between">
        <p className="text-sm font-bold text-blue-300">Total da mesa</p>
        <p className="text-lg font-black text-blue-300">
          R$ {total.toFixed(2).replace(".", ",")}
        </p>
      </div>
    </div>
  );
}

function ItemRow({ item, onDelete }: { item: OrderItem; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20 active:bg-muted/20">
      <div className="h-7 w-7 rounded-lg bg-muted/40 flex items-center justify-center text-xs font-black text-foreground shrink-0">
        {item.quantity}×
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight truncate">{item.productName}</p>
        {item.note && (
          <p className="text-[11px] text-muted-foreground truncate">📝 {item.note}</p>
        )}
      </div>
      <p className="text-sm font-bold text-foreground shrink-0">
        R$ {item.total.toFixed(2).replace(".", ",")}
      </p>
      <button
        onClick={() => onDelete(item.id)}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}