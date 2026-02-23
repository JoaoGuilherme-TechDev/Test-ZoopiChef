import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import api from '@/lib/api';

export interface OptionalGroupItem {
  id: string;
  company_id: string;
  optional_group_id: string;
  label: string;
  price_delta: number;
  price_override: number | null;
  product_id: string | null;
  sort_order: number;
  active: boolean;
  flavor_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export type OptionalGroupSourceType = 'manual' | 'flavors' | 'products';

export interface OptionalGroup {
  id: string;
  company_id: string;
  name: string;
  active: boolean;
  min_select: number;
  max_select: number;
  required: boolean;
  selection_unique: boolean;
  calc_mode: string | null;
  source_type: OptionalGroupSourceType;
  flavor_group_id: string | null;
  subcategory_id: string | null;
  created_at?: string;
  updated_at?: string;
  items?: OptionalGroupItem[];
}

// Helpers for mapping
const mapItemToFrontend = (item: any): OptionalGroupItem => ({
  id: item.id,
  company_id: item.group?.companyId || '', // Nested group might not always be populated fully
  optional_group_id: item.optionalGroupId,
  label: item.label,
  price_delta: Number(item.priceDelta),
  price_override: item.priceOverride ? Number(item.priceOverride) : null,
  product_id: item.productId,
  sort_order: item.sortOrder,
  active: item.active,
  flavor_id: item.flavorId,
  created_at: item.createdAt,
  updated_at: item.updatedAt,
});

const mapItemToBackend = (item: any): any => ({
  optionalGroupId: item.optional_group_id,
  label: item.label,
  priceDelta: item.price_delta,
  priceOverride: item.price_override,
  productId: item.product_id,
  sortOrder: item.sort_order,
  active: item.active,
  flavorId: item.flavor_id,
});

const mapGroupToFrontend = (group: any): OptionalGroup => ({
  id: group.id,
  company_id: group.companyId,
  name: group.name,
  active: group.active,
  min_select: group.minSelect,
  max_select: group.maxSelect,
  required: group.required,
  selection_unique: group.selectionUnique,
  calc_mode: group.calcMode,
  source_type: group.sourceType as OptionalGroupSourceType,
  flavor_group_id: group.flavorGroupId,
  subcategory_id: group.subcategoryId,
  created_at: group.createdAt,
  updated_at: group.updatedAt,
  items: group.items?.map(mapItemToFrontend),
});

const mapGroupToBackend = (group: any): any => ({
  companyId: group.company_id,
  name: group.name,
  active: group.active,
  minSelect: group.min_select,
  maxSelect: group.max_select,
  required: group.required,
  selectionUnique: group.selection_unique,
  calcMode: group.calc_mode,
  sourceType: group.source_type,
  flavorGroupId: group.flavor_group_id,
  subcategoryId: group.subcategory_id,
});

export function useOptionalGroups() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['optional-groups', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const response = await api.get(`/optional-groups?companyId=${company.id}`);
      return response.data.map(mapGroupToFrontend);
    },
    enabled: !!company?.id,
  });
}

export function useCreateOptionalGroup() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (group: Partial<Omit<OptionalGroup, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'items'>> & { name: string }) => {
      if (!company?.id) throw new Error('Company not found');

      const payload = mapGroupToBackend({ ...group, company_id: company.id });
      const response = await api.post('/optional-groups', payload);
      return mapGroupToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optional-groups'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar grupo opcional');
    },
  });
}

export function useUpdateOptionalGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OptionalGroup> & { id: string }) => {
      const payload = mapGroupToBackend(updates);
      const response = await api.put(`/optional-groups/${id}`, payload);
      return mapGroupToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optional-groups'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar grupo opcional');
    },
  });
}

export function useDeleteOptionalGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/optional-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optional-groups'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir grupo opcional');
    },
  });
}

export function useCreateOptionalGroupItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newItem: Partial<OptionalGroupItem>) => {
      const payload = mapItemToBackend(newItem);
      const response = await api.post('/optional-groups/items', payload);
      return mapItemToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optional-groups'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar item');
    },
  });
}

export function useUpdateOptionalGroupItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OptionalGroupItem> & { id: string }) => {
      const payload = mapItemToBackend(updates);
      const response = await api.put(`/optional-groups/items/${id}`, payload);
      return mapItemToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optional-groups'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar item');
    },
  });
}

export function useDeleteOptionalGroupItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/optional-groups/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optional-groups'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir item');
    },
  });
}

export function useSyncProductsToGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, subcategoryId }: { groupId: string; subcategoryId: string }) => {
      const response = await api.post(`/optional-groups/${groupId}/sync-products`, { subcategoryId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optional-groups'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao sincronizar produtos');
    },
  });
}
