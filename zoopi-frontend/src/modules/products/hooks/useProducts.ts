/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

// Definição das interfaces conforme o novo Backend NestJS
export type ProductType = 'simple' | 'pizza' | 'combo' | 'additional';

export interface ProductPrice {
  id: string;
  label: string;
  price: string;
  delivery_price: string | null;
  order: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  type: ProductType;
  image_url: string | null;
  sku: string | null;
  active: boolean;
  category_id?: string;
  subcategory_id?: string;
  subcategory?: {
    id: string;
    name: string;
  };
  prices: ProductPrice[];
  // Grupos de opcionais vinculados
  optionsGroups?: {
    group: {
      id: string;
      name: string;
      items: any[];
    };
  }[];
}

export function useProducts() {
  const queryClient = useQueryClient();

  // 1. Busca todos os produtos (Multi-tenant via Token)
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await api.get<Product[]>("/products");
      return response.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutos sem recarregar automaticamente
    gcTime: 1000 * 60 * 60,    // Mantém no cache por 1 hora
  });

  // 2. Criar Produto
  const createProduct = useMutation({
    mutationFn: async (data: any) => {
      // Ensure prices is an array and fields are correct types
      if (data.prices && !Array.isArray(data.prices)) {
        data.prices = [data.prices];
      }
      try {
        const response = await api.post("/products", data);
        return response.data;
      } catch (error: any) {
        console.error("Create product API error details:", error.response?.data || error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // 3. Atualizar Produto
  const updateProduct = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      console.log(`Updating product ${id} with payload:`, JSON.stringify(data, null, 2));
      // Ensure prices is an array if provided
      if (data.prices && !Array.isArray(data.prices)) {
        data.prices = [data.prices];
      }
      try {
        const response = await api.patch(`/products/${id}`, data);
        return response.data;
      } catch (error: any) {
        console.error("Update product API error details:", error.response?.data || error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // 4. Deletar Produto
  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return {
    products: productsQuery.data || [],
    isLoading: productsQuery.isLoading,
    isError: productsQuery.isError,
    createProduct,
    updateProduct,
    deleteProduct,
    refetch: productsQuery.refetch
  };
}
