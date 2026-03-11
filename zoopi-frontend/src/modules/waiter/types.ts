// ================================================================
// FILE: waiter/types.ts
// All shared types and status display configs for the waiter module
// ================================================================

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export type WaitlistStatus = "waiting" | "notified" | "seated" | "cancelled" | "no_show";

export interface WaitlistEntry {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  party_size: number;
  special_requests?: string | null;
  status: WaitlistStatus;
  requested_at: string;
  notified_at?: string | null;
  seated_at?: string | null;
  assigned_table_id?: string | null;
  assignedTable?: {
    id: string;
    number: number;
    name: string | null;
    capacity: number;
  } | null;
}

export interface AvailableTable {
  id: string;
  number: number;
  name: string | null;
  capacity: number;
}

export interface WaitlistResponse {
  entries: WaitlistEntry[];
  availableTables: AvailableTable[];
}

// ─── Tables ───────────────────────────────────────────────────────────────────

export type TableStatus = "free" | "occupied" | "no_consumption" | "payment" | "reserved";

export interface RestaurantTable {
  id: string;
  number: number;
  status: TableStatus;
  commandCount?: number;
  occupiedSince?: Date;
  orderTotal?: number;
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

// ─── Comandas ─────────────────────────────────────────────────────────────────

export type ComandaStatus = "free" | "occupied" | "no_consumption" | "payment" | "closed";

export interface Comanda {
  id: string;
  number: number;
  status: ComandaStatus;
  clientName?: string;
  openedAt?: Date;
  total?: number;
  serviceCharge?: number;
}

export const COMANDA_STATUS_CONFIG: Record<ComandaStatus, StatusDisplayConfig> = {
  free: {
    label: "Livre",
    circleClass: "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.45)]",
    cardClass: "border-green-600/40 bg-green-500/10",
    badgeClass: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
    dotClass: "bg-green-500",
  },
  occupied: {
    label: "Em consumo",
    circleClass: "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.45)]",
    cardClass: "border-blue-600/40 bg-blue-500/10",
    badgeClass: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
    dotClass: "bg-blue-500",
  },
  no_consumption: {
    label: "Sem consumo",
    circleClass: "bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.45)]",
    cardClass: "border-yellow-600/40 bg-yellow-500/10",
    badgeClass: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
    dotClass: "bg-yellow-500",
  },
  payment: {
    label: "Conta",
    circleClass: "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.45)]",
    cardClass: "border-red-600/40 bg-red-500/10",
    badgeClass: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
    dotClass: "bg-red-500",
  },
  closed: {
    label: "Fechada",
    circleClass: "bg-zinc-500",
    cardClass: "border-zinc-400/40 bg-zinc-500/10",
    badgeClass: "bg-zinc-500/20 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
    dotClass: "bg-zinc-500",
  },
};

// ─── Filter bar configs ───────────────────────────────────────────────────────

export type TableFilterKey = TableStatus | "all";
export type ComandaFilterKey = ComandaStatus | "all";

export const TABLE_STAT_FILTERS: { key: TableFilterKey; label: string; dotClass: string }[] = [
  { key: "all",            label: "Total",       dotClass: "bg-foreground" },
  { key: "free",           label: "Livres",      dotClass: "bg-green-500" },
  { key: "occupied",       label: "Ocupadas",    dotClass: "bg-blue-500" },
  { key: "no_consumption", label: "Sem consumo", dotClass: "bg-yellow-500" },
  { key: "payment",        label: "Conta",       dotClass: "bg-red-500" },
  { key: "reserved",       label: "Reservadas",  dotClass: "bg-orange-500" },
];

export const COMANDA_STAT_FILTERS: { key: ComandaFilterKey; label: string; dotClass: string }[] = [
  { key: "all",            label: "Total",       dotClass: "bg-foreground" },
  { key: "free",           label: "Livres",      dotClass: "bg-green-500" },
  { key: "occupied",       label: "Ocupadas",    dotClass: "bg-blue-500" },
  { key: "no_consumption", label: "Sem consumo", dotClass: "bg-yellow-500" },
  { key: "payment",        label: "Conta",       dotClass: "bg-red-500" },
  { key: "closed",         label: "Fechadas",    dotClass: "bg-zinc-500" },
];