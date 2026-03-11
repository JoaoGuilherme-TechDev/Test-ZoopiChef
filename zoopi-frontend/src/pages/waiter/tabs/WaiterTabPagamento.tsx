// ================================================================
// FILE: modules/waiter/components/tables/tabs/WaiterTabPagamento.tsx
// ================================================================

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SubmitPaymentPayload } from "@/modules/tables/api";
import { Command } from "@/modules/tables/types";

interface Props {
  sessionTotal: number;
  paidTotal: number;
  remaining: number;
  commands: Command[];
  isSubmitting: boolean;
  onSubmit: (payload: SubmitPaymentPayload) => Promise<void>;
  onCloseTable: () => void;
  isClosingTable: boolean;
}

const METHODS: { value: SubmitPaymentPayload["method"]; label: string; emoji: string }[] = [
  { value: "dinheiro",   label: "Dinheiro",    emoji: "💵" },
  { value: "pix",        label: "Pix",         emoji: "⚡" },
  { value: "credito",    label: "Crédito",     emoji: "💳" },
  { value: "debito",     label: "Débito",      emoji: "🏦" },
  { value: "maquininha", label: "Maquininha",  emoji: "📟" },
];

const MODES: { value: SubmitPaymentPayload["mode"]; label: string }[] = [
  { value: "total",       label: "Total" },
  { value: "parcial",     label: "Parcial" },
  { value: "por_comanda", label: "Por comanda" },
];

export function WaiterTabPagamento({
  sessionTotal, paidTotal, remaining, commands,
  isSubmitting, onSubmit, onCloseTable, isClosingTable,
}: Props) {
  const [method, setMethod]         = useState<SubmitPaymentPayload["method"]>("pix");
  const [mode, setMode]             = useState<SubmitPaymentPayload["mode"]>("total");
  const [amount, setAmount]         = useState(remaining.toFixed(2));
  const [commandId, setCommandId]   = useState<string>("");

  const numAmount = parseFloat(amount.replace(",", ".")) || 0;

  const handleSubmit = async () => {
    await onSubmit({
      mode,
      method,
      amount: numAmount,
      commandId: mode === "por_comanda" ? commandId : undefined,
    });
    // Reset for next payment
    setAmount(Math.max(0, remaining - numAmount).toFixed(2));
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto pb-4">

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-0 border-b border-border/20">
        {[
          { label: "Total",      value: sessionTotal, color: "text-foreground" },
          { label: "Pago",       value: paidTotal,    color: "text-green-400" },
          { label: "Restante",   value: remaining,    color: remaining > 0 ? "text-red-400" : "text-green-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center py-4 border-r last:border-r-0 border-border/20">
            <p className="text-[11px] font-bold text-muted-foreground uppercase">{label}</p>
            <p className={cn("text-base font-black mt-0.5", color)}>
              R$ {value.toFixed(2).replace(".", ",")}
            </p>
          </div>
        ))}
      </div>

      <div className="px-4 py-4 flex flex-col gap-5">

        {/* Mode */}
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Modo
          </p>
          <div className="flex gap-2">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all",
                  mode === m.value
                    ? "border-blue-500 bg-blue-500/15 text-blue-400"
                    : "border-border/40 bg-muted/10 text-muted-foreground"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Command picker (por_comanda mode) */}
        {mode === "por_comanda" && (
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Comanda
            </p>
            <div className="flex flex-col gap-1.5">
              {commands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => setCommandId(cmd.id)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                    commandId === cmd.id
                      ? "border-blue-500 bg-blue-500/15 text-blue-400"
                      : "border-border/40 bg-muted/10 text-foreground"
                  )}
                >
                  <span>{cmd.name}</span>
                  <span className="text-xs">R$ {cmd.total.toFixed(2).replace(".", ",")}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Method */}
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Forma de pagamento
          </p>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-bold transition-all",
                  method === m.value
                    ? "border-blue-500 bg-blue-500/15 text-blue-400"
                    : "border-border/40 bg-muted/10 text-muted-foreground"
                )}
              >
                <span className="text-xl">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        {mode !== "total" && (
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Valor
            </p>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border/40 bg-muted/10">
              <span className="text-sm font-bold text-muted-foreground">R$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-transparent text-lg font-black text-foreground outline-none"
              />
            </div>
          </div>
        )}

        {/* Confirm */}
        <Button
          className="w-full h-12 rounded-xl font-bold bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
          disabled={isSubmitting || (mode !== "total" && numAmount <= 0) || (mode === "por_comanda" && !commandId)}
          onClick={handleSubmit}
        >
          {isSubmitting
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <CheckCircle2 className="h-4 w-4" />
          }
          {mode === "total"
            ? `Confirmar R$ ${sessionTotal.toFixed(2).replace(".", ",")}`
            : `Confirmar R$ ${numAmount.toFixed(2).replace(".", ",")}`}
        </Button>

        {/* Close table (only if fully paid) */}
        {remaining === 0 && (
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl font-semibold border-red-500/40 text-red-400 hover:bg-red-500/10"
            onClick={onCloseTable}
            disabled={isClosingTable}
          >
            {isClosingTable ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Fechar mesa
          </Button>
        )}
      </div>
    </div>
  );
}