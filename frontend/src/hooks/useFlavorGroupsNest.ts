import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface FlavorGroup {
  id: string;
  companyId: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export function useFlavorGroupsNest(companyId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['flavor-groups', companyId],
    queryFn: async () => {
      const response = await api.get(`/flavor-groups?companyId=${companyId}`);
      return response.data;
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async (newGroup: Partial<FlavorGroup>) => {
      const response = await api.post('/flavor-groups', newGroup);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flavor-groups', companyId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FlavorGroup> }) => {
      const response = await api.put(`/flavor-groups/${id}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flavor-groups', companyId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/flavor-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flavor-groups', companyId] });
    },
  });

  return {
    flavorGroups: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createFlavorGroup: createMutation.mutate,
    updateFlavorGroup: updateMutation.mutate,
    deleteFlavorGroup: deleteMutation.mutate,
  };
}
