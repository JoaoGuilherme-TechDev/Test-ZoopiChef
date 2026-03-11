/* eslint-disable @typescript-eslint/no-explicit-any */
// src/hooks/useBatchActions.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export function useBatchUpdateProductionLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { entityType: string, entityIds: string[], productionLocation: string }) => {
      return api.post("/batch-actions/production-location", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  });
}

export function useBatchToggleVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { productIds: string[], visibility: any }) => {
      return api.post("/batch-actions/visibility", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  });
}

export function useBatchToggleActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { entityType: string, entityIds: string[], active: boolean }) => {
      return api.post("/batch-actions/status", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  });
}