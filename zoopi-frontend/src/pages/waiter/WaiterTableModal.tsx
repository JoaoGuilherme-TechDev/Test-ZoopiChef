// ================================================================
// FILE: modules/waiter/components/tables/WaiterTableModal.tsx
// Full-screen waiter modal with bottom tab bar navigation
// ================================================================

import { useState } from "react";
import { LayoutList, ShoppingCart, Hash, ArrowLeftRight, Banknote, X, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { RestaurantTable } from "@/modules/tables/types";
import { useTableSession } from "@/modules/tables/hooks/useTableSession";
import { useTables } from "@/modules/tables/hooks/useTables";
import { WaiterTabItens } from "./tabs/WaiterTabItens";
import { WaiterTabLancar } from "./tabs/WaiterTabLancar";
import { WaiterTabComandas } from "./tabs/WaiterTabComandas";
import { WaiterTabTransferir } from "./tabs/WaiterTabTransferir";
import { WaiterTabPagamento } from "./tabs/WaiterTabPagamento";

type TabKey = "itens" | "lancar" | "comandas" | "transferir" | "pagamento";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "itens",       label: "Itens",      icon: LayoutList    },
  { key: "lancar",      label: "Lançar",     icon: ShoppingCart  },
  { key: "comandas",    label: "Comandas",   icon: Hash          },
  { key: "transferir",  label: "Transferir", icon: ArrowLeftRight },
  { key: "pagamento",   label: "Pagamento",  icon: Banknote      },
];

interface Props {
  table: RestaurantTable;
  onClose: () => void;
}

export function WaiterTableModal({ table, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("itens");

  const { tables: allTables } = useTables();

  const {
    session,
    isLoadingSession,
    products,
    cart, addItem, updateQuantity, clearCart, cartTotal, cartCount,
    createCommand, createCommandAsync, isCreatingCommand,
    launchOrder, isLaunching,
    closeCommand, deleteItem,
    closeTable, isClosingTable,
    submitPayment, isSubmittingPayment,
    transferItems, isTransferringItems, transferTable,
  } = useTableSession(table.id);

  const commands = session?.commands ?? [];
  const items    = session?.items    ?? [];
  const total    = session?.total    ?? 0;
  const paid     = session?.paidTotal ?? 0;
  const remaining = session?.remaining ?? 0;

  const handleCloseTable = () => {
    closeTable();
    onClose();
  };

  return (
    // Full-screen overlay
    <div className="fixed inset-0 z-50 flex flex-col bg-background">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background shrink-0">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-b from-orange-600 to-orange-800 border border-orange-500/40 flex items-center justify-center shrink-0">
          <UtensilsCrossed className="h-4 w-4 text-orange-100" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black leading-tight">
            {table.name ?? `Mesa ${table.number}`}
          </p>
          <p className="text-xs text-muted-foreground leading-tight">
            {commands.length} comanda{commands.length !== 1 ? "s" : ""} ·{" "}
            R$ {total.toFixed(2).replace(".", ",")}
          </p>
        </div>

        {/* Remaining badge */}
        {remaining > 0 && (
          <div className="px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30">
            <p className="text-xs font-black text-red-400">
              R$ {remaining.toFixed(2).replace(".", ",")} restante
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="h-9 w-9 rounded-xl border border-border/60 flex items-center justify-center shrink-0"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* ── Tab content ───────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "itens" && (
          <WaiterTabItens
            items={items}
            commands={commands}
            onDeleteItem={deleteItem}
          />
        )}
        {activeTab === "lancar" && (
          <WaiterTabLancar
            products={products}
            commands={commands}
            cart={cart}
            addItem={addItem}
            updateQuantity={updateQuantity}
            clearCart={clearCart}
            cartTotal={cartTotal}
            cartCount={cartCount}
            launchOrder={launchOrder}
            isLaunching={isLaunching}
            onCreateCommandAsync={createCommandAsync}
          />
        )}
        {activeTab === "comandas" && (
          <WaiterTabComandas
            commands={commands}
            onCreateCommand={createCommand}
            onCloseCommand={closeCommand}
            isCreating={isCreatingCommand}
          />
        )}
        {activeTab === "transferir" && (
          <WaiterTabTransferir
            tableId={table.id}
            allTables={allTables}
            items={items}
            commands={commands}
            isTransferring={isTransferringItems}
            onTransferItems={transferItems}
            onTransferTable={transferTable}
          />
        )}
        {activeTab === "pagamento" && (
          <WaiterTabPagamento
            sessionTotal={total}
            paidTotal={paid}
            remaining={remaining}
            commands={commands}
            isSubmitting={isSubmittingPayment}
            onSubmit={submitPayment}
            onCloseTable={handleCloseTable}
            isClosingTable={isClosingTable}
          />
        )}
      </div>

      {/* ── Bottom tab bar ────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border/50 bg-background grid grid-cols-5 pb-safe">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-3 relative transition-colors",
              activeTab === key
                ? "text-blue-400"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {/* Active indicator */}
            {activeTab === key && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-blue-400" />
            )}
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-bold">{label}</span>
            {/* Cart badge on Lançar tab */}
            {key === "lancar" && cartCount > 0 && (
              <span className="absolute top-2 right-[calc(50%-14px)] h-4 w-4 rounded-full bg-blue-500 text-white text-[9px] font-black flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}