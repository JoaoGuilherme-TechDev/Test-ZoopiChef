// ================================================================
// FILE: modules/tables/api.ts
// ================================================================

import api from "@/lib/api";
import {
  RestaurantTable, TableFormData, TableStatus,
  Command, OrderItem, Product, TableSessionData,
} from "./types";

// ── Normalizers ───────────────────────────────────────────────────────────────

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

function mapTable(raw: any): RestaurantTable {
  return {
    ...raw,
    number:    toNumber(raw.number),
    capacity:  toNumber(raw.capacity),
    commandCount:
      raw.commandCount === undefined || raw.commandCount === null
        ? undefined
        : toNumber(raw.commandCount),
    orderTotal:
      raw.orderTotal === undefined || raw.orderTotal === null
        ? undefined
        : toNumber(raw.orderTotal),
    // Map snake_case from backend → camelCase for frontend
    occupiedSince: toDate(raw.occupied_since ?? raw.occupiedSince),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCommand(raw: any): Command {
  return {
    id:        raw.id,
    tableId:   raw.table_id   ?? raw.tableId,
    name:      raw.name,
    status:    raw.status,
    itemCount: toNumber(raw.item_count ?? raw.itemCount ?? 0),
    total:     toNumber(raw.total ?? 0),
    createdAt: raw.created_at ?? raw.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrderItem(raw: any): OrderItem {
  const unitPrice = toNumber(raw.unit_price ?? raw.unitPrice);
  const quantity  = toNumber(raw.quantity);

  return {
    id:          raw.id,
    commandId:   raw.command_id   ?? raw.commandId   ?? null,
    commandName: raw.command?.name ?? raw.commandName ?? "—",
    productId:   raw.product_id   ?? raw.productId,
    productName: raw.product?.name ?? raw.productName ?? "Produto",
    quantity,
    unitPrice,
    total:       unitPrice * quantity,
    note:        raw.note ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPayment(raw: any): SessionPayment {
  return {
    id:           raw.id,
    amount:       toNumber(raw.amount),
    method:       raw.method ?? raw.payment_method,
    mode:         raw.mode   ?? raw.payment_mode,
    customerName: raw.customer?.name ?? raw.customer_name ?? undefined,
    customerId:   raw.customer_id     ?? raw.customerId    ?? undefined,
    commandId:    raw.command_id      ?? raw.commandId     ?? undefined,
    createdAt:    raw.created_at      ?? raw.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSession(raw: any): TableSessionData {
  const items    = Array.isArray(raw.items)    ? raw.items.map(mapOrderItem)   : [];
  const commands = Array.isArray(raw.commands) ? raw.commands.map(mapCommand)  : [];
  const payments = Array.isArray(raw.payments) ? raw.payments.map(mapPayment)  : [];

  const enrichedCommands = commands.map((cmd: Command) => {
    const cmdItems = items.filter((i: OrderItem) => i.commandId === cmd.id);
    return {
      ...cmd,
      itemCount: cmdItems.length,
      total:     cmdItems.reduce((sum: number, i: OrderItem) => sum + i.total, 0),
    };
  });

  const grossTotal  = items.reduce((sum: number, i: OrderItem) => sum + i.total, 0);
  const paidTotal   = payments.reduce((sum: number, p: SessionPayment) => sum + p.amount, 0);
  const remaining   = Math.max(0, grossTotal - paidTotal);

  return {
    tableId:     raw.table?.id     ?? raw.tableId,
    tableName:   raw.table?.name   ?? raw.tableName,
    tableNumber: toNumber(raw.table?.number ?? raw.tableNumber),
    serviceType: raw.serviceType   ?? undefined,
    commands:    enrichedCommands,
    items,
    payments,
    total:       grossTotal,
    paidTotal,
    remaining,
  };
}

// ─── Payment type (shared) ────────────────────────────────────────────────────

export interface SessionPayment {
  id: string;
  amount: number;
  method: string;
  mode: string;
  customerName?: string;
  customerId?: string;
  commandId?: string;
  createdAt: string;
}

export interface SubmitPaymentPayload {
  mode:          "total" | "parcial" | "por_comanda" | "adiantamento";
  method:        "dinheiro" | "credito" | "debito" | "pix" | "maquininha";
  amount:        number;
  customerId?:   string;
  customerName?: string;
  commandId?:    string;
}

// ── Tables CRUD ───────────────────────────────────────────────────────────────

export const tablesApi = {
  fetchAll: (): Promise<RestaurantTable[]> =>
    api.get("/tables").then((r) => (Array.isArray(r.data) ? r.data.map(mapTable) : [])),

  create: (data: TableFormData): Promise<RestaurantTable> =>
    api.post("/tables", data).then((r) => mapTable(r.data)),

  update: (id: string, data: TableFormData): Promise<RestaurantTable> =>
    api.patch(`/tables/${id}`, data).then((r) => mapTable(r.data)),

  remove: (id: string): Promise<void> =>
    api.delete(`/tables/${id}`).then((r) => r.data),

  updateStatus: (id: string, status: TableStatus): Promise<RestaurantTable> =>
    api.patch(`/tables/${id}/status`, { status }).then((r) => mapTable(r.data)),
};

// ── Session ───────────────────────────────────────────────────────────────────

export const tableSessionApi = {
  getSession: (tableId: string): Promise<TableSessionData> =>
    api.get(`/tables/${tableId}/session`).then((r) => mapSession(r.data)),

  closeTable: (tableId: string): Promise<void> =>
    api.post(`/tables/${tableId}/close`).then((r) => r.data),

  printBill: (tableId: string): Promise<void> =>
    api.post(`/tables/${tableId}/print`).then((r) => r.data),

  // ── Payment ───────────────────────────────────────────────────
  submitPayment: (tableId: string, payload: SubmitPaymentPayload): Promise<void> =>
    api.post(`/tables/${tableId}/payments`, {
      mode:           payload.mode,
      method:         payload.method,
      amount:         payload.amount,
      customer_id:    payload.customerId   ?? null,
      customer_name:  payload.customerName ?? null,
      command_id:     payload.commandId    ?? null,
    }).then((r) => r.data),

  // ── Commands ──────────────────────────────────────────────────
  createCommand: (tableId: string, name: string): Promise<Command> =>
    api.post(`/tables/${tableId}/commands`, { name }).then((r) => mapCommand(r.data)),

  closeCommand: (tableId: string, commandId: string): Promise<Command> =>
    api.patch(`/tables/${tableId}/commands/${commandId}/close`).then((r) => mapCommand(r.data)),

  // ── Items ─────────────────────────────────────────────────────
  deleteItem: (tableId: string, itemId: string): Promise<void> =>
    api.delete(`/tables/${tableId}/items/${itemId}`).then((r) => r.data),

  deleteAllItems: (tableId: string): Promise<void> =>
    api.delete(`/tables/${tableId}/items`).then((r) => r.data),

  // ── Products ──────────────────────────────────────────────────
  getProducts: (): Promise<Product[]> =>
    api.get("/products").then((r) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      r.data.map((p: any): Product => ({
        id:          p.id,
        name:        p.name,
        price:       Number(
          p.is_on_sale && p.sale_price
            ? p.sale_price
            : p.prices?.[0]?.price ?? p.sale_price ?? p.price ?? 0
        ),
        category:    p.category?.name ?? p.category_name ?? p.category ?? "Geral",
        imageUrl:    p.image_url ?? p.imageUrl,
        description: p.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options: Array.isArray(p.options)
          ? p.options.map((o: any) => ({
              id:    o.id,
              name:  o.name,
              price: Number(o.price ?? 0),
            }))
          : [],
        // preserve optionsGroups for TabLancar optionals modal
        optionsGroups: p.optionsGroups ?? p.options_groups ?? [],
      }))
    ),

  // ── Launch order ──────────────────────────────────────────────
  launchOrder: (
    tableId: string,
    payload: {
      commandId: string;
      items: { productId: string; quantity: number; note?: string }[];
    }
  ): Promise<void> =>
    api.post(`/tables/${tableId}/orders`, {
      items: payload.items.map((item) => ({
        command_id: payload.commandId,
        product_id: item.productId,
        quantity:   item.quantity,
        note:       item.note,
      })),
    }).then((r) => r.data),

  // ── Transfer ──────────────────────────────────────────────────
  transferItems: (
    tableId: string,
    payload: {
      itemIds:          string[];
      targetTableId:    string;
      targetCommandId?: string;
      newCommandName?:  string;
    }
  ): Promise<void> =>
    api.post(`/tables/${tableId}/transfer/items`, {
      item_ids:          payload.itemIds,
      target_table_id:   payload.targetTableId,
      target_command_id: payload.targetCommandId,
    }).then((r) => r.data),

  transferTable: (tableId: string, targetTableId: string): Promise<void> =>
    api.post(`/tables/${tableId}/transfer/table`, {
      target_table_id: targetTableId,
    }).then((r) => r.data),

  mergeTables: (tableId: string, targetTableId: string): Promise<void> =>
    api.post(`/tables/${tableId}/merge`, {
      source_table_id: targetTableId,
    }).then((r) => r.data),

  // ── Cashier ───────────────────────────────────────────────────
  openCashDrawer: (): Promise<void> =>
    api.post("/cashier/open-drawer").then((r) => r.data),

  sangria: (): Promise<void> =>
    api.post("/cashier/sangria").then((r) => r.data),

  closeCashier: (): Promise<void> =>
    api.post("/cashier/close").then((r) => r.data),
};