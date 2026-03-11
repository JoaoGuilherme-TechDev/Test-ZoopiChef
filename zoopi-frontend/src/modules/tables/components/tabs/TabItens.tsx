// FILE: modules/tables/components/tabs/TabItens.tsx

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, OrderItem } from "../../types";

interface TabItensProps {
  items: OrderItem[];
  commands: Command[];
  onDeleteItem: (itemId: string) => void;
}

export function TabItens({ items, commands, onDeleteItem }: TabItensProps) {
  const [activeCmd, setActiveCmd] = useState<string>("all");

  const filtered =
    activeCmd === "all" ? items : items.filter((i) => i.commandId === activeCmd);

  const cmdColors = [
    { active: "bg-blue-700 text-white",   tag: "border-blue-500/60 text-blue-400",   row: "hover:bg-blue-500/5" },
    { active: "bg-green-700 text-white",  tag: "border-green-500/60 text-green-400", row: "hover:bg-green-500/5" },
    { active: "bg-purple-700 text-white", tag: "border-purple-500/60 text-purple-400", row: "hover:bg-purple-500/5" },
    { active: "bg-orange-700 text-white", tag: "border-orange-500/60 text-orange-400", row: "hover:bg-orange-500/5" },
  ];

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="w-40 shrink-0 border-r border-border/40 p-3 flex flex-col gap-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Comandas
        </p>
        <button
          onClick={() => setActiveCmd("all")}
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
            activeCmd === "all"
              ? "bg-blue-600 text-white"
              : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
          )}
        >
          Todos
          <span className="text-xs rounded-full px-1.5 py-0.5 font-bold bg-white/20">
            {items.length}
          </span>
        </button>

        {commands.map((cmd, i) => {
          const col = cmdColors[i % cmdColors.length];
          return (
            <button
              key={cmd.id}
              onClick={() => setActiveCmd(cmd.id)}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                activeCmd === cmd.id ? col.active : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
              )}
            >
              {cmd.name}
              <span className="text-xs rounded-full px-1.5 py-0.5 font-bold bg-white/20">
                {items.filter((it) => it.commandId === cmd.id).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Nenhum item encontrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background/95 backdrop-blur z-10">
              <tr className="border-b border-border/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Item</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Qtd</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Valor</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Comanda</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const idx = commands.findIndex((c) => c.id === item.commandId);
                const col = cmdColors[idx % cmdColors.length] ?? cmdColors[0];
                return (
                  <tr key={item.id} className={cn("border-b border-border/20 transition-colors", col.row)}>
                    <td className="px-4 py-3 font-medium">{item.productName}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{item.quantity}x</td>
                    <td className="px-4 py-3 text-right text-blue-300 font-semibold">
                      R$ {item.total.toFixed(2).replace(".", ",")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full border font-semibold", col.tag)}>
                        {item.commandName}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-red-500/20 transition-colors group"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-red-400" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}