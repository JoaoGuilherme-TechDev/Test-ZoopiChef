// --- ESTADOS DA MESA ---
export type TableStatus = 
  | 'free'            // Verde: Disponível
  | 'occupied'        // Azul: Cliente consumindo
  | 'waiting_payment' // Roxo: Pediu a conta/fechamento
  | 'reserved'        // Amarelo: Reserva agendada
  | 'cleaning'        // Cinza: Cliente saiu, aguardando limpeza
  | 'blocked';        // Vermelho: Mesa interditada

// --- INTERFACES PRINCIPAIS ---
export interface Table {
  id: string;
  number: number;
  name: string;
  capacity: number;
  status: TableStatus;
  section: string; // Ex: 'Salão Principal', 'Varanda', 'VIP'
  current_bill_id?: string;
  active_call_id?: string; // ID de um chamado de garçom ativo
  total_consumption_cents: number;
  opened_at?: string;
  last_order_at?: string;
}

// --- ITENS DE CONSUMO ---
export type ItemStatus = 'ordered' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface BillItem {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  status: ItemStatus;
  notes?: string;
  ordered_at: string;
  waiter_id?: string;
  category_name?: string;
}

// --- FINANCEIRO DA MESA ---
export interface Bill {
  id: string;
  table_id: string;
  items: BillItem[];
  subtotal_cents: number;
  service_fee_cents: number;
  discount_cents: number;
  total_cents: number;
  is_split: boolean;
  people_count: number;
  payments: Payment[];
  status: 'open' | 'closed';
}

export interface Payment {
  id: string;
  method: 'pix' | 'credit' | 'debit' | 'cash' | 'voucher';
  amount_cents: number;
  paid_at: string;
  nsu?: string;
}

// --- CHAMADOS DE SALÃO ---
export type CallType = 'waiter' | 'bill' | 'cleaning';

export interface WaiterCall {
  id: string;
  table_id: string;
  table_name: string;
  type: CallType;
  status: 'pending' | 'attending' | 'resolved';
  created_at: string;
  priority: number; // 1: Baixa, 2: Média, 3: Urgente (ex: Pediu conta)
}

// --- FILTROS DE INTERFACE ---
export interface DiningFilters {
  section?: string;
  status?: TableStatus;
  search?: string;
}
export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  free: "Livre",
  occupied: "Ocupada",
  waiting_payment: "Pediu Conta",
  reserved: "Reservada",
  cleaning: "Limpeza",
  blocked: "Bloqueada",
};