// ================================================================
// FILE: modules/waiter/components/tables/tabs/WaiterTabComandas.tsx
// ================================================================

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command } from "@/modules/tables/types";

interface Props {
  commands: Command[];
  onCreateCommand: (name: string) => void;
  onCloseCommand: (commandId: string) => void;
  isCreating: boolean;
}

export function WaiterTabComandas({ commands, onCreateCommand, onCloseCommand, isCreating }: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName]         = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreateCommand(name.trim());
    setName("");
    setCreating(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {commands.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-4">
            <p className="text-3xl">🏷️</p>
            <p className="text-sm font-semibold text-muted-foreground">Nenhuma comanda aberta</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {commands.map((cmd) => (
              <div
                key={cmd.id}
                className="flex items-center justify-between px-4 py-4 border-b border-border/20"
              >
                <div>
                  <p className="text-sm font-bold">{cmd.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cmd.itemCount} {cmd.itemCount === 1 ? "item" : "itens"} ·{" "}
                    R$ {cmd.total.toFixed(2).replace(".", ",")}
                  </p>
                </div>
                <button
                  onClick={() => onCloseCommand(cmd.id)}
                  className="h-8 px-3 rounded-lg border border-border/40 text-xs font-bold text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 transition-colors"
                >
                  Fechar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New command */}
      <div className="p-4 border-t border-border/40">
        {creating ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Nome da comanda..."
              className="flex-1 px-3 py-2.5 rounded-xl border border-blue-500 bg-blue-500/10 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <Button size="sm" onClick={handleCreate} disabled={isCreating} className="rounded-xl px-4">
              {isCreating ? "..." : "OK"}
            </Button>
            <button
              onClick={() => { setCreating(false); setName(""); }}
              className="h-9 w-9 rounded-xl border border-border/40 flex items-center justify-center"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl font-semibold"
            onClick={() => setCreating(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Nova comanda
          </Button>
        )}
      </div>
    </div>
  );
}