import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

// Adicionamos a interface para os itens do gráfico
export interface ChartDataItem {
  name: string;
  total: number;
}

export interface DashboardStats {
  vendas_hoje: number;
  pedidos_hoje: number;
  ticket_medio: number;
  clientes_novos: number;
  vendas_tendencia: string;
  pedidos_ativos: number;
  chartData: ChartDataItem[]; // <-- Linha adicionada para resolver o erro
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await api.get<DashboardStats>("/dashboard/stats");
      return response.data;
    },
    refetchInterval: 30000, 
    refetchOnWindowFocus: false,
  });
}