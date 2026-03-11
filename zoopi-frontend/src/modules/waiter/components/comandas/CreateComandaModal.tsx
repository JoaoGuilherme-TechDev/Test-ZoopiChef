// ================================================================
// FILE: waiter/components/comandas/CreateComandaModal.tsx
// Modal for creating a new comanda with optional client name
// ================================================================

import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreateComandaModalProps {
  open: boolean;
  clientName: string;
  isLoading?: boolean;
  onClientNameChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function CreateComandaModal({
  open,
  clientName,
  isLoading,
  onClientNameChange,
  onConfirm,
  onClose,
}: CreateComandaModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-background rounded-2xl border border-border/60 overflow-hidden">

        <div className="px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
              <Tag className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Nova Comanda</h2>
              <p className="text-xs text-muted-foreground">Informe o nome do cliente (opcional)</p>
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Nome do cliente
            </label>
            <Input
              autoFocus
              placeholder="Ex: João, Mesa 3, PDV..."
              className="h-10 rounded-xl border-border/60 bg-muted/20"
              value={clientName}
              onChange={(e) => onClientNameChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onConfirm(); }}
            />
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-10 rounded-xl"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 h-10 rounded-xl font-semibold"
            onClick={onConfirm}
            disabled={isLoading}
          >
            Abrir Comanda
          </Button>
        </div>

      </div>
    </div>
  );
}