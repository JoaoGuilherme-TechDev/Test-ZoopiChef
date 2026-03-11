// ================================================================
// FILE: modules/waiter/components/tables/tabs/WaiterTabLancar.tsx
// ================================================================

import { useState, useMemo } from "react";
import { Search, Plus, Minus, ShoppingCart, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CartItem, Command, Product } from "@/modules/tables/types";

interface Props {
  products: Product[];
  commands: Command[];
  cart: CartItem[];
  addItem: (product: Product) => void;
  updateQuantity: (cartItemId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  launchOrder: (payload: { commandId: string; items: { productId: string; quantity: number; note?: string }[] }) => Promise<void>;
  isLaunching: boolean;
  onCreateCommandAsync: (name: string) => Promise<Command>;
}

export function WaiterTabLancar({
  products, commands, cart, addItem, updateQuantity,
  clearCart, cartTotal, cartCount, launchOrder, isLaunching, onCreateCommandAsync,
}: Props) {
  const [search, setSearch]           = useState("");
  const [selectedCmd, setSelectedCmd] = useState<string>("");
  const [showCart, setShowCart]       = useState(false);
  const [creatingCmd, setCreatingCmd] = useState(false);
  const [newCmdName, setNewCmdName]   = useState("");

  // Category grouping
  const categories = useMemo(() => {
    const map = new Map<string, Product[]>();
    products.forEach((p) => {
      const cat = p.category ?? "Geral";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    });
    return map;
  }, [products]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const handleCreateCommand = async () => {
    if (!newCmdName.trim()) return;
    const cmd = await onCreateCommandAsync(newCmdName.trim());
    setSelectedCmd(cmd.id);
    setCreatingCmd(false);
    setNewCmdName("");
  };

  const handleLaunch = async () => {
    if (!selectedCmd || cart.length === 0) return;
    await launchOrder({
      commandId: selectedCmd,
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    });
    clearCart();
    setShowCart(false);
  };

  // ── Cart view ──────────────────────────────────────────────────
  if (showCart) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
          <button onClick={() => setShowCart(false)} className="text-sm font-bold text-muted-foreground">
            ← Produtos
          </button>
          <p className="text-sm font-bold">Carrinho ({cartCount})</p>
        </div>

        {/* Command selector */}
        <div className="px-4 py-3 border-b border-border/20">
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Lançar para comanda
          </p>
          <div className="flex flex-col gap-2">
            {commands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => setSelectedCmd(cmd.id)}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                  selectedCmd === cmd.id
                    ? "border-blue-500 bg-blue-500/15 text-blue-400"
                    : "border-border/40 bg-muted/10 text-foreground"
                )}
              >
                {cmd.name}
                {selectedCmd === cmd.id && <span className="text-[10px] font-black">✓</span>}
              </button>
            ))}

            {creatingCmd ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newCmdName}
                  onChange={(e) => setNewCmdName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateCommand()}
                  placeholder="Nome da comanda..."
                  className="flex-1 px-3 py-2 rounded-xl border border-blue-500 bg-blue-500/10 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <Button size="sm" onClick={handleCreateCommand} className="rounded-xl">OK</Button>
              </div>
            ) : (
              <button
                onClick={() => setCreatingCmd(true)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Nova comanda
              </button>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.map((item) => (
            <div key={item.cartItemId} className="flex items-center gap-3 px-4 py-3 border-b border-border/20">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  R$ {(item.unitPrice * item.quantity).toFixed(2).replace(".", ",")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                  className="h-7 w-7 rounded-lg border border-border/40 flex items-center justify-center text-muted-foreground"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                  className="h-7 w-7 rounded-lg border border-border/40 flex items-center justify-center text-muted-foreground"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Launch footer */}
        <div className="p-4 border-t border-border/40">
          <Button
            className="w-full h-12 rounded-xl font-bold text-base bg-blue-600 hover:bg-blue-700"
            disabled={!selectedCmd || cart.length === 0 || isLaunching}
            onClick={handleLaunch}
          >
            {isLaunching
              ? "Lançando..."
              : `Lançar pedido · R$ ${cartTotal.toFixed(2).replace(".", ",")}`}
          </Button>
        </div>
      </div>
    );
  }

  // ── Products view ──────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-border/20">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 bg-muted/10">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Products list */}
      <div className="flex-1 overflow-y-auto pb-4">
        {search.trim() ? (
          <div>
            {filtered.map((p) => (
              <ProductRow key={p.id} product={p} cart={cart} onAdd={addItem} onQtyChange={updateQuantity} />
            ))}
          </div>
        ) : (
          Array.from(categories.entries()).map(([cat, prods]) => (
            <div key={cat}>
              <div className="px-4 py-2 bg-muted/30 border-b border-border/40">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{cat}</p>
              </div>
              {prods.map((p) => (
                <ProductRow key={p.id} product={p} cart={cart} onAdd={addItem} onQtyChange={updateQuantity} />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Cart FAB */}
      {cartCount > 0 && (
        <div className="p-4 border-t border-border/40">
          <button
            onClick={() => setShowCart(true)}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-between px-4 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-white" />
              <span className="text-sm font-bold text-white">{cartCount} {cartCount === 1 ? "item" : "itens"}</span>
            </div>
            <div className="flex items-center gap-1 text-white">
              <span className="text-sm font-bold">R$ {cartTotal.toFixed(2).replace(".", ",")}</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

function ProductRow({
  product, cart, onAdd, onQtyChange,
}: {
  product: Product;
  cart: CartItem[];
  onAdd: (p: Product) => void;
  onQtyChange: (id: string, qty: number) => void;
}) {
  const cartItem = cart.find((c) => c.productId === product.id);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20 active:bg-muted/20">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight truncate">{product.name}</p>
        <p className="text-xs text-blue-400 font-bold mt-0.5">
          R$ {product.price.toFixed(2).replace(".", ",")}
        </p>
      </div>
      {cartItem ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onQtyChange(cartItem.cartItemId, cartItem.quantity - 1)}
            className="h-8 w-8 rounded-lg border border-border/40 flex items-center justify-center"
          >
            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <span className="w-5 text-center text-sm font-black">{cartItem.quantity}</span>
          <button
            onClick={() => onQtyChange(cartItem.cartItemId, cartItem.quantity + 1)}
            className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center"
          >
            <Plus className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => onAdd(product)}
          className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center"
        >
          <Plus className="h-3.5 w-3.5 text-white" />
        </button>
      )}
    </div>
  );
}