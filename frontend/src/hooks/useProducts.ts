import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { Subcategory } from './useSubcategories';

export interface Product {
  id: string;
  company_id: string;
  subcategory_id: string;
  name: string;
  title?: string | null;
  description?: string | null;
  composition?: string | null;
  image_url?: string | null;
  price: number;
  active: boolean;
  aparece_delivery: boolean;
  aparece_qrcode: boolean;
  aparece_totem: boolean;
  aparece_tablet: boolean;
  aparece_tv: boolean;
  destaque_horario?: string[] | null;
  ordem_destaque?: number | null;
  print_sector_id?: string | null;
  is_on_sale?: boolean;
  sale_price?: number | null;
  sale_hours?: string[] | null;
  is_featured?: boolean;
  ean_code?: string | null;
  internal_code?: string | null;
  created_at: string;
  updated_at: string;
  subcategory?: Omit<Partial<Subcategory>, 'category'> & {
    category?: {
      id: string;
      name: string;
    };
  };
  pizza_config?: {
    id: string;
    requires_size: boolean;
    allowed_sizes: string[];
    slices_per_size: Record<string, number>;
    max_flavors_per_size: Record<string, number>;
    pricing_model: string;
  };
  product_flavors?: {
    id: string;
    flavor_id: string;
    flavor_name: string;
    sort_order: number;
    active: boolean;
  }[];
}

// Helper to map NestJS response (camelCase) to Frontend interface (snake_case)
export const mapProductToFrontend = (data: any): Product => ({
  id: data.id,
  company_id: data.companyId,
  subcategory_id: data.subcategoryId,
  name: data.name,
  title: data.name, // Mapping name to title as well if needed
  description: data.description,
  composition: null, // Not in entity yet
  image_url: data.imageUrl,
  price: data.priceCents ? data.priceCents / 100 : 0,
  active: data.isActive,
  aparece_delivery: data.apareceDelivery,
  aparece_qrcode: data.apareceQrcode,
  aparece_totem: data.apareceTotem,
  aparece_tablet: data.apareceTablet,
  aparece_tv: data.apareceTv,
  destaque_horario: data.destaqueHorario,
  ordem_destaque: data.ordemDestaque,
  print_sector_id: data.printSectorId,
  is_on_sale: data.isOnSale,
  sale_price: data.salePriceCents ? data.salePriceCents / 100 : null,
  sale_hours: data.saleHours,
  is_featured: data.isFeatured,
  ean_code: data.eanCode,
  internal_code: data.internalCode,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
  subcategory: data.subcategory ? {
    id: data.subcategory.id,
    name: data.subcategory.name,
    category: data.subcategory.category ? {
      id: data.subcategory.category.id,
      name: data.subcategory.category.name,
    } : undefined
  } : undefined,
  pizza_config: data.pizzaConfig ? {
    id: data.pizzaConfig.id,
    requires_size: data.pizzaConfig.requiresSize,
    allowed_sizes: data.pizzaConfig.allowedSizes,
    slices_per_size: data.pizzaConfig.slicesPerSize,
    max_flavors_per_size: data.pizzaConfig.maxFlavorsPerSize,
    pricing_model: data.pizzaConfig.pricingModel,
  } : undefined,
  product_flavors: data.productFlavors ? data.productFlavors.map((pf: any) => ({
    id: pf.id,
    flavor_id: pf.flavorId,
    flavor_name: pf.flavor?.name || '',
    sort_order: pf.sortOrder,
    active: pf.active,
  })) : [],
});

export function useProducts() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['products', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const response = await api.get(`/products?companyId=${company.id}`);
      return response.data.map(mapProductToFrontend);
    },
    enabled: !!company?.id,
  });
}

export function useActiveProducts() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['products', 'active', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const response = await api.get(`/products?companyId=${company.id}`);
      // Filter active on client side or add query param
      return response.data
        .filter((p: any) => p.isActive)
        .map(mapProductToFrontend);
    },
    enabled: !!company?.id,
  });
}

export const mapProductToBackend = (data: any): any => ({
  companyId: data.company_id,
  subcategoryId: data.subcategory_id,
  name: data.name,
  description: data.description,
  priceCents: data.price ? Math.round(data.price * 100) : 0,
  isActive: data.active,
  imageUrl: data.image_url,
  apareceDelivery: data.aparece_delivery,
  apareceQrcode: data.aparece_qrcode,
  apareceTotem: data.aparece_totem,
  apareceTablet: data.aparece_tablet,
  apareceTv: data.aparece_tv,
  destaqueHorario: data.destaque_horario,
  ordemDestaque: data.ordem_destaque,
  printSectorId: data.print_sector_id,
  isOnSale: data.is_on_sale,
  salePriceCents: data.sale_price ? Math.round(data.sale_price * 100) : null,
  saleHours: data.sale_hours,
  isFeatured: data.is_featured,
  eanCode: data.ean_code,
  internalCode: data.internal_code,
  pizzaConfig: data.pizza_config ? {
    requiresSize: data.pizza_config.requires_size,
    allowedSizes: data.pizza_config.allowed_sizes,
    slicesPerSize: data.pizza_config.slices_per_size,
    maxFlavorsPerSize: data.pizza_config.max_flavors_per_size,
    pricingModel: data.pizza_config.pricing_model,
  } : undefined,
  productFlavors: data.product_flavors ? data.product_flavors.map((pf: any) => ({
    flavorId: pf.flavor_id,
    sortOrder: pf.sort_order,
    active: pf.active,
  })) : undefined,
});

export function useProductsBySubcategory(subcategoryId: string | null) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['products', 'bySubcategory', subcategoryId, company?.id],
    queryFn: async () => {
      if (!company?.id || !subcategoryId) return [];

      const response = await api.get(`/products?companyId=${company.id}`);
      return response.data
        .filter((p: any) => p.subcategoryId === subcategoryId && p.isActive)
        .map(mapProductToFrontend);
    },
    enabled: !!company?.id && !!subcategoryId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (productData: Partial<Product> & { name: string; subcategory_id: string; price: number }) => {
      if (!company?.id) throw new Error('Company not found');

      const payload = mapProductToBackend({ ...productData, company_id: company.id });
      const response = await api.post('/products', payload);
      return mapProductToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar produto');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const payload = mapProductToBackend(updates);
      const response = await api.put(`/products/${id}`, payload);
      return mapProductToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar produto');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir produto');
    },
  });
}

export function useUploadProductImage() {
  return useMutation({
    mutationFn: async ({ file, companyId }: { file: File; companyId: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'products'); // Optional, handled by backend logic if needed

      const { data } = await api.post('/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return data.url;
    },
  });
}
