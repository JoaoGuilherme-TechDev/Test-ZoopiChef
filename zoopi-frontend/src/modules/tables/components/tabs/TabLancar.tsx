// ================================================================
// FILE: modules/tables/components/tabs/TabLancar.tsx
// ================================================================

import { useState, useEffect, useMemo } from "react";
import { Search, Send, X, Tag, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Product, ProductOption } from "../../types";

// ─── Optionals Modal ──────────────────────────────────────────────────────────

interface OptionalsModalProps {
  product: Product;
  onAdd: (product: Product, options: ProductOption[]) => void;
  onClose: () => void;
}

function OptionalsModal({ product, onAdd, onClose }: OptionalsModalProps) {
  const [selected, setSelected] = useState<ProductOption[]>([]);

  const toggle = (opt: ProductOption) => {
    setSelected((prev) =>
      prev.some((o) => o.id === opt.id)
        ? prev.filter((o) => o.id !== opt.id)
        : [...prev, opt]
    );
  };

  const basePrice = Number(product.price ?? 0);
  const extra     = selected.reduce((s, o) => s + Number(o.price ?? 0), 0);
  const total     = basePrice + extra;

  function fmt(v: number) {
    return v.toFixed(2).replace(".", ",");
  }

  return (
    <div className="fixed inset-0 z-[100000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-background rounded-2xl shadow-2xl  flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b shrink-0">
          <div>
            <h3 className="font-black text-sm leading-tight">{product.name}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Selecione os opcionais
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted shrink-0 ml-3"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Options list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
          {(product.options ?? []).map((opt) => {
            const isSelected = selected.some((o) => o.id === opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted/50 hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn(
                    "h-4 w-4 flex items-center justify-center rounded border-2 shrink-0 transition-all",
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                  )}>
                    {isSelected && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
                  </span>
                  <span className="text-[11px] font-bold">{opt.name}</span>
                </div>
                {Number(opt.price ?? 0) > 0 && (
                  <span className="text-[10px] font-bold text-primary ml-2 shrink-0">
                    + R$ {fmt(Number(opt.price))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t shrink-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Total</span>
            <span className="text-sm font-black text-primary">R$ {fmt(total)}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1 h-9 text-[10px] font-bold"
              onClick={onClose}
            >
              CANCELAR
            </Button>
            <Button
              className="flex-1 h-9 text-[10px] font-bold"
              onClick={() => { onAdd(product, selected); onClose(); }}
            >
              ADICIONAR
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TabLancar ────────────────────────────────────────────────────────────────

export function TabLancar({
  products, commands, cart, addItem,
  updateQuantity, clearCart, cartTotal, cartCount,
  launchOrder, isLaunching, onCreateCommandAsync,
}: any) {
  const [search,            setSearch]            = useState("");
  const [activeCategory,    setActiveCategory]    = useState("Todos");
  const [selectedCommandId, setSelectedCommandId] = useState("");
  const [newCommandName,    setNewCommandName]    = useState("");
  const [pendingProduct,    setPendingProduct]    = useState<Product | null>(null);

  const categories = useMemo<string[]>(
    () => [
      "Todos",
      ...Array.from(
        new Set<string>(
          products
            .map((p: Product) => p.category)
            .filter((c: string) => Boolean(c))
        )
      ),
    ],
    [products]
  );

  useEffect(() => {
    if (commands?.length > 0 && !selectedCommandId) {
      setSelectedCommandId(commands[0].id);
    } else if (commands?.length === 0) {
      setSelectedCommandId("__new__");
    }
  }, [commands, selectedCommandId]);

  const filtered = products.filter((p: Product) =>
    (activeCategory === "Todos" || p.category === activeCategory) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Click: open modal if product has options, else add directly ──
  const handleProductClick = (product: Product) => {
    if ((product.options?.length ?? 0) > 0) {
      setPendingProduct(product);
    } else {
      addItem(product, []);
    }
  };

  // ── Called by OptionalsModal on confirm ──────────────────────
  const handleAddWithOptions = (product: Product, options: ProductOption[]) => {
    addItem(product, options);
  };

  const handleLaunch = async () => {
    if (cart.length === 0) return toast.error("Carrinho vazio");
    try {
      let cmdId = selectedCommandId;
      if (cmdId === "__new__") {
        const res = await onCreateCommandAsync(newCommandName.trim() || "Nova Comanda");
        cmdId = res.id;
      }
      await launchOrder({
        commandId: cmdId,
        items: cart.map((i: any) => ({
          productId: i.productId,
          quantity:  i.quantity,
          note: i.options?.length > 0
            ? i.options.map((o: any) => o.name).join(", ")
            : undefined,
        })),
      });
      clearCart();
      setNewCommandName("");
      toast.success("Pedido lançado!");
    } catch {
      toast.error("Erro ao lançar pedido");
    }
  };

  function fmt(v: number) {
    return v.toFixed(2).replace(".", ",");
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full">

      {/* ── Cardápio ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs rounded-lg pl-8"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold border shrink-0 transition-colors",
                  activeCategory === cat
                    ? "bg-primary text-white border-primary"
                    : "bg-muted text-muted-foreground border-transparent"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 content-start">
          {filtered.map((p: Product) => {
            const hasOptions = (p.options?.length ?? 0) > 0;

            return (
              <button
                key={p.id}
                onClick={() => handleProductClick(p)}
                className="flex flex-col rounded-lg bg-card border-[hsla(268, 100%, 52%, 1.00)] hover:border-primary overflow-hidden transition-all text-left active:scale-[0.97] relative"
              >
                {/* Badge for products with optionals */}
                {hasOptions && (
                  <span className="absolute top-1 right-1 z-10 bg-primary text-white text-[7px] font-black px-1.5 py-0.5 rounded-full leading-none">
                    OPC
                  </span>
                )}
                <div className="h-14 w-full bg-muted">
                  {p.imageUrl
                    ? <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name} />
                    : <div className="w-full h-full flex items-center justify-center opacity-20">
                        <Tag className="h-4 w-4" />
                      </div>
                  }
                </div>
                <div className="p-1.5">
                  <p className="text-[9px] font-bold line-clamp-1 leading-tight">{p.name}</p>
                  <p className="text-[10px] font-black text-primary mt-0.5">
                    R$ {fmt(Number(p.price))}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Checkout lateral ── */}
      <div className="w-60 flex flex-col bg-muted/5 p-2">
        <div className="mb-2">
          <label className="text-[9px] font-black text-muted-foreground uppercase block mb-1">
            Destino
          </label>
          <select
            value={selectedCommandId}
            onChange={(e) => setSelectedCommandId(e.target.value)}
            className="w-full h-8 rounded border border-border text-[11px] font-bold px-2 bg-background"
          >
            {commands?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} (R$ {fmt(Number(c.total))})
              </option>
            ))}
            <option value="__new__">+ NOVA COMANDA</option>
          </select>
          {selectedCommandId === "__new__" && (
            <Input
              placeholder="Nome da comanda..."
              className="h-7 text-[11px] mt-1.5"
              value={newCommandName}
              onChange={(e) => setNewCommandName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleLaunch(); }}
              autoFocus
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 mb-2">
          {cart.length === 0 && (
            <div className="flex items-center justify-center h-full py-8">
              <p className="text-[10px] text-muted-foreground">Carrinho vazio</p>
            </div>
          )}
          {cart.map((item: any) => (
            <div key={item.cartItemId} className="p-2 rounded bg-background border border-border text-[10px] shadow-sm">
              <div className="flex justify-between font-bold mb-1">
                <span className="line-clamp-1 flex-1">{item.name}</span>
                <span className="ml-2 tabular-nums">
                  R$ {fmt(item.unitPrice * item.quantity)}
                </span>
              </div>
              {item.options?.map((o: any) => (
                <p key={o.id} className="text-[8px] text-muted-foreground">+ {o.name}</p>
              ))}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                  className="h-4 w-4 rounded bg-muted flex items-center justify-center font-bold"
                >−</button>
                <span className="font-bold tabular-nums">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                  className="h-4 w-4 rounded bg-muted flex items-center justify-center font-bold"
                >+</button>
                <button
                  onClick={() => updateQuantity(item.cartItemId, 0)}
                  className="ml-auto text-red-500 font-bold uppercase text-[8px]"
                >Excluir</button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-2 space-y-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Total</span>
            <span className="text-sm font-black text-primary tabular-nums">
              R$ {fmt(cartTotal)}
            </span>
          </div>
          <Button
            className="w-full h-10 text-[10px] font-black uppercase tracking-wider"
            onClick={handleLaunch}
            disabled={isLaunching || cart.length === 0}
          >
            {isLaunching
              ? "LANÇANDO..."
              : <><Send className="h-3.5 w-3.5 mr-2" /> LANÇAR AGORA</>
            }
          </Button>
        </div>
      </div>

      {/* ── Optionals modal ── */}
      {pendingProduct && (
        <OptionalsModal
          product={pendingProduct}
          onAdd={handleAddWithOptions}
          onClose={() => setPendingProduct(null)}
        />
      )}
    </div>
  );
}