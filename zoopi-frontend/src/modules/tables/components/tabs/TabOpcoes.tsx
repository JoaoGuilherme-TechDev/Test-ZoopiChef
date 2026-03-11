// ================================================================
// FILE: modules/tables/components/tabs/TabOpcoes.tsx
// Options tab for the table session modal
// ================================================================

import { useState } from "react";
import {
  Printer,
  DoorOpen,
  Map,
  AlertTriangle,
  CreditCard,
  Banknote,
  QrCode,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TabOpcoesProps {
  onPrintAndClose: () => void;
  onBackToMap: () => void;
  isPrinting?: boolean;
  isClosingTable?: boolean;
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xs bg-background rounded-2xl border border-border/60 p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-9 rounded-xl text-xs" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            className={cn("flex-1 h-9 rounded-xl text-xs font-bold", confirmClass)}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Option Row ───────────────────────────────────────────────────────────────

function OptionRow({
  icon: Icon,
  iconClass,
  label,
  description,
  onClick,
  disabled,
  loading,
  danger,
}: {
  icon: React.ElementType;
  iconClass: string;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-150",
        "hover:border-border hover:bg-muted/20 active:scale-[0.99]",
        danger
          ? "border-red-500/20 bg-red-500/5 hover:border-red-500/40 hover:bg-red-500/10"
          : "border-border/40 bg-muted/5",
        (disabled || loading) && "opacity-50 pointer-events-none"
      )}
    >
      <div
        className={cn(
          "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
          iconClass
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold leading-tight", danger && "text-red-500")}>
          {label}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
    </button>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
        {title}
      </p>
      {children}
    </div>
  );
}

// ─── Payment Method Badge ─────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { icon: Banknote, label: "Dinheiro", color: "text-green-500" },
  { icon: CreditCard, label: "Cartão", color: "text-blue-500" },
  { icon: QrCode, label: "Pix", color: "text-orange-500" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function TabOpcoes({
  onPrintAndClose,
  onBackToMap,
  isPrinting,
  isClosingTable,
}: TabOpcoesProps) {
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmPrintClose, setConfirmPrintClose] = useState(false);

  return (
    <div className="flex flex-col gap-5 p-4 overflow-y-auto flex-1">

      {/* ── Payment methods (informational) ── */}
      <Section title="Formas de Pagamento">
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/40 bg-muted/5"
            >
              <Icon className={cn("h-5 w-5", color)} />
              <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Fiscal / Print ── */}
      <Section title="Impressão">
        <OptionRow
          icon={Printer}
          iconClass="bg-slate-500/15 border border-slate-500/30 text-slate-400"
          label="Imprimir Prévia da Conta"
          description="Envia para impressora sem fechar a mesa"
          loading={isPrinting}
          onClick={onPrintAndClose}
        />
        <OptionRow
          icon={Printer}
          iconClass="bg-blue-500/15 border border-blue-500/30 text-blue-400"
          label="Imprimir e Fechar Mesa"
          description="Imprime a conta e encerra a sessão"
          loading={isPrinting || isClosingTable}
          onClick={() => setConfirmPrintClose(true)}
        />
      </Section>

      {/* ── Navigation ── */}
      <Section title="Navegação">
        <OptionRow
          icon={Map}
          iconClass="bg-muted/30 border border-border/40 text-muted-foreground"
          label="Voltar ao Mapa"
          description="Retorna ao mapa de mesas sem fechar"
          onClick={onBackToMap}
        />
      </Section>

      {/* ── Danger zone ── */}
      <Section title="Zona de Perigo">
        <OptionRow
          icon={DoorOpen}
          iconClass="bg-red-500/15 border border-red-500/30 text-red-400"
          label="Fechar Mesa"
          description="Encerra a sessão e libera a mesa"
          loading={isClosingTable}
          danger
          onClick={() => setConfirmClose(true)}
        />
      </Section>

      {/* ── Confirm: close table ── */}
      {confirmClose && (
        <ConfirmDialog
          title="Fechar Mesa?"
          description="A sessão será encerrada e todos os pedidos serão finalizados. Esta ação não pode ser desfeita."
          confirmLabel="Fechar Mesa"
          confirmClass="bg-red-600 hover:bg-red-700 text-white"
          onConfirm={() => { setConfirmClose(false); onBackToMap(); }}
          onCancel={() => setConfirmClose(false)}
        />
      )}

      {/* ── Confirm: print and close ── */}
      {confirmPrintClose && (
        <ConfirmDialog
          title="Imprimir e Fechar?"
          description="A conta será impressa e a mesa será encerrada em seguida."
          confirmLabel="Confirmar"
          onConfirm={() => { setConfirmPrintClose(false); onPrintAndClose(); }}
          onCancel={() => setConfirmPrintClose(false)}
        />
      )}
    </div>
  );
}