import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { Category } from './useCategories';
import { toast } from 'sonner';

export interface Subcategory {
  id: string;
  company_id: string;
  category_id: string;
  name: string;
  active: boolean;
  production_location?: string | null;
  image_url?: string | null;
  category_type?: 'alacart' | 'bebida' | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

const mapSubcategoryToFrontend = (data: any): Subcategory => ({
  id: data.id,
  company_id: data.companyId,
  category_id: data.categoryId,
  name: data.name,
  active: data.active,
  // production_location: data.productionLocation, // Not in entity yet
  // image_url: data.imageUrl, // Not in entity yet
  // category_type: data.categoryType, // Not in entity yet
  created_at: data.createdAt,
  updated_at: data.updatedAt,
  category: data.category ? {
    id: data.category.id,
    company_id: data.category.companyId,
    name: data.category.name,
    active: data.category.active,
    sort_order: data.category.sortOrder,
    created_at: data.category.createdAt,
    updated_at: data.category.updatedAt,
  } : undefined,
});

const mapSubcategoryToBackend = (data: any): any => ({
  companyId: data.company_id,
  categoryId: data.category_id,
  name: data.name,
  active: data.active,
  // productionLocation: data.production_location,
  // imageUrl: data.image_url,
  // categoryType: data.category_type,
});

export function useSubcategories() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['subcategories', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const response = await api.get(`/subcategories?companyId=${company.id}`);
      return response.data.map(mapSubcategoryToFrontend);
    },
    enabled: !!company?.id,
  });
}

export function useSubcategoriesByCategory(categoryId: string | null) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['subcategories', 'byCategory', categoryId, company?.id],
    queryFn: async () => {
      if (!company?.id || !categoryId) return [];

      const response = await api.get(`/subcategories?companyId=${company.id}`);
      return response.data
        .filter((s: any) => s.categoryId === categoryId && s.active)
        .map(mapSubcategoryToFrontend);
    },
    enabled: !!company?.id && !!categoryId,
  });
}

export function useCreateSubcategory() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async ({
      name,
      category_id,
      active = true,
      production_location = null,
      category_type = null,
    }: {
      name: string;
      category_id: string;
      active?: boolean;
      production_location?: string | null;
      category_type?: 'alacart' | 'bebida' | null;
    }) => {
      if (!company?.id) throw new Error('Company not found');

      const payload = mapSubcategoryToBackend({
        company_id: company.id,
        category_id,
        name,
        active,
        production_location,
        category_type
      });

      const response = await api.post('/subcategories', payload);
      return mapSubcategoryToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar subcategoria');
    },
  });
}

export function useUpdateSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Subcategory> & { id: string }) => {
      const payload = mapSubcategoryToBackend(updates);
      const response = await api.put(`/subcategories/${id}`, payload);
      return mapSubcategoryToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar subcategoria');
    },
  });
}

export function useDeleteSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/subcategories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir subcategoria');
    },
  });
}
