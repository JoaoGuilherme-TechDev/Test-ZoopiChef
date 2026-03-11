// ────────────────────────────────────────────────────────────────
// FILE: src/modules/alerts/hooks/use-alert.ts
// ────────────────────────────────────────────────────────────────

import { useCallback } from "react";
import { useAlertContext } from "@/contexts/AlertContext";
import { AlertPayload } from "../types";

// Opções simplificadas para os atalhos
type AlertOptions = Omit<AlertPayload, "type" | "message">;

/**
 * Hook para disparar alertas globais e gerenciar estados de erro visual.
 */
export function useAlert() {
  const { pushAlert, clearErrors, errorFields, targetTab } = useAlertContext();

  const success = useCallback(
    (message: string, options?: AlertOptions) => {
      pushAlert({ message, type: "success", ...options });
    },
    [pushAlert]
  );

  const error = useCallback(
    (message: string, options?: AlertOptions) => {
      pushAlert({ message, type: "error", ...options });
    },
    [pushAlert]
  );

  const warning = useCallback(
    (message: string, options?: AlertOptions) => {
      pushAlert({ message, type: "warning", ...options });
    },
    [pushAlert]
  );

  return { 
    success, 
    error, 
    warning, 
    clearErrors,   // Permite limpar o estado visual de erro
    errorFields,   // Lista de IDs de campos com erro (para bordas vermelhas)
    targetTab      // ID da aba que deve estar brilhando
  };
}