// FILE: modules/tables/components/tabs/TabTransferir.tsx

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Command, OrderItem, RestaurantTable } from "../../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SubTab = "items" | "table" | "merge";

interface TabTransferirProps {
  tableId: string;
  tableName: string;
  items: OrderItem[];
  commands: Command[];
  allTables: RestaurantTable[];
  onTransferItems: (payload: { itemIds: string[]; targetTableId: string; targetCommandId?: string; newCommandName?: string }) => void;
  onTransferTable: (targetTableId: string) => void;
  onMergeTables: (targetTableId: string) => void;
  isTransferring: boolean;
}

export function TabTransferir({ tableId, tableName, items, commands, allTables, onTransferItems, onTransferTable, onMergeTables, isTransferring }: TabTransferirProps) {
  const [subTab, setSubTab] = useState<SubTab>("items");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filterCmd, setFilterCmd] = useState<string>("all");
  const [targetTableId, setTargetTableId] = useState<string>("");
  const [targetCommandId, setTargetCommandId] = useState<string>("__new__");
  const [newCommandName, setNewCommandName] = useState("");
  const [newCommandType, setNewCommandType] = useState<"number" | "name">("number");

  const otherTables = allTables.filter((t) => t.id !== tableId);
  const filteredItems = filterCmd === "all" ? items : items.filter((i) => i.commandId === filterCmd);

  const toggleItem = (id: string) =>
    setSelectedItems((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const cmdColors: Record<string, string> = {};
  commands.forEach((c, i) => {
    const colors = ["text-blue-400 border-blue-500/50", "text-green-400 border-green-500/50", "text-purple-400 border-purple-500/50", "text-orange-400 border-orange-500/50"];
    cmdColors[c.id] = colors[i % colors.length];
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex border-b border-border/40 shrink-0">
        {([["items", "Transferir Itens"], ["table", "Transferir Mesa"], ["merge", "Unir Mesas"]] as [SubTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={cn("flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors",
              subTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {subTab === "items" && (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden border-r border-border/40">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <p className="text-xs font-semibold text-muted-foreground">Selecione os itens:</p>
              <button onClick={() => setSelectedItems(filteredItems.map((i) => i.id))}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300">
                Selecionar Todos
              </button>
            </div>
            <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-border/30">
              {[{ id: "all", name: "Todos", color: "bg-blue-600 text-white" },
                ...commands.map((c, i) => ({ id: c.id, name: c.name, color: ["bg-blue-700 text-white", "bg-green-700 text-white"][i % 2] }))
              ].map((opt) => (
                <button key={opt.id} onClick={() => setFilterCmd(opt.id)}
                  className={cn("shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                    filterCmd === opt.id ? opt.color : "bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                  {opt.name}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredItems.map((item) => {
                const tagColor = cmdColors[item.commandId] ?? "text-muted-foreground border-border/50";
                return (
                  <div key={item.id} onClick={() => toggleItem(item.id)}
                    className={cn("flex items-center gap-3 px-4 py-3 border-b border-border/20 cursor-pointer transition-colors",
                      selectedItems.includes(item.id) ? "bg-blue-500/10" : "hover:bg-muted/10")}>
                    <div className={cn("h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                      selectedItems.includes(item.id) ? "border-blue-500 bg-blue-500" : "border-border/60")}>
                      {selectedItems.includes(item.id) && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-semibold", tagColor)}>
                        {item.commandName}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{item.quantity}x</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-56 shrink-0 flex flex-col p-4 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Mesa destino:</p>
              <Select value={targetTableId || tableId} onValueChange={setTargetTableId}>
                <SelectTrigger className="h-9 rounded-xl text-sm border-border/50 bg-muted/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={tableId}>{tableName} (Esta mesa)</SelectItem>
                  {otherTables.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Comanda destino:</p>
              <Select value={targetCommandId} onValueChange={setTargetCommandId}>
                <SelectTrigger className="h-9 rounded-xl text-sm border-border/50 bg-muted/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {commands.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  <SelectItem value="__new__">+ Criar Nova Comanda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {targetCommandId === "__new__" && (
              <div className="rounded-xl border border-border/40 bg-muted/10 p-3 flex flex-col gap-3">
                <p className="text-xs font-semibold">Criar nova comanda:</p>
                <div className="flex gap-1">
                  {(["number", "name"] as const).map((t) => (
                    <button key={t} onClick={() => setNewCommandType(t)}
                      className={cn("flex-1 h-7 rounded-lg text-xs font-semibold border transition-colors",
                        newCommandType === t ? "bg-blue-600 border-blue-600 text-white" : "border-border/50 text-muted-foreground")}>
                      {t === "number" ? "# Número" : "Nome"}
                    </button>
                  ))}
                </div>
                <Input placeholder={newCommandType === "number" ? "Número (próximo: 1)" : "Nome da comanda"}
                  value={newCommandName} onChange={(e) => setNewCommandName(e.target.value)}
                  className="h-8 text-sm rounded-xl bg-muted/20 border-border/50" />
                <Button size="sm" className="w-full h-8 rounded-xl text-xs"
                  disabled={selectedItems.length === 0 || isTransferring}
                  onClick={() => onTransferItems({ itemIds: selectedItems, targetTableId: targetTableId || tableId, newCommandName: newCommandName || undefined })}>
                  Criar Comanda e Vincular
                </Button>
              </div>
            )}
            {targetCommandId !== "__new__" && (
              <Button className="w-full h-9 rounded-xl text-sm mt-auto"
                disabled={selectedItems.length === 0 || isTransferring}
                onClick={() => onTransferItems({ itemIds: selectedItems, targetTableId: targetTableId || tableId, targetCommandId })}>
                Transferir {selectedItems.length > 0 ? `(${selectedItems.length})` : ""}
              </Button>
            )}
          </div>
        </div>
      )}

      {(subTab === "table" || subTab === "merge") && (
        <div className="flex flex-col gap-4 p-6">
          <p className="text-sm text-muted-foreground">
            {subTab === "table" ? "Transfere todos os itens e comandas desta mesa para outra mesa." : "Une todos os itens de outra mesa nesta mesa."}
          </p>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Mesa destino:</p>
            <Select onValueChange={setTargetTableId}>
              <SelectTrigger className="h-9 rounded-xl border-border/50 bg-muted/20">
                <SelectValue placeholder="Selecionar mesa..." />
              </SelectTrigger>
              <SelectContent>
                {otherTables.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full h-10 rounded-xl" disabled={!targetTableId || isTransferring}
            onClick={() => subTab === "table" ? onTransferTable(targetTableId) : onMergeTables(targetTableId)}>
            {subTab === "table" ? "Transferir Mesa" : "Unir Mesas"}
          </Button>
        </div>
      )}
    </div>
  );
}