import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';

export interface TabletProduct {
  id: string;
  name: string;
  title?: string | null;
  description?: string | null;
  composition?: string | null;
  image_url?: string | null;
  price: number;
  is_on_sale?: boolean;
  sale_price?: number | null;
  subcategory_id: string;
  // Category info for pizza detection (STRICT: only category.name determines pizza behavior)
  subcategory?: {
    id: string;
    name: string;
    category_id: string;
    category?: {
      id: string;
      name: string;
    };
  };
}

export interface TabletCategory {
  id: string;
  name: string;
  image_url?: string | null;
  show_on_tablet: boolean;
}

export interface TabletSubcategory {
  id: string;
  name: string;
  category_id: string;
  image_url?: string | null;
  show_on_tablet: boolean;
}

/**
 * Hook para buscar produtos visíveis no tablet
 * Regra: Produto.aparece_tablet = true E Categoria.show_on_tablet = true E Subcategoria.show_on_tablet = true
 */
export function useTabletProducts(companyId: string | undefined) {
  return useQuery({
    queryKey: ['tablet_products', companyId],
    queryFn: async (): Promise<{ products: TabletProduct[]; categories: TabletCategory[]; subcategories: TabletSubcategory[] }> => {
      if (!companyId) return { products: [], categories: [], subcategories: [] };

      // Buscar categorias visíveis no tablet
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name, image_url, show_on_tablet')
        .eq('company_id', companyId)
        .eq('active', true)
        .eq('show_on_tablet', true);

      if (catError) throw catError;

      const visibleCategoryIds = (categories || []).map(c => c.id);
      if (visibleCategoryIds.length === 0) return { products: [], categories: [], subcategories: [] };

      // Buscar subcategorias visíveis no tablet
      const { data: subcategories, error: subError } = await supabase
        .from('subcategories')
        .select('id, name, category_id, image_url, show_on_tablet')
        .eq('company_id', companyId)
        .eq('active', true)
        .eq('show_on_tablet', true)
        .in('category_id', visibleCategoryIds);

      if (subError) throw subError;

      const visibleSubcategoryIds = (subcategories || []).map(s => s.id);

      // Buscar produtos visíveis no tablet
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select(`
          id, name, title, description, composition, image_url, price,
          is_on_sale, sale_price, subcategory_id,
          subcategory:subcategories(
            id, name, category_id,
            category:categories(id, name)
          )
        `)
        .eq('company_id', companyId)
        .eq('active', true)
        .eq('aparece_tablet', true)
        .in('subcategory_id', visibleSubcategoryIds.length > 0 ? visibleSubcategoryIds : ['__none__'])
        .order('name');

      if (prodError) throw prodError;

      return {
        products: (products || []) as unknown as TabletProduct[],
        categories: (categories || []) as TabletCategory[],
        subcategories: (subcategories || []) as TabletSubcategory[],
      };
    },
    enabled: !!companyId,
  });
}
