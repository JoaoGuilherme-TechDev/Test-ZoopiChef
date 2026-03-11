// ────────────────────────────────────────────────────────────────
// FILE: zoopi-frontend\src\modules\alerts\index.ts
// ────────────────────────────────────────────────────────────────

// Tipos públicos
export type { AlertType, AlertPayload, AlertState } from "./types";

// Hook público — use este em qualquer componente do sistema
export { useAlert } from "./hooks/use-alert";

// Componente visual — monte apenas uma vez em App.tsx
export { GlobalAlert } from "./components/GlobalAlert";