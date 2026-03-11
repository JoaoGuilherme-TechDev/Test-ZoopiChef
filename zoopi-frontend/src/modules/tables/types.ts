// ================================================================
// FILE: modules/tables/types.ts
// ================================================================

import { SessionPayment } from "./api";

export type TableStatus = "free" | "occupied" | "no_consumption" | "payment" | "reserved";

export interface RestaurantTable {
  id: string;
  number: number;
  name: string;
  capacity: number;
  section?: string | null;
  status: TableStatus;
  commandCount?: number;
  occupiedSince?: Date | null;
  orderTotal?: number;
}

export interface TableFormData {
  number: number;
  name: string;
  capacity: number;
  section?: string;
}

export interface StatusDisplayConfig {
  label: string;
  circleClass: string;
  cardClass: string;
  badgeClass: string;
  dotClass: string;
}

export const TABLE_STATUS_CONFIG: Record<TableStatus, StatusDisplayConfig> = {
  free: {
    label: "Livre",
    circleClass: "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]",
    cardClass: "border-green-600/40 bg-green-500/10",
    badgeClass: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
    dotClass: "bg-green-500",
  },
  occupied: {
    label: "Ocupada",
    circleClass: "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]",
    cardClass: "border-blue-600/40 bg-blue-500/10",
    badgeClass: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
    dotClass: "bg-blue-500",
  },
  no_consumption: {
    label: "Sem consumo",
    circleClass: "bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.5)]",
    cardClass: "border-yellow-600/40 bg-yellow-500/10",
    badgeClass: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
    dotClass: "bg-yellow-500",
  },
  payment: {
    label: "Conta",
    circleClass: "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]",
    cardClass: "border-red-600/40 bg-red-500/10",
    badgeClass: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
    dotClass: "bg-red-500",
  },
  reserved: {
    label: "Reservada",
    circleClass: "bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.5)]",
    cardClass: "border-orange-600/40 bg-orange-500/10",
    badgeClass: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30",
    dotClass: "bg-orange-500",
  },
};

// ─── Session types ────────────────────────────────────────────────────────────

export type CommandStatus = "open" | "closed";

export interface Command {
  id: string;
  tableId: string;
  name: string;
  status: CommandStatus;
  itemCount: number;
  total: number;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  commandId: string;
  commandName: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  note?: string;
}

export interface ProductOption {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
  description?: string;
  options?: ProductOption[];
  // nested option groups from the products API
  optionsGroups?: {
    group: {
      id: string;
      name: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: any[];
      min_qty: number;
      max_qty: number;
    };
  }[];
}

export interface TableSessionData {
  tableId: string;
  tableName: string;
  tableNumber: number;
  serviceType?: string;
  commands: Command[];
  items: OrderItem[];
  /** Payments already registered for this session */
  payments: SessionPayment[];
  /** Sum of all item totals */
  total: number;
  /** Sum of all confirmed payments */
  paidTotal: number;
  /** total - paidTotal (never negative) */
  remaining: number;
}

export type SessionTab = "itens" | "lancar" | "comandas" | "transferir" | "opcoes";

// ─── CartItem ─────────────────────────────────────────────────────────────────

export interface CartItem {
  cartItemId: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  options: ProductOption[];
}

// ─── Filter bar config ────────────────────────────────────────────────────────

export type TableFilterKey = TableStatus | "all";

export const TABLE_STAT_FILTERS: { key: TableFilterKey; label: string; dotClass: string }[] = [
  { key: "all",            label: "Total",       dotClass: "bg-foreground" },
  { key: "free",           label: "Livres",      dotClass: "bg-green-500" },
  { key: "occupied",       label: "Ocupadas",    dotClass: "bg-blue-500" },
  { key: "no_consumption", label: "Sem consumo", dotClass: "bg-yellow-500" },
  { key: "payment",        label: "Conta",       dotClass: "bg-red-500" },
  { key: "reserved",       label: "Reservadas",  dotClass: "bg-orange-500" },
];