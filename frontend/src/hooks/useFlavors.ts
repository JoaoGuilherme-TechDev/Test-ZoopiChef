
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import api from '@/lib/api';

export interface Flavor {
  id: string;
  company_id: string;
  name: string;
  highlight_group: string | null;
  flavor_group_id: string | null;
  description: string | null;
  ingredients_raw: string | null;
  active: boolean;
  usage_type: 'pizza' | 'marmita' | 'ambos';
  created_at: string;
  updated_at: string;
  prices?: FlavorPrice[];
}

export interface FlavorPrice {
  id: string;
  company_id: string;
  flavor_id: string;
  size_name: string;
  price_per_part: number;
  price_full: number;
  price_avg: number;
  created_at: string;
  updated_at: string;
}

export interface ProductFlavor {
  id: string;
  company_id: string;
  product_id: string;
  flavor_id: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  flavor?: Flavor;
}

export interface ProductPizzaConfig {
  id: string;
  company_id: string;
  product_id: string;
  requires_size: boolean;
  allowed_sizes: string[];
  slices_per_size: Record<string, number>;
  max_flavors_per_size: Record<string, number>;
  pricing_model: 'maior' | 'media' | 'partes';
  created_at: string;
  updated_at: string;
}

export function parseIngredients(ingredientsRaw: string | null): {
  removable: string[];
  fixed: string[];
} {
  if (!ingredientsRaw) return { removable: [], fixed: [] };
  
  const removable: string[] = [];
  const fixed: string[] = [];
  
  const parts = ingredientsRaw.split(';').map(p => p.trim()).filter(Boolean);
  
  parts.forEach((part, index) => {
    if (index === 0) {
      const commaItems = part.split(',').map(i => i.trim()).filter(Boolean);
      removable.push(...commaItems);
    } else {
      fixed.push(part);
    }
  });
  
  return { removable, fixed };
}

// Hooks

export function useFlavors() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['flavors', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data } = await api.get(`/flavors?companyId=${company.id}`);
      return data.map((f: any) => ({
        id: f.id,
        company_id: f.companyId,
        name: f.name,
        flavor_group_id: f.flavorGroupId,
        description: f.description,
        ingredients_raw: f.ingredientsRaw,
        active: f.active,
        usage_type: f.usageType,
        created_at: f.createdAt,
        updated_at: f.updatedAt,
        prices: f.prices?.map((p: any) => ({
          id: p.id,
          company_id: p.companyId,
          flavor_id: p.flavorId,
          size_name: p.sizeName,
          price_per_part: p.pricePerPart,
          price_full: p.priceFull,
          price_avg: p.priceAvg,
          created_at: p.createdAt,
          updated_at: p.updatedAt,
        })) || [],
      }));
    },
    enabled: !!company?.id,
  });
}

export function useDeleteFlavor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/flavors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flavors'] });
      queryClient.invalidateQueries({ queryKey: ['product-flavors'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir sabor');
    },
  });
}

export function useAllFlavorPrices() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['flavor-prices', 'all', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data } = await api.get(`/flavors/prices/all?companyId=${company.id}`);
      return data.map((p: any) => ({
          id: p.id,
          company_id: p.companyId,
          flavor_id: p.flavorId,
          size_name: p.sizeName,
          price_per_part: p.pricePerPart,
          price_full: p.priceFull,
          price_avg: p.priceAvg,
          created_at: p.createdAt,
          updated_at: p.updatedAt,
      }));
    },
    enabled: !!company?.id,
  });
}

export function useDeleteFlavorPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
        await api.delete(`/flavors/prices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flavor-prices'] });
      queryClient.invalidateQueries({ queryKey: ['flavors'] });
    },
    onError: (error: any) => {
        toast.error(error.message || 'Erro ao excluir preço');
    }
  });
}

export function useUnlinkFlavorFromProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, flavorId }: { productId: string; flavorId: string }) => {
        await api.delete(`/flavors/product/${productId}/${flavorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-flavors'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
        toast.error(error.message || 'Erro ao desvincular sabor');
    }
  });
}

