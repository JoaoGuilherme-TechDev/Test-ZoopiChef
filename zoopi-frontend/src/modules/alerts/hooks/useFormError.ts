/* eslint-disable @typescript-eslint/no-explicit-any */
// ────────────────────────────────────────────────────────────────
// FILE: src/hooks/useFormError.ts
// ────────────────────────────────────────────────────────────────

import { useEffect, useCallback } from "react";
import { useAlert } from "@/modules/alerts";

interface UseFormErrorProps {
  /** ID atual da aba selecionada (ex: 'info') */
  activeTab?: string;
  /** Função para trocar a aba (ex: setTab) */
  onTabChange?: (tabId: string) => void;
  /** Função para limpar o estado local de erro quando o usuário digita */
  onClearLocalErrors?: () => void;
}

/**
 * HOOK GÊNIO: Torna qualquer formulário (Modal ou Página) inteligente.
 * Ele escuta os erros globais e executa a navegação interna.
 */
export function useFormError({ 
  activeTab, 
  onTabChange, 
  onClearLocalErrors 
}: UseFormErrorProps = {}) {
  const { errorFields, targetTab, clearErrors } = useAlert();

  // 1. Escuta o evento de clique no "Corrigir Agora" da caixinha de alerta
  useEffect(() => {
    const handleSwitchTab = (e: any) => {
      const { tab, fields } = e.detail;
      
      // Se o alerta indicar uma aba e tivermos a função de troca, mudamos a aba
      if (tab && onTabChange && tab !== activeTab) {
        onTabChange(tab);
      }

      // Tenta focar no primeiro campo com erro após um pequeno delay (tempo da animação da aba)
      if (fields && fields.length > 0) {
        setTimeout(() => {
          const element = document.getElementsByName(fields[0])[0] || 
                          document.getElementById(fields[0]);
          if (element) {
            element.focus();
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
      }
    };

    window.addEventListener('ZOOPI_SWITCH_TAB', handleSwitchTab);
    return () => window.removeEventListener('ZOOPI_SWITCH_TAB', handleSwitchTab);
  }, [activeTab, onTabChange]);

  /**
   * Verifica se um campo específico está com erro.
   * Use isso para passar a classe 'border-red-500' para os inputs.
   */
  const hasError = useCallback((fieldName: string) => {
    return errorFields.includes(fieldName);
  }, [errorFields]);

  /**
   * Limpa os erros globais.
   * Chame isso no onChange dos seus inputs para a borda vermelha sumir 
   * assim que o usuário começar a corrigir.
   */
  const handleInputChange = useCallback(() => {
    if (errorFields.length > 0) {
      clearErrors();
      if (onClearLocalErrors) onClearLocalErrors();
    }
  }, [errorFields, clearErrors, onClearLocalErrors]);

  return {
    hasError,
    handleInputChange,
    errorFields,
    shouldTabGlow: (tabId: string) => targetTab === tabId
  };
}