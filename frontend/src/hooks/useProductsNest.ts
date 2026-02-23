import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { Product } from './useProducts'; // Reusing type definition

export function useProductsNest() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['products-nest', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data } = await api.get<Product[]>(`/products?companyId=${company.id}`);
      return data;
    },
    enabled: !!company?.id,
  });
}

export function useCreateProductNest() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (newProduct: Partial<Product>) => {
      const { data } = await api.post<Product>('/products', {
        ...newProduct,
        company_id: company?.id,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-nest'] });
    },
  });
}
