import { TableStatus } from './types';

// --- EXPORTAÇÃO DE TIPOS E API ---
export * from './types';
export * from './api/dining.api';

// --- EXPORTAÇÃO DE HOOKS (A Inteligência) ---
export { useDining } from './hooks/useDining';
export { useOrderFlow } from './hooks/useOrderFlow';

// --- CONSTANTES TÉCNICAS E LABELS (Padrão Zoopi) ---
export const TABLE_STATUS_LABELS: Record<string, string> = {
  free: "Livre",
  occupied: "Ocupada",
  waiting_payment: "Pediu Conta",
  reserved: "Reservada",
  cleaning: "Limpeza",
  blocked: "Bloqueada",
};

export const CALL_TYPE_LABELS: Record<string, string> = {
  waiter: "Chamar Garçom",
  bill: "Trazer a Conta",
  cleaning: "Solicitar Limpeza",
};

// --- COMPONENTES DE INTERFACE ---
export { TableCard } from './components/TableCard';
export { DiningHeader } from './components/DiningHeader';
export { WaiterCallQueue } from './components/WaiterCallQueue';

// --- MODAIS DE FLUXO ---
export { OrderDetailsModal } from './components/modals/OrderDetailsModal';
export { CheckoutModal } from './components/modals/CheckoutModal';

// --- PÁGINAS PRINCIPAIS ---
// Exportamos a página para ser usada no arquivo de rotas principal (App.tsx)
export { default as PrincipalSalaoPage } from './pages/PrincipalSalaoPage';

/**
 * GUIA DE INTEGRAÇÃO (App.tsx):
 * 
 * 1. Importe a página:
 *    const PrincipalSalaoPage = lazy(() => import("./modules/dining").then(m => ({ default: m.PrincipalSalaoPage })));
 * 
 * 2. Substitua a rota antiga:
 *    <Route path="/principal/salao-pedidos" element={<ProtectedRoute><PrincipalSalaoPage /></ProtectedRoute>} />
 */
