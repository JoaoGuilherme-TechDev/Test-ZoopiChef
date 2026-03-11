// ────────────────────────────────────────────────────────────────
// FILE: src/contexts/AlertContext.tsx
// ────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from "react";
import { AlertPayload, AlertState } from "@/modules/alerts/types";
import { registerAlertPush } from "@/lib/api";

interface AlertContextType {
  alerts: AlertState[];
  pushAlert: (payload: AlertPayload) => void;
  dismissAlert: (id: string) => void;
  // Novos estados para os componentes reagirem visualmente
  errorFields: string[];
  targetTab: string | undefined;
  clearErrors: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertState[]>([]);

  // Push do alerta para a fila
  const pushAlert = useCallback((payload: AlertPayload) => {
    const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newAlert: AlertState = { ...payload, id };

    setAlerts((prev) => {
      const queue = [...prev, newAlert];
      // Mantém no máximo 3 alertas, removendo os antigos
      return queue.length > 3 ? queue.slice(queue.length - 3) : queue;
    });
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Limpa as marcações visuais de erro (bordas vermelhas, etc)
  const clearErrors = useCallback(() => {
    setAlerts((prev) => prev.filter(a => a.type !== 'error'));
  }, []);

  // Memoiza os campos e abas em erro baseado no alerta MAIS RECENTE do tipo erro
  const activeErrorState = useMemo(() => {
    const lastError = [...alerts].reverse().find(a => a.type === 'error');
    return {
      fields: lastError?.fields || [],
      tab: lastError?.targetTab
    };
  }, [alerts]);

  // Registra no Axios para erros de API automáticos
  useEffect(() => {
    registerAlertPush(pushAlert);
  }, [pushAlert]);

  return (
    <AlertContext.Provider 
      value={{ 
        alerts, 
        pushAlert, 
        dismissAlert, 
        errorFields: activeErrorState.fields,
        targetTab: activeErrorState.tab,
        clearErrors
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

// Hook interno para uso dos componentes do sistema de alerta
export function useAlertContext(): AlertContextType {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlertContext deve ser usado dentro de <AlertProvider>");
  }
  return ctx;
}