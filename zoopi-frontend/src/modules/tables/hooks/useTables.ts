// ================================================================
// FILE: modules/tables/hooks/useTables.ts
// Data fetching and mutations for the tables module
// ================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tablesApi } from "../api";
import { TableFormData, TableStatus } from "../types";

export function useTables() {
  const queryClient = useQueryClient();

  // ── Query ─────────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: tablesApi.fetchAll,
    refetchInterval: 15000,
  });

  const tables = data ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (formData: TableFormData) => tablesApi.create(formData),
    onSuccess: (table) => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success(`Mesa "${table.name}" criada com sucesso!`);
    },
    onError: () => toast.error("Erro ao criar mesa."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: TableFormData }) =>
      tablesApi.update(id, formData),
    onSuccess: (table) => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success(`Mesa "${table.name}" atualizada!`);
    },
    onError: () => toast.error("Erro ao atualizar mesa."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tablesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Mesa removida.");
    },
    onError: () => toast.error("Erro ao remover mesa."),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) =>
      tablesApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: () => toast.error("Erro ao atualizar status da mesa."),
  });

  // ── Exposed helpers ───────────────────────────────────────────────────────────

  return {
    tables,
    isLoading,
    createTable: (formData: TableFormData) => createMutation.mutate(formData),
    updateTable: (id: string, formData: TableFormData) =>
      updateMutation.mutate({ id, formData }),
    deleteTable: (id: string) => deleteMutation.mutate(id),
    updateTableStatus: (id: string, status: TableStatus) =>
      updateStatusMutation.mutate({ id, status }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
