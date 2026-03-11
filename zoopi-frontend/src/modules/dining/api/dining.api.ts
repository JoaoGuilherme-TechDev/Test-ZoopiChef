import api from "@/lib/api";
import { Table, Bill, BillItem, WaiterCall, TableStatus } from "../types";

export const diningApi = {
  // --- GESTÃO DE MESAS ---
  fetchTables: async (): Promise<Table[]> => {
    const { data } = await api.get("/tables");
    return data;
  },

  openTable: async (tableId: string, peopleCount: number): Promise<Bill> => {
    const { data } = await api.post(`/tables/${tableId}/open`, { people_count: peopleCount });
    return data;
  },

  updateTableStatus: async (tableId: string, status: TableStatus): Promise<void> => {
    await api.patch(`/tables/${tableId}/status`, { status });
  },

  // --- GESTÃO DE CONSUMO (CONTA) ---
  fetchBill: async (billId: string): Promise<Bill> => {
    const { data } = await api.get(`/bills/${billId}`);
    return data;
  },

  addItem: async (billId: string, item: Partial<BillItem>): Promise<Bill> => {
    const { data } = await api.post(`/bills/${billId}/items`, item);
    return data;
  },

  removeItem: async (billId: string, itemId: string, reason?: string): Promise<void> => {
    await api.delete(`/bills/${billId}/items/${itemId}`, { data: { reason } });
  },

  transferItems: async (sourceBillId: string, targetTableId: string, itemIds: string[]): Promise<void> => {
    await api.post(`/bills/transfer`, { sourceBillId, targetTableId, itemIds });
  },

  // --- FECHAMENTO E PAGAMENTO ---
  requestBill: async (tableId: string): Promise<void> => {
    // Muda o status para 'waiting_payment' e alerta o gerente
    await api.post(`/tables/${tableId}/request-bill`);
  },

  closeBill: async (billId: string, payload: {
    payments: Array<{ method: string; amount_cents: number; nsu?: string }>;
    discount_cents?: number;
    service_fee_cents?: number;
  }): Promise<void> => {
    await api.post(`/bills/${billId}/close`, payload);
  },

  // --- CHAMADOS DE GARÇOM ---
  fetchActiveCalls: async (): Promise<WaiterCall[]> => {
    const { data } = await api.get("/waiter-calls/active");
    return data;
  },

  resolveCall: async (callId: string): Promise<void> => {
    await api.patch(`/waiter-calls/${callId}/resolve`);
  }
};