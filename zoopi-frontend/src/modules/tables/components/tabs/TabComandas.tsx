// FILE: modules/tables/components/tabs/TabComandas.tsx

import { useState } from "react";
import { Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command } from "../../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TabComandasProps {
  commands: Command[];
  onCloseCommand: (commandId: string) => void;
  onCreateCommand: (name: string) => void;
  isCreating: boolean;
}

export function TabComandas({ commands, onCloseCommand, onCreateCommand, isCreating }: TabComandasProps) {
  const [newName, setNewName] = useState("");
  const [showInput, setShowInput] = useState(false);

  const cardColors = [
    "border-blue-500/40 bg-blue-500/5",
    "border-green-500/40 bg-green-500/5",
    "border-purple-500/40 bg-purple-500/5",
    "border-orange-500/40 bg-orange-500/5",
  ];

  // FIX: always trim and guard — never send empty/undefined name to backend
  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreateCommand(name);
    setNewName("");
    setShowInput(false);
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Gerenciar Comandas</h3>
        <Button size="sm" className="h-8 gap-1.5 rounded-xl text-xs" onClick={() => setShowInput(true)}>
          <Plus className="h-3.5 w-3.5" /> Nova Comanda
        </Button>
      </div>

      {showInput && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-border/50 bg-muted/10">
          <Input
            placeholder="Nome da comanda"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            className="flex-1 h-8 text-sm rounded-xl bg-muted/20 border-border/50"
            autoFocus
          />
          <Button
            size="sm"
            className="h-8 px-3 rounded-xl text-xs"
            disabled={!newName.trim() || isCreating}
            onClick={handleCreate}
          >
            Criar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-3 rounded-xl text-xs"
            onClick={() => { setShowInput(false); setNewName(""); }}
          >
            Cancelar
          </Button>
        </div>
      )}

      {commands.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma comanda aberta.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {commands.map((cmd, i) => (
            <div key={cmd.id} className={cn("rounded-xl border p-4 flex flex-col gap-2", cardColors[i % cardColors.length])}>
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm">{cmd.name}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-blue-500/40 text-blue-400 font-semibold">
                  {cmd.status === "open" ? "Aberta" : "Fechada"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {cmd.itemCount} {cmd.itemCount === 1 ? "item" : "itens"} · R$ {cmd.total.toFixed(2).replace(".", ",")}
              </p>
              {cmd.status === "open" && (
                <button
                  onClick={() => onCloseCommand(cmd.id)}
                  className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-border/40 bg-background/20 hover:bg-background/40 py-1.5 text-xs font-semibold transition-colors"
                >
                  <Lock className="h-3 w-3" /> Fechar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}