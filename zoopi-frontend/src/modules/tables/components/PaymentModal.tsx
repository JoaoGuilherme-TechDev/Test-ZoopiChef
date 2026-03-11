// ================================================================
// FILE: modules/tables/components/PaymentModal.tsx
// ================================================================

import { useState, useRef, useEffect } from "react";
import {
  X, User, Banknote, CreditCard, Smartphone, Terminal, Search, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomers, Customer } from "@/modules/customers/hooks/useCustomers";
import { RestaurantTable } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreviousPayment {
  id: string;
  customerName?: string;
  method: PaymentMethod;
  amount: number;
  isAdvance?: boolean;
}

export interface PaymentCommand {
  id: string;
  name: string;   // Command.name — no number field on the type
  total: number;
}

type PaymentMethod = "dinheiro" | "credito" | "debito" | "pix" | "maquininha";
type PaymentMode   = "total" | "parcial" | "por_comanda" | "adiantamento";

interface PaymentModalProps {
  table: RestaurantTable;
  sessionTotal: number;
  tableName: string;
  previousPayments?: PreviousPayment[];
  commands?: PaymentCommand[];
  onConfirm: (payment: {
    mode: PaymentMode;
    method: PaymentMethod;
    amount: number;
    customerId?: string;
    customerName?: string;
    commandId?: string;
  }) => void;
  onClose: () => void;
  isConfirming?: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const METHODS: { k: PaymentMethod; l: string; i: React.ElementType }[] = [
  { k: "dinheiro",   l: "Dinheiro",   i: Banknote   },
  { k: "credito",    l: "Crédito",    i: CreditCard },
  { k: "debito",     l: "Débito",     i: CreditCard },
  { k: "pix",        l: "PIX",        i: Smartphone },
  { k: "maquininha", l: "Maquininha", i: Terminal   },
];

const MODES: { k: PaymentMode; l: string }[] = [
  { k: "total",        l: "Total"        },
  { k: "parcial",      l: "Parcial"      },
  { k: "por_comanda",  l: "Por Comanda"  },
  { k: "adiantamento", l: "Adiantamento" },
];

function fmt(v: number) {
  return v.toFixed(2).replace(".", ",");
}

// ─── CustomerPicker ───────────────────────────────────────────────────────────

function CustomerPicker({
  value,
  onChange,
}: {
  value: Customer | null;
  onChange: (c: Customer | null) => void;
}) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const ref               = useRef<HTMLDivElement>(null);
  const inputRef          = useRef<HTMLInputElement>(null);

