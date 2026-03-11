// ================================================================
// FILE: modules/tables/components/ProductOptionalsModal.tsx
// ================================================================

import { useState } from "react";
import { X, Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OptionalSelectionType = "single" | "multiple";

export interface OptionalItem {
  id: string;
  name: string;
  priceModifier: number; // positive = add, negative = subtract
}

export interface OptionalGroup {
  id: string;
  name: string;
  type: OptionalSelectionType;
  required: boolean;
  min?: number;
  max?: number;
  items: OptionalItem[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  optionalGroups: OptionalGroup[];
}

export interface SelectedOptionals {
  groupId: string;
  itemIds: string[];
}

interface ProductOptionalsModalProps {
  product: Product;
  onConfirm: (payload: {
    product: Product;
    quantity: number;
    selectedOptionals: SelectedOptionals[];
    note: string;
    unitPrice: number;
  }) => void;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  const sign = v >= 0 ? "+" : "";
  return `${sign}R$ ${Math.abs(v).toFixed(2).replace(".", ",")}`;
}

function fmtPrice(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductOptionalsModal({
  product,
  onConfirm,
  onClose,
}: ProductOptionalsModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [note,     setNote]     = useState("");
  const [showNote, setShowNote] = useState(false);

  // Map: groupId → selected itemIds
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    product.optionalGroups.forEach((g) => { init[g.id] = []; });
    return init;
  });

  // ── Selection handlers ────────────────────────────────────────

  const toggleItem = (group: OptionalGroup, itemId: string) => {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];

      if (group.type === "single") {
        // Radio-like: deselect if already selected, else replace
        return { ...prev, [group.id]: current[0] === itemId ? [] : [itemId] };
      }

      // Multi: toggle, respecting max
      if (current.includes(itemId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== itemId) };
      }
      const max = group.max ?? Infinity;
      if (current.length >= max) return prev; // cap reached
      return { ...prev, [group.id]: [...current, itemId] };
    });
  };

  // ── Validation ────────────────────────────────────────────────

  const isValid = product.optionalGroups
    .filter((g) => g.required)
    .every((g) => {
      const selected = selections[g.id]?.length ?? 0;
      const min = g.min ?? 1;
      return selected >= min;
    });

  // ── Price calculation ─────────────────────────────────────────

  const optionalsModifier = product.optionalGroups.reduce((total, group) => {
    const selected = selections[group.id] ?? [];
    return total + group.items
      .filter((item) => selected.includes(item.id))
      .reduce((s, item) => s + item.priceModifier, 0);
  }, 0);

  const unitPrice = product.price + optionalsModifier;
  const totalPrice = unitPrice * quantity;

  // ── Confirm ───────────────────────────────────────────────────

  const handleConfirm = () => {
    if (!isValid) return;
    const selectedOptionals: SelectedOptionals[] = Object.entries(selections)
      .filter(([, ids]) => ids.length > 0)
      .map(([groupId, itemIds]) => ({ groupId, itemIds }));
    onConfirm({ product, quantity, selectedOptionals, note, unitPrice });
  };

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[#0f1117] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-white/10 shrink-0">
          <div className="flex-1 pr-4">
            <h2 className="text-base font-bold text-white leading-tight">{product.name}</h2>
            <p className="text-sm font-black text-blue-400 mt-0.5">{fmtPrice(product.price)}</p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors shrink-0"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {product.optionalGroups.map((group) => {
            const selected = selections[group.id] ?? [];
            const max = group.max;
            const min = group.min ?? (group.required ? 1 : 0);
            const isRequired = group.required;
            const isCapped = max !== undefined && selected.length >= max;

            return (
              <div key={group.id}>
                {/* Group header */}
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <p className="text-xs font-bold text-white">{group.name}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {group.type === "single"
                        ? "Escolha 1 opção"
                        : max
                          ? `Escolha até ${max} opções`
                          : "Escolha quantas quiser"}
                      {min > 0 && " · "}
                      {min > 0 && (
                        <span className={cn(
                          "font-semibold",
                          isRequired ? "text-red-400" : "text-white/40"
                        )}>
                          {isRequired ? "Obrigatório" : `Mín. ${min}`}
                        </span>
                      )}
                    </p>
                  </div>
                  {selected.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">
                      {selected.length} selecionado{selected.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Items */}
                <div className="flex flex-col gap-1.5">
                  {group.items.map((item) => {
                    const isSelected = selected.includes(item.id);
                    const isDisabled = !isSelected && isCapped;

                    return (
                      <button
                        key={item.id}
                        onClick={() => !isDisabled && toggleItem(group, item.id)}
                        disabled={isDisabled}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left",
                          isSelected
                            ? "border-blue-500 bg-blue-500/10 text-white"
                            : isDisabled
                              ? "border-white/5 bg-white/3 text-white/20 cursor-not-allowed"
                              : "border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Checkbox / radio indicator */}
                          <span className={cn(
                            "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                            group.type === "single" ? "rounded-full" : "rounded",
                            isSelected
                              ? "border-blue-500 bg-blue-500"
                              : "border-white/20"
                          )}>
                            {isSelected && (
                              <span className="h-1.5 w-1.5 bg-white rounded-full block" />
                            )}
                          </span>
                          {item.name}
                        </div>
                        {item.priceModifier !== 0 && (
                          <span className={cn(
                            "text-[10px] font-bold",
                            item.priceModifier > 0 ? "text-white/50" : "text-emerald-400"
                          )}>
                            {fmt(item.priceModifier)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── Observation ── */}
          <div>
            <button
              onClick={() => setShowNote((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-white/70 transition-colors"
            >
              {showNote ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Observação
            </button>
            {showNote && (
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: sem cebola, ponto da carne…"
                rows={2}
                className="mt-2 bg-white/5 border-white/10 text-white text-xs placeholder:text-white/20 focus:border-blue-500 resize-none"
              />
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-white/10 shrink-0">
          {/* Quantity + total */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
              >
                <Minus className="h-3.5 w-3.5 text-white/70" />
              </button>
              <span className="w-6 text-center text-sm font-black text-white">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-white/70" />
              </button>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/40">Total</p>
              <p className="text-lg font-black text-white">{fmtPrice(totalPrice)}</p>
            </div>
          </div>

          <Button
            className={cn(
              "w-full font-bold transition-all",
              isValid
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            )}
            onClick={handleConfirm}
            disabled={!isValid}
          >
            {isValid ? `Adicionar ao Pedido · ${fmtPrice(totalPrice)}` : "Preencha os campos obrigatórios"}
          </Button>
        </div>
      </div>
    </div>
  );
}