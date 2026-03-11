// src/hooks/useBatchLinkOptionGroups.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface BatchOptionGroupLink {
  groupId: string;
  minSelect?: number;
  maxSelect?: number;
  sortOrder?: number;
  calcMode?: string;
}

export function useOptionGroupsForBatch() {
  return useQuery({
    queryKey: ["options-groups", "batch"],
    queryFn: async () => {
      const response = await api.get("/options-groups/batch-list");
      return response.data;
    },
  });
}

export function useBatchDirectLinkOptionGroups() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { productIds: string[], groupLinks: BatchOptionGroupLink[] }) => {
      return api.post("/batch-actions/link-optionals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  });
}

export function useBatchRemoveOptionGroups() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { productIds: string[], groupIds: string[] }) => {
      return api.post("/batch-actions/remove-optionals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  });
}