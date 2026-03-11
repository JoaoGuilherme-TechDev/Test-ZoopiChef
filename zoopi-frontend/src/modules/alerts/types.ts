// ────────────────────────────────────────────────────────────────
// FILE: src/modules/alerts/types.ts
// ────────────────────────────────────────────────────────────────

export type AlertType = "success" | "error" | "warning";

/**
 * Payload para disparar um alerta inteligente.
 * 
 * @param message    — O texto explicativo (ex: "O preço é obrigatório")
 * @param type       — Sucesso, Erro ou Aviso
 * @param module     — Nome do módulo (ex: "Cardápio")
 * @param route      — URL para onde navegar se o usuário clicar no alerta
 * @param targetTab  — ID da aba interna que deve ser aberta (ex: "precos")
 * @param fields     — Lista de IDs/Names dos inputs que devem ficar vermelhos (ex: ["price"])
 * @param routeLabel — Texto do botão de ação
 */
export interface AlertPayload {
  message: string;
  type: AlertType;
  module?: string;
  route?: string;
  targetTab?: string; 
  fields?: string[]; 
  routeLabel?: string;
}

/**
 * Estado de um alerta na fila com ID único
 */
export interface AlertState extends AlertPayload {
  id: string;
}

/**
 * Interface para o contexto global de erro que os inputs e tabs vão "escutar"
 */
export interface ActiveErrorContext {
  activeTab?: string;
  errorFields: string[];
}