  const { customers, isLoading } = useCustomers(query);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  if (value) {
    return (
      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">{value.name}</p>
            {value.phone && <p className="text-[10px] text-white/40">{value.phone}</p>}
          </div>
        </div>
        <button onClick={() => onChange(null)} className="h-6 w-6 flex items-center justify-center">
          <XCircle className="h-4 w-4 text-white/30 hover:text-white/60 transition-colors" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-xs font-semibold text-white/50 hover:bg-white/5 hover:text-white/80 transition-colors w-full text-left"
      >
        <User className="h-3.5 w-3.5" />
        Vincular Cliente
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1a1d27] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome, telefone ou CPF..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-blue-500/60 transition-colors"
              />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {isLoading ? (
              <p className="text-center text-[10px] text-white/30 py-4">Buscando...</p>
            ) : customers.length === 0 ? (
              <p className="text-center text-[10px] text-white/30 py-4">
                {query ? "Nenhum cliente encontrado" : "Digite para buscar"}
              </p>
            ) : (
              customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <User className="h-3 w-3 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{c.name}</p>
                    {c.phone && <p className="text-[9px] text-white/40">{c.phone}</p>}
                  </div>
                  {c.is_blocked && (
                    <span className="text-[9px] text-red-400 font-bold shrink-0">BLOQ</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PaymentModal ─────────────────────────────────────────────────────────────

export function PaymentModal({
  table,
  sessionTotal,
  tableName,
  previousPayments = [],
  commands = [],
  onConfirm,
  onClose,
  isConfirming = false,
}: PaymentModalProps) {
  const alreadyPaid = previousPayments.reduce((s, p) => s + p.amount, 0);
  const remaining   = Math.max(0, sessionTotal - alreadyPaid);

  const [mode,      setMode]      = useState<PaymentMode>("total");
  const [method,    setMethod]    = useState<PaymentMethod>("dinheiro");
  const [amountStr, setAmountStr] = useState("");
  const [payerName, setPayerName] = useState("");
  const [commandId, setCommandId] = useState<string | undefined>(commands[0]?.id);
  const [customer,  setCustomer]  = useState<Customer | null>(null);

  const effectiveAmount = (() => {
    if (mode === "total") return remaining;
    if (mode === "por_comanda") return commands.find((c) => c.id === commandId)?.total ?? 0;
    const parsed = parseFloat(amountStr.replace(",", "."));
    return isNaN(parsed) ? 0 : parsed;
  })();

  const handleConfirm = () => {
    if (effectiveAmount <= 0) return;
    onConfirm({
      mode,
      method,
      amount:       effectiveAmount,
      customerId:   customer?.id,
      customerName: customer?.name ?? (payerName.trim() || undefined),
      commandId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-bold text-white">Pagamento — {tableName}</h2>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 p-5">

            {/* Customer */}
            <div>
              <p className="text-[10px] text-white/40 font-bold uppercase mb-2">
                Vincular Cliente (opcional)
              </p>
              <CustomerPicker value={customer} onChange={setCustomer} />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-[10px] text-white/40 mb-1">Total Consumo</p>
                <p className="text-sm font-black text-white">R$ {fmt(sessionTotal)}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-[10px] text-white/40 mb-1">Já Pago</p>
                <p className="text-sm font-black text-emerald-400">R$ {fmt(alreadyPaid)}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-[10px] text-white/40 mb-1">Restante</p>
                <p className="text-sm font-black text-blue-400">R$ {fmt(remaining)}</p>
              </div>
            </div>

            {/* Previous payments */}
            {previousPayments.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase mb-2">Pagamentos Anteriores</p>
                <div className="flex flex-col gap-1.5">
                  {previousPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/60">
                          {p.customerName ? `${p.customerName} — ` : ""}{p.method}
                        </span>
                        {p.isAdvance && (
                          <span className="px-1.5 py-0.5 rounded border border-blue-500/40 text-blue-400 text-[9px] font-bold">
                            Adiantamento
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-white">R$ {fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mode tabs */}
            <div className="grid grid-cols-4 gap-1 bg-white/5 rounded-xl p-1">
              {MODES.map((m) => (
                <button
                  key={m.k}
                  onClick={() => setMode(m.k)}
                  className={cn(
                    "py-1.5 rounded-lg text-[10px] font-bold transition-all",
                    mode === m.k
                      ? "bg-blue-600 text-white shadow"
                      : "text-white/40 hover:text-white/70"
                  )}
                >
                  {m.l}
                </button>
              ))}
            </div>

            {/* Comanda selector */}
            {mode === "por_comanda" && (
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase mb-2">Selecionar Comanda</p>
                <div className="flex flex-col gap-1.5">
                  {commands.length === 0 ? (
                    <p className="text-xs text-white/30 italic">Nenhuma comanda encontrada.</p>
                  ) : (
                    commands.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCommandId(c.id)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all",
                          commandId === c.id
                            ? "border-blue-500 bg-blue-500/10 text-white"
                            : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
                        )}
                      >
                        <span>{c.name}</span>
                        <span>R$ {fmt(c.total)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Partial / advance amount */}
            {(mode === "parcial" || mode === "adiantamento") && (
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase mb-2">Valor a Pagar</p>
                <Input
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0,00"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500"
                />
              </div>
            )}

            {/* Payer name — only if no customer linked */}
            {!customer && (
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase mb-2">
                  Nome de quem está pagando (opcional)
                </p>
                <Input
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Ex: João"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500"
                />
              </div>
            )}

            {/* Payment method */}
            <div>
              <p className="text-[10px] font-bold text-white/40 uppercase mb-2">Forma de Pagamento</p>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m.k}
                    onClick={() => setMethod(m.k)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border text-[11px] font-bold transition-all",
                      method === m.k
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/80"
                    )}
                  >
                    <m.i className="h-4 w-4" />
                    {m.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount preview */}
            {effectiveAmount > 0 && (
              <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
                <span className="text-xs font-bold text-blue-300">Valor a confirmar</span>
                <span className="text-base font-black text-white">R$ {fmt(effectiveAmount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-white/10 shrink-0">
          <Button
            variant="outline"
            className="flex-1 border-white/10 text-white/70 hover:bg-white/5"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
            onClick={handleConfirm}
            disabled={isConfirming || effectiveAmount <= 0}
          >
            {isConfirming ? "Processando…" : "Confirmar Pagamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}