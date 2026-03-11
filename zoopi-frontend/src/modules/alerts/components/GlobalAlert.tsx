// ────────────────────────────────────────────────────────────────
// FILE: src/modules/alerts/components/GlobalAlert.tsx
// ────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle, AlertTriangle, X, ArrowRight, MousePointer2 } from "lucide-react";
import { useAlertContext } from "@/contexts/AlertContext";
import { AlertState, AlertType } from "../types";

// ── Cores e Estilos ──────────────────────────────────────────────
const palette: Record<AlertType, { glow: string; border: string; bar: string; iconBg: string; iconColor: string; progressBg: string; }> = {
  success: {
    glow: "rgba(34,197,94,0.18)",
    border: "rgba(34,197,94,0.3)",
    bar: "linear-gradient(90deg, #22c55e, #16a34a)",
    iconBg: "rgba(34,197,94,0.12)",
    iconColor: "#22c55e",
    progressBg: "rgba(34,197,94,0.2)",
  },
  error: {
    glow: "rgba(239,68,68,0.25)",
    border: "rgba(239,68,68,0.4)",
    bar: "linear-gradient(90deg, #ef4444, #dc2626)",
    iconBg: "rgba(239,68,68,0.15)",
    iconColor: "#ef4444",
    progressBg: "rgba(239,68,68,0.2)",
  },
  warning: {
    glow: "rgba(234,179,8,0.18)",
    border: "rgba(234,179,8,0.3)",
    bar: "linear-gradient(90deg, #eab308, #ca8a04)",
    iconBg: "rgba(234,179,8,0.12)",
    iconColor: "#eab308",
    progressBg: "rgba(234,179,8,0.2)",
  },
};

const AUTO_CLOSE_MS: Record<AlertType, number> = {
  success: 5000,
  warning: 8000,
  error: 12000,
};

// ── Verifica se o alerta exige ação do usuário ───────────────────
// Erros com campos específicos ou aba alvo não fecham sozinhos —
// o usuário precisa agir ou fechar manualmente.
function isActionRequired(alert: AlertState): boolean {
  return alert.type === "error" && (
    (alert.fields != null && alert.fields.length > 0) ||
    alert.targetTab != null
  );
}

function AlertItem({ alert, onDismiss, index }: { alert: AlertState; onDismiss: (id: string) => void; index: number }) {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [visible, setVisible] = useState(false);
  // Controla se a animação da barra já deve rodar.
  // Só ativa após visible=true para sincronizar com o timer.
  const [progressActive, setProgressActive] = useState(false);
  const colors = palette[alert.type];
  const actionRequired = isActionRequired(alert);

  // Entrada escalonada por index
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 80);
    return () => clearTimeout(t);
  }, [index]);

  const handleClose = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(alert.id), 350);
  }, [alert.id, onDismiss]);

  // Timer de auto-close + ativação da barra sincronizada
  useEffect(() => {
    if (!visible) return;

    // Ativa a barra no mesmo tick que o timer começa
    setProgressActive(true);

    // Se o alerta exige ação do usuário, não fecha automaticamente
    if (actionRequired) return;

    const t = setTimeout(handleClose, AUTO_CLOSE_MS[alert.type]);
    return () => clearTimeout(t);
  }, [visible, actionRequired, alert.type, handleClose]);

  const handleAction = () => {
    if (alert.targetTab) {
      const event = new CustomEvent("ZOOPI_SWITCH_TAB", {
        detail: { tab: alert.targetTab, fields: alert.fields },
      });
      window.dispatchEvent(event);
      // Não fecha — deixa o alerta visível enquanto o usuário corrige
    } else if (alert.route) {
      navigate(alert.route);
      handleClose();
    }
  };

  const actionLabel = alert.routeLabel || (alert.targetTab ? "Corrigir Agora" : "Ver Detalhes");

  if (!visible && !leaving) return null;

  return (
    <div
      className="relative transition-all duration-500"
      style={{
        width: "380px",
        marginTop: index === 0 ? 0 : "12px",
        animation: leaving
          ? "alertOut 0.4s ease forwards"
          : "alertIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
    >
      <div
        className="glass-card overflow-hidden"
        style={{
          background: "hsl(var(--card))",
          borderColor: colors.border,
          boxShadow: `0 12px 40px ${colors.glow}, 0 4px 12px rgba(0,0,0,0.3)`,
        }}
      >
        <div style={{ height: "4px", background: colors.bar }} />

        <div className="p-4 sm:p-5">
          {/* Badge do Módulo */}
          {alert.module && (
            <div className="mb-3">
              <span
                className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md"
                style={{ background: colors.iconBg, color: colors.iconColor }}
              >
                {alert.module}
              </span>
            </div>
          )}

          <div className="flex gap-4">
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: colors.iconBg }}
            >
              {alert.type === "success" ? (
                <CheckCircle2 size={20} color={colors.iconColor} />
              ) : alert.type === "warning" ? (
                <AlertTriangle size={20} color={colors.iconColor} />
              ) : (
                <AlertCircle size={20} color={colors.iconColor} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-foreground uppercase tracking-tight leading-tight">
                {alert.type === "success"
                  ? "Sucesso!"
                  : alert.type === "warning"
                  ? "Atenção"
                  : "Ops! Encontramos um erro"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-medium">
                {alert.message}
              </p>

              {/* Botão de Ação */}
              {(alert.route || alert.targetTab) && (
                <button
                  onClick={handleAction}
                  className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-lg transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: colors.iconBg,
                    color: colors.iconColor,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <MousePointer2 size={12} />
                  {actionLabel}
                  <ArrowRight size={12} className="ml-1" />
                </button>
              )}
            </div>

            <button
              onClick={handleClose}
              className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Barra de Progresso — só anima após visible=true (sincronizada com o timer) */}
        {/* Erros que exigem ação mostram barra estática, sem encolher */}
        <div
          className="h-1 absolute bottom-0 left-0"
          style={{
            background: colors.progressBg,
            width: "100%",
            transformOrigin: "left",
            animation:
              progressActive && !actionRequired
                ? `progressShrink ${AUTO_CLOSE_MS[alert.type]}ms linear forwards`
                : "none",
          }}
        />
      </div>
    </div>
  );
}

export function GlobalAlert() {
  const { alerts, dismissAlert } = useAlertContext();

  if (alerts.length === 0) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes alertIn {
          from { opacity: 0; transform: translateX(50px) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes alertOut {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.8) translateY(20px); }
        }
        @keyframes progressShrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
      <div className="fixed bottom-8 right-8 z-[9999] flex flex-col-reverse gap-2">
        {alerts.map((alert, idx) => (
          <AlertItem key={alert.id} alert={alert} onDismiss={dismissAlert} index={idx} />
        ))}
      </div>
    </>,
    document.body
  );
}