import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { diningApi } from "../api/dining.api";
import { DiningFilters, TableStatus } from "../types";
import { useMemo } from "react";

export function useDining(filters: DiningFilters = {}) {
  const queryClient = useQueryClient();

  // 1. Busca global de mesas
  const { data: tables = [], isLoading, refetch } = useQuery({
    queryKey: ["dining-tables"],
    queryFn: diningApi.fetchTables,
    refetchInterval: 10000, // Atualiza a cada 10s para ver mudanças de outros garçons
  });

  // 2. Lógica de Filtragem (Memorizada para performance)
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const matchesSearch = !filters.search || 
        table.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        table.number.toString() === filters.search;
      
      const matchesStatus = !filters.status || table.status === filters.status;
      const matchesSection = !filters.section || table.section === filters.section;

      return matchesSearch && matchesStatus && matchesSection;
    });
  }, [tables, filters]);

  // 3. Indicadores (KPIs) do Salão
  const stats = useMemo(() => {
    return {
      total: tables.length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      waitingPayment: tables.filter(t => t.status === 'waiting_payment').length,
      free: tables.filter(t => t.status === 'free').length,
      revenueInOpenBills: tables.reduce((acc, t) => acc + (t.total_consumption_cents || 0), 0)
    };
  }, [tables]);

  // 4. Seções únicas para o filtro
  const sections = useMemo(() => {
    return Array.from(new Set(tables.map(t => t.section))).filter(Boolean);
  }, [tables]);

  // 5. Mutação para trocar status rápido (ex: marcar como limpeza)
  const updateStatus = useMutation({
    mutationFn: ({ tableId, status }: { tableId: string, status: TableStatus }) => 
      diningApi.updateTableStatus(tableId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dining-tables"] });
    }
  });

  return {
    tables: filteredTables,
    allTables: tables,
    sections,
    stats,
    isLoading,
    refresh: refetch,
    updateStatus: updateStatus.mutate
  };
}