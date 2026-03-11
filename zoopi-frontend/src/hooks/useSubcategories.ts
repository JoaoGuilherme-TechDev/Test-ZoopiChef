import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  order: number;
  active: boolean;
}

export function useSubcategories() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const response = await api.get<Subcategory[]>("/subcategories");
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newSubcategory: Partial<Subcategory>) => {
      const response = await api.post("/subcategories", newSubcategory);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Subcategory> & { id: string }) => {
      const response = await api.patch(`/subcategories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/subcategories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
  });

  return {
    subcategories: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    createSubcategory: createMutation,
    updateSubcategory: updateMutation,
    deleteSubcategory: deleteMutation,
    refetch: query.refetch,
  };
}

/**
 * Hook auxiliar para filtrar subcategorias por categoria específica
 */
export function useSubcategoriesByCategory(categoryId?: string | null) {
  return useQuery({
    queryKey: ["subcategories", categoryId],
    queryFn: async () => {
      if (!categoryId || categoryId === 'all') return [];
      // O endpoint /subcategories no seu NestJS já retorna filtrado se implementado,
      // ou podemos filtrar no cliente para agilizar
      const response = await api.get<Subcategory[]>("/subcategories");
      return response.data.filter(sub => sub.category_id === categoryId);
    },
    enabled: !!categoryId,
  });
}