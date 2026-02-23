import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface Category {
  id: string;
  company_id: string;
  name: string;
  active: boolean;
  production_location?: string | null;
  image_url?: string | null;
  category_type?: 'alacart' | 'bebida' | null;
  created_at: string;
  updated_at: string;
  sort_order?: number;
}

const mapCategoryToFrontend = (data: any): Category => ({
  id: data.id,
  company_id: data.companyId,
  name: data.name,
  active: data.active,
  production_location: data.productionLocation,
  image_url: data.imageUrl,
  category_type: data.categoryType,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
  sort_order: data.sortOrder,
});

const mapCategoryToBackend = (data: any): any => ({
  companyId: data.company_id,
  name: data.name,
  active: data.active,
  productionLocation: data.production_location,
  imageUrl: data.image_url,
  categoryType: data.category_type,
  sortOrder: data.sort_order,
});

export function useCategories() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['categories', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const response = await api.get(`/categories?companyId=${company.id}`);
      return response.data.map(mapCategoryToFrontend);
    },
    enabled: !!company?.id,
  });
}

export function useActiveCategories() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['categories', 'active', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const response = await api.get(`/categories?companyId=${company.id}`);
      return response.data
        .filter((c: any) => c.active)
        .map(mapCategoryToFrontend);
    },
    enabled: !!company?.id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async ({
      name,
      active = true,
      production_location = null,
      category_type = 'alacart',
    }: {
      name: string;
      active?: boolean;
      production_location?: string | null;
      category_type?: 'alacart' | 'bebida';
    }) => {
      if (!company?.id) throw new Error('Company not found');

      const payload = mapCategoryToBackend({
        company_id: company.id,
        name,
        active,
        production_location,
        category_type
      });

      const response = await api.post('/categories', payload);
      return mapCategoryToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar categoria');
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const payload = mapCategoryToBackend(updates);
      const response = await api.put(`/categories/${id}`, payload);
      return mapCategoryToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar categoria');
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir categoria');
    },
  });
}
