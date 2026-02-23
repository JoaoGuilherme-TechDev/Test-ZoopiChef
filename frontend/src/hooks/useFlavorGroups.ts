import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompanyContext } from '@/contexts/CompanyContext';
import api from '@/lib/api';

export interface FlavorGroup {
  id: string;
  company_id: string;
  name: string;
  active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

// Helper to map NestJS response (camelCase) to Frontend interface (snake_case)
const mapToFrontend = (data: any): FlavorGroup => ({
  id: data.id,
  company_id: data.companyId,
  name: data.name,
  active: data.active,
  sort_order: data.sortOrder || 0,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

// Helper to map Frontend input (snake_case) to NestJS DTO (camelCase)
const mapToBackend = (data: any): any => ({
  companyId: data.company_id,
  name: data.name,
  active: data.active,
  sortOrder: data.sort_order,
});

export function useFlavorGroups() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['flavor-groups', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const response = await api.get(`/flavor-groups?companyId=${company.id}`);
      return response.data.map(mapToFrontend);
    },
    enabled: !!company?.id,
  });
}

export function useActiveFlavorGroups() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['flavor-groups', 'active', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const response = await api.get(`/flavor-groups?companyId=${company.id}`);
      // Filter active on client side since the API endpoint currently returns all
      // Or we could add an 'active' query param to the backend
      return response.data
        .filter((g: any) => g.active)
        .map(mapToFrontend);
    },
    enabled: !!company?.id,
  });
}

export function useCreateFlavorGroup() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (group: Partial<FlavorGroup>) => {
      if (!company?.id) throw new Error('Company not found');

      const payload = mapToBackend({ ...group, company_id: company.id });
      const response = await api.post('/flavor-groups', payload);
      return mapToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flavor-groups'] });
    },
  });
}

export function useUpdateFlavorGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FlavorGroup> & { id: string }) => {
      const payload = mapToBackend(updates);
      const response = await api.put(`/flavor-groups/${id}`, payload);
      return mapToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flavor-groups'] });
    },
  });
}

export function useDeleteFlavorGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/flavor-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flavor-groups'] });
    },
  });
}
