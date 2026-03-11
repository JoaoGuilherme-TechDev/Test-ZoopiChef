// ================================================================
// FILE: src/api/tables.ts
// ================================================================

import { Table, TableFormData, TableStatus } from '@/modules/tables/types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? 'Erro inesperado');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Mesas ────────────────────────────────────────────────────────

export async function fetchTables(): Promise<Table[]> {
  const res = await fetch(`${BASE_URL}/tables`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<Table[]>(res);
}

export async function fetchTable(id: string): Promise<Table> {
  const res = await fetch(`${BASE_URL}/tables/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<Table>(res);
}

export async function createTable(data: TableFormData): Promise<Table> {
  const res = await fetch(`${BASE_URL}/tables`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Table>(res);
}

export async function updateTable(
  id: string,
  data: Partial<TableFormData>,
): Promise<Table> {
  const res = await fetch(`${BASE_URL}/tables/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Table>(res);
}

export async function updateTableStatus(
  id: string,
  status: TableStatus,
): Promise<Table> {
  const res = await fetch(`${BASE_URL}/tables/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  return handleResponse<Table>(res);
}

export async function deleteTable(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/tables/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<void>(res);
}

// ── Conta da Mesa (via Orders) ────────────────────────────────────

export interface CreateOrderPayload {
  table_number: string;
  items: {
    product_id: string;
    quantity: number;
    notes?: string;
  }[];
  customer_name?: string;
}

export interface OrderResponse {
  id: string;
  order_number: number;
  table_number: string;
  status: string;
  total: string;
  items: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: string;
    notes?: string;
  }[];
  created_at: string;
  updated_at: string;
}

export async function fetchTableOrders(
  tableNumber: string,
): Promise<OrderResponse[]> {
  const res = await fetch(`${BASE_URL}/orders?table_number=${tableNumber}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<OrderResponse[]>(res);
}

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<OrderResponse> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<OrderResponse>(res);
}

export async function closeTableOrder(
  orderId: string,
  paymentMethod: string,
): Promise<OrderResponse> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status: 'delivered', payment_method: paymentMethod }),
  });
  return handleResponse<OrderResponse>(res);
}