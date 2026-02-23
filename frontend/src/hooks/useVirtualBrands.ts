import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface VirtualBrand {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  color: string;
  is_active: boolean;
  menu_settings: unknown;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  business_hours: unknown;
  created_at: string;
  updated_at: string;
}

export interface ProductBrandAssignment {
  id: string;
  product_id: string;
  brand_id: string;
  is_featured: boolean;
  display_order: number;
  custom_price_cents: number | null;
  is_available: boolean;
  created_at: string;
}

export interface CategoryBrandAssignment {
  id: string;
  category_id: string;
  brand_id: string;
  display_order: number;
  created_at: string;
}

export function useVirtualBrands() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Fetch all brands
  const brandsQuery = useQuery({
    queryKey: ['virtual-brands', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('virtual_brands')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      if (error) throw error;
      return data as VirtualBrand[];
    },
    enabled: !!company?.id,
  });

  // Create brand
  const createBrand = useMutation({
    mutationFn: async (brand: Partial<VirtualBrand>) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase
        .from('virtual_brands')
        .insert({
          company_id: company.id,
          name: brand.name || 'Nova Marca',
          slug: brand.slug || brand.name?.toLowerCase().replace(/\s+/g, '-') || 'nova-marca',
          description: brand.description,
          logo_url: brand.logo_url,
          banner_url: brand.banner_url,
          color: brand.color || '#000000',
          is_active: brand.is_active ?? true,
          phone: brand.phone,
          whatsapp: brand.whatsapp,
          email: brand.email,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-brands'] });
      toast.success('Marca criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar marca: ' + error.message);
    },
  });

  // Update brand
  const updateBrand = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VirtualBrand> & { id: string }) => {
      // Remove the business_hours and menu_settings from updates if they exist as they may cause type issues
      const { business_hours, menu_settings, ...safeUpdates } = updates;
      const { error } = await supabase
        .from('virtual_brands')
        .update(safeUpdates as any)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-brands'] });
      toast.success('Marca atualizada');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar marca: ' + error.message);
    },
  });

  // Delete brand
  const deleteBrand = useMutation({
    mutationFn: async (brandId: string) => {
      const { error } = await supabase
        .from('virtual_brands')
        .delete()
        .eq('id', brandId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-brands'] });
      toast.success('Marca removida');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover marca: ' + error.message);
    },
  });

  // Assign products to brand
  const assignProducts = useMutation({
    mutationFn: async ({ brandId, productIds }: { brandId: string; productIds: string[] }) => {
      // Remove existing assignments for these products in this brand
      await supabase
        .from('product_brand_assignments')
        .delete()
        .eq('brand_id', brandId);

      // Insert new assignments
      if (productIds.length > 0) {
        const { error } = await supabase
          .from('product_brand_assignments')
          .insert(
            productIds.map((productId, index) => ({
              product_id: productId,
              brand_id: brandId,
              display_order: index,
            }))
          );

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-products'] });
      toast.success('Produtos atualizados');
    },
    onError: (error: any) => {
      toast.error('Erro ao atribuir produtos: ' + error.message);
    },
  });

  // Assign categories to brand
  const assignCategories = useMutation({
    mutationFn: async ({ brandId, categoryIds }: { brandId: string; categoryIds: string[] }) => {
      // Remove existing assignments for these categories in this brand
      await supabase
        .from('category_brand_assignments')
        .delete()
        .eq('brand_id', brandId);

      // Insert new assignments
      if (categoryIds.length > 0) {
        const { error } = await supabase
          .from('category_brand_assignments')
          .insert(
            categoryIds.map((categoryId, index) => ({
              category_id: categoryId,
              brand_id: brandId,
              display_order: index,
            }))
          );

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-categories'] });
      toast.success('Categorias atualizadas');
    },
    onError: (error: any) => {
      toast.error('Erro ao atribuir categorias: ' + error.message);
    },
  });

  // Fetch products for a specific brand
  const useBrandProducts = (brandId: string | null) => {
    return useQuery({
      queryKey: ['brand-products', brandId],
      queryFn: async () => {
        if (!brandId) return [];
        const { data, error } = await supabase
          .from('product_brand_assignments')
          .select('*, product:products(*)')
          .eq('brand_id', brandId)
          .order('display_order');
        if (error) throw error;
        return data;
      },
      enabled: !!brandId,
    });
  };

  // Fetch categories for a specific brand
  const useBrandCategories = (brandId: string | null) => {
    return useQuery({
      queryKey: ['brand-categories', brandId],
      queryFn: async () => {
        if (!brandId) return [];
        const { data, error } = await supabase
          .from('category_brand_assignments')
          .select('*, category:categories(*)')
          .eq('brand_id', brandId)
          .order('display_order');
        if (error) throw error;
        return data;
      },
      enabled: !!brandId,
    });
  };

  return {
    brands: brandsQuery.data || [],
    isLoading: brandsQuery.isLoading,
    createBrand,
    updateBrand,
    deleteBrand,
    assignProducts,
    assignCategories,
    useBrandProducts,
    useBrandCategories,
  };
}
