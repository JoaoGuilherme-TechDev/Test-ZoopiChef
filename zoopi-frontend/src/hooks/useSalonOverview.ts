import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

// Interfaces para os dados que o seu NestJS deve retornar
export interface SalonSummary {
  ocupadas: number;
  reservadas: number;
  aguardando: number;
  total: number;
}

export interface RecentOrder {
  id: string;
  label: string;
  time: string;
  type: string;
  status: string;
}

export function useSalonOverview() {
  return useQuery({
    queryKey: ["salon-overview"],
    queryFn: async () => {
      const response = await api.get<SalonSummary>("/orders/salon-overview");
      return response.data;
    },
    refetchInterval: 20000,
    refetchOnWindowFocus: false,
  });
}

export function useRecentActiveOrders(limit = 5) {
  return useQuery({
    queryKey: ["recent-active-orders", limit],
    queryFn: async () => {
      const response = await api.get<RecentOrder[]>(`/orders/recent?limit=${limit}`);
      return response.data;
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: false,
  });
}

export function useWaiterCallsCount() {
  return useQuery({
    queryKey: ["waiter-calls-count"],
    queryFn: async () => {
      const response = await api.get<{ count: number }>("/waiter-calls/count");
      return response.data.count || 0;
    },
    refetchInterval: 20000,
    refetchOnWindowFocus: false,
  });
}