export function useLinkFlavorToProduct() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async ({ productId, flavorId, active = true, sortOrder = 0 }: { productId: string; flavorId: string; active?: boolean; sortOrder?: number }) => {
        if (!company?.id) throw new Error('Company not found');
        
        const payload = {
            companyId: company.id,
            productId,
            flavorId,
            active,
            sortOrder,
        };
        
        const { data } = await api.post('/flavors/product', payload);
        return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-flavors'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
        toast.error(error.message || 'Erro ao vincular sabor');
    }
  });
}

// Product Pizza Config Hooks

export function useProductPizzaConfig(productId: string) {
    return useQuery({
        queryKey: ['product-pizza-config', productId],
        queryFn: async () => {
            if (!productId) return null;
            try {
                const { data } = await api.get(`/products/${productId}/pizza-config`);
                if (!data) return null;
                return {
                    id: data.id,
                    company_id: data.companyId,
                    product_id: data.productId,
                    requires_size: data.requiresSize,
                    allowed_sizes: data.allowedSizes,
                    slices_per_size: data.slicesPerSize,
                    max_flavors_per_size: data.maxFlavorsPerSize,
                    pricing_model: data.pricingModel,
                    created_at: data.createdAt,
                    updated_at: data.updatedAt
                };
            } catch (error) {
                // If 404, return null (not configured yet)
                return null;
            }
        },
        enabled: !!productId
    });
}

export function useUpsertProductPizzaConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ productId, ...data }: any) => {
            const payload = {
                companyId: data.company_id, // Ensure companyId is passed if needed, or backend handles it from auth/product
                requiresSize: data.requires_size,
                allowedSizes: data.allowed_sizes,
                slicesPerSize: data.slices_per_size,
                maxFlavorsPerSize: data.max_flavors_per_size,
                pricingModel: data.pricing_model
            };
            await api.post(`/products/${productId}/pizza-config`, payload);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['product-pizza-config', variables.productId] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao salvar configuração');
        }
    });
}

export function useDeleteProductPizzaConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
        await api.delete(`/products/${productId}/pizza-config`);
    },
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ['product-pizza-config', productId] });
    },
    onError: (error: any) => {
        toast.error(error.message || 'Erro ao excluir configuração');
    }
  });
}

export function useCreateFlavor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const payload = {
                companyId: data.company_id,
                name: data.name,
                flavorGroupId: data.flavor_group_id,
                description: data.description,
                ingredientsRaw: data.ingredients_raw,
                active: data.active,
                usageType: data.usage_type
            };
            await api.post('/flavors', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['flavors'] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao criar sabor');
        }
    });
}

export function useUpdateFlavor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            const payload = {
                name: data.name,
                flavorGroupId: data.flavor_group_id,
                description: data.description,
                ingredientsRaw: data.ingredients_raw,
                active: data.active,
                usageType: data.usage_type
            };
            await api.put(`/flavors/${id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['flavors'] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao atualizar sabor');
        }
    });
}

export function useFlavorPrices(flavorId: string) {
    return useQuery({
        queryKey: ['flavor-prices', flavorId],
        queryFn: async () => {
            if (!flavorId) return [];
            const { data } = await api.get(`/flavors/${flavorId}/prices`);
            return data.map((p: any) => ({
                id: p.id,
                company_id: p.companyId,
                flavor_id: p.flavorId,
                size_name: p.sizeName,
                price_per_part: p.pricePerPart,
                price_full: p.priceFull,
                price_avg: p.priceAvg,
                created_at: p.createdAt,
                updated_at: p.updatedAt,
            }));
        },
        enabled: !!flavorId
    });
}

export function useUpsertFlavorPrice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const payload = {
                id: data.id,
                companyId: data.company_id,
                flavorId: data.flavor_id,
                sizeName: data.size_name,
                pricePerPart: data.price_per_part,
                priceFull: data.price_full,
                priceAvg: data.price_avg
            };
             await api.post('/flavors/prices', payload);
        },
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['flavors'] });
             queryClient.invalidateQueries({ queryKey: ['flavor-prices'] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao salvar preço');
        }
    });
}
