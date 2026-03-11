// ================================================================
// FILE: modules/tables/components/TableSessionModal.tsx
// ================================================================

import { useState } from "react";
import { X, LayoutList, ShoppingCart, Hash, ArrowLeftRight, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTableSession } from "../hooks/useTableSession";
import { useTables } from "../hooks/useTables";
import { TabItens } from "./tabs/TabItens";
import { TabLancar } from "./tabs/TabLancar";
import { TabComandas } from "./tabs/TabComandas";
import { TabTransferir } from "./tabs/TabTransferir";
import { TabOpcoes } from "./tabs/TabOpcoes";
import { RestaurantTable } from "../types";
import { PaymentModal } from "./PaymentModal";

interface TableSessionModalProps {
  table: RestaurantTable;
  onClose: () => void;
}

const TABS = [
  { k: "itens",      l: "Itens",      i: LayoutList     },
  { k: "lancar",     l: "Lançar",     i: ShoppingCart   },
  { k: "comandas",   l: "Comandas",   i: Hash           },
  { k: "transferir", l: "Transferir", i: ArrowLeftRight },
  { k: "opcoes",     l: "Opções",     i: Settings2      },
] as const;

type TabKey = typeof TABS[number]["k"];

export function TableSessionModal({ table, onClose }: TableSessionModalProps) {
  const [activeTab,   setActiveTab]   = useState<TabKey>("itens");
  const [showPayment, setShowPayment] = useState(false);

  const { tables: allTables } = useTables();

  const {
    session,
    products,
    cart, addItem, updateQuantity, clearCart, cartTotal, cartCount,
    createCommand, createCommandAsync, isCreatingCommand,
    launchOrder, isLaunching,
    closeCommand, deleteItem,
    closeTable, isClosingTable,
    printBill, isPrinting,
    submitPayment, isSubmittingPayment,
    transferItems, isTransferringItems, transferTable, mergeTables,
  } = useTableSession(table.id);

  const commands = session?.commands ?? [];
  const items    = session?.items    ?? [];

  const totalFormatted = (session?.total ?? 0).toFixed(2).replace(".", ",");

  const handleConfirmPayment: React.ComponentProps<typeof PaymentModal>["onConfirm"] = async (payload) => {
    await submitPayment(payload);
    if (payload.mode === "total") {
      setShowPayment(false);
      closeTable();
      onClose();
    }
    // Partial/comanda/adiantamento: keep modal open — session refetches
    // via invalidate() so Já Pago / Restante update automatically
  };

  const handlePrintAndClose = () => {
    printBill();
    closeTable();
    onClose();
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background rounded-xl overflow-hidden border border-primary"> 

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-primary bg-muted/5 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">{session?.tableName ?? table.name}</h2>
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold">
              #{table.number}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Total</p>
              <p className="text-lg font-black text-primary">R$ {totalFormatted}</p>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg border border-primary flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border shrink-0 bg-muted/5">
          {TABS.map((t) => (
            <button
              key={t.k}
              onClick={() => setActiveTab(t.k)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all relative",
                activeTab === t.k
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <t.i className="h-3.5 w-3.5" />
              {t.l}
              {t.k === "lancar" && cartCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-white text-[9px] font-black">
                  {cartCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-background">
          {activeTab === "itens" && (
            <TabItens items={items} commands={commands} onDeleteItem={deleteItem} />
          )}
          {activeTab === "lancar" && (
            <TabLancar
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
            <TabComandas
              commands={commands}
              onCloseCommand={closeCommand}
              onCreateCommand={createCommand}
              isCreating={isCreatingCommand}
            />
          )}
          {activeTab === "transferir" && (
            <TabTransferir
              tableId={table.id}
              tableName={session?.tableName ?? table.name}
              allTables={allTables}
              items={items}
              commands={commands}
              isTransferring={isTransferringItems}
              onTransferItems={(p) => transferItems(p)}
              onTransferTable={(target) => transferTable(target)}
              onMergeTables={(target) => mergeTables(target)}
            />
          )}
          {activeTab === "opcoes" && (
            <TabOpcoes
              onPrintAndClose={handlePrintAndClose}
              onBackToMap={onClose}
              isPrinting={isPrinting}
              isClosingTable={isClosingTable}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/5 flex justify-between items-center shrink-0">
          <button
            onClick={onClose}
            className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Mapa
          </button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPayment(true)}
              disabled={isPrinting}
            >
              Prévia da Conta
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => setShowPayment(true)}
              disabled={isClosingTable}
            >
              Fechar Mesa
            </Button>
          </div>
        </div>
      </div>

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal
          table={table}
          sessionTotal={session?.total ?? 0}
          tableName={session?.tableName ?? table.name}
          previousPayments={(session?.payments ?? []).map((p) => ({
            id:           p.id,
            customerName: p.customerName,
            method:       p.method as "dinheiro" | "credito" | "debito" | "pix" | "maquininha",
            amount:       p.amount,
            isAdvance:    p.mode === "adiantamento",
          }))}
          commands={commands.map((c) => ({
            id:    c.id,
            name:  c.name,
            total: c.total ?? 0,
          }))}
          onConfirm={handleConfirmPayment}
          onClose={() => setShowPayment(false)}
          isConfirming={isSubmittingPayment}
        />
      )}
    </>
  );
}