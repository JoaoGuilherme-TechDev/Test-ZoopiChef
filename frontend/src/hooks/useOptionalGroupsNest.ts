import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface OptionalGroup {
  id: string;
  companyId: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  items: OptionalGroupItem[];
}

export interface OptionalGroupItem {
  id: string;
  optionalGroupId: string;
  name: string;
  price: number;
  active: boolean;
}

export function useOptionalGroupsNest(companyId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['optional-groups', companyId],
    queryFn: async () => {
      const response = await api.get(`/optional-groups?companyId=${companyId}`);
      return response.data;
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async (newGroup: Partial<OptionalGroup>) => {
      const response = await api.post('/optional-groups', newGroup);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optional-groups', companyId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<OptionalGroup> }) => {
      const response = await api.put(`/optional-groups/${id}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optional-groups', companyId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/optional-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optional-groups', companyId] });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (newItem: Partial<OptionalGroupItem>) => {
      const response = await api.post('/optional-groups/items', newItem);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optional-groups', companyId] });
    },
  });

  return {
    optionalGroups: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createOptionalGroup: createMutation.mutate,
    updateOptionalGroup: updateMutation.mutate,
    deleteOptionalGroup: deleteMutation.mutate,
    createOptionalGroupItem: createItemMutation.mutate,
  };
}
