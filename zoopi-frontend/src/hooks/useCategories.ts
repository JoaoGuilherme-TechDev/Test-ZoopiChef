/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Category {
  id: string;
  name: string;
  image_url: string | null;
  color?: string | null;
  order: number;
  active: boolean;
  created_at: string;
}

const EMPTY_ARRAY: any[] = [];

export function useCategories() {
  const queryClient = useQueryClient();

  // 1. Busca todas as categorias
  const query = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get<Category[]>("/categories");
      return response.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutos sem recarregar automaticamente
    gcTime: 1000 * 60 * 60,    // Mantém no cache por 1 hora
  });

  // 2. Criar categoria
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Category>) => {
      return api.post("/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  // 3. Atualizar categoria
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Category> & { id: string }) => {
      return api.patch(`/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  // 4. Deletar categoria
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  return {
    categories: query.data || EMPTY_ARRAY,
    isLoading: query.isLoading,
    isError: query.isError,
    createCategory: createMutation,
    updateCategory: updateMutation,
    deleteCategory: deleteMutation,
    refetch: query.refetch,
  };
}