// ================================================================
// FILE: modules/tables/components/CreateTableModal.tsx
// Modal for creating or editing a table
// ================================================================

import { UtensilsCrossed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RestaurantTable, TableFormData } from "../types";

interface CreateTableModalProps {
  open: boolean;
  editingTable: RestaurantTable | null;
  formData: TableFormData;
  isLoading?: boolean;
  onFormChange: (data: TableFormData) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const CAPACITY_PRESETS = [2, 4, 6, 8];

export function CreateTableModal({
  open,
  editingTable,
  formData,
  isLoading,
  onFormChange,
  onConfirm,
  onClose,
}: CreateTableModalProps) {
  if (!open) return null;

  const isEditing = !!editingTable;
  const isValid =
    !!formData.name.trim() && formData.number > 0 && formData.capacity > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-background rounded-2xl border border-border/60 overflow-hidden">
        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
              <UtensilsCrossed className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">
                {isEditing ? "Editar Mesa" : "Nova Mesa"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEditing
                  ? "Atualize os dados da mesa"
                  : "Preencha os dados da nova mesa"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Form ── */}
        <div className="p-5 flex flex-col gap-4">
          {/* Number + Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Número
              </Label>
              <Input
                type="number"
                min={1}
                className="h-10 rounded-xl border-border/60 bg-muted/20"
                value={formData.number}
                onChange={(e) =>
                  onFormChange({
                    ...formData,
                    number: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Nome
              </Label>
              <Input
                autoFocus
                placeholder="Ex: Mesa 01"
                className="h-10 rounded-xl border-border/60 bg-muted/20"
                value={formData.name}
                onChange={(e) =>
                  onFormChange({ ...formData, name: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValid) onConfirm();
                }}
              />
            </div>
          </div>

          {/* Capacity presets */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Capacidade
            </Label>
            <div className="flex items-center gap-2">
              {CAPACITY_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onFormChange({ ...formData, capacity: n })}
                  className={`h-10 flex-1 rounded-xl border text-sm font-semibold transition-all duration-150 ${
                    formData.capacity === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/20 border-border/60 text-muted-foreground hover:border-border"
                  }`}
                >
                  {n}
                </button>
              ))}
              <Input
                type="number"
                min={1}
                max={99}
                className="h-10 w-16 rounded-xl border-border/60 bg-muted/20 text-center shrink-0"
                value={
                  !CAPACITY_PRESETS.includes(formData.capacity)
                    ? formData.capacity
                    : ""
                }
                placeholder="+"
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v > 0)
                    onFormChange({ ...formData, capacity: v });
                }}
              />
            </div>
          </div>

          {/* Section */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Seção / Área{" "}
              <span className="text-muted-foreground font-normal normal-case tracking-normal">
                (opcional)
              </span>
            </Label>
            <Input
              placeholder="Ex: Salão, Varanda, VIP..."
              className="h-10 rounded-xl border-border/60 bg-muted/20"
              value={formData.section ?? ""}
              onChange={(e) =>
                onFormChange({ ...formData, section: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid) onConfirm();
              }}
            />
          </div>
        </div>

        {/* ── Footer ── */}
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
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEditing ? (
              "Salvar Alterações"
            ) : (
              "Criar Mesa"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
