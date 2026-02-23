import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';

export interface ProductListData {
  id: string;
  name: string;
  category_name: string;
  subcategory_name: string;
  price: number;
  active: boolean;
}

export interface ProductsByCategoryData {
  category_id: string;
  category_name: string;
  product_count: number;
  active_count: number;
  inactive_count: number;
}

export function useProductsListReport(categoryFilter?: string) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['reports-products-list', company?.id, categoryFilter],
    queryFn: async (): Promise<ProductListData[]> => {
      if (!company?.id) return [];

      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          active,
          subcategory:subcategories(
            name,
            category:categories(name)
          )
        `)
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;

      let result = (products || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        category_name: p.subcategory?.category?.name || '',
        subcategory_name: p.subcategory?.name || '',
        price: p.price || 0,
        active: p.active ?? true,
      }));

      if (categoryFilter) {
        result = result.filter(p => 
          p.category_name.toLowerCase().includes(categoryFilter.toLowerCase())
        );
      }

      return result;
    },
    enabled: !!company?.id,
  });
}

export function useProductsByCategoryReport() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['reports-products-by-category', company?.id],
    queryFn: async (): Promise<ProductsByCategoryData[]> => {
      if (!company?.id) return [];

      // Buscar categorias
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('company_id', company.id)
        .order('name');

      if (catError) throw catError;

      // Buscar subcategorias
      const { data: subcategories } = await supabase
        .from('subcategories')
        .select('id, category_id')
        .eq('company_id', company.id);

      // Buscar produtos
      const { data: products } = await supabase
        .from('products')
        .select('id, subcategory_id, active')
        .eq('company_id', company.id);

      // Mapear subcategorias para categorias
      const subcatToCategory = new Map<string, string>();
      for (const sub of subcategories || []) {
        subcatToCategory.set(sub.id, sub.category_id);
      }

      // Contar produtos por categoria
      const categoryStats = new Map<string, { total: number; active: number; inactive: number }>();
      
      for (const cat of categories || []) {
        categoryStats.set(cat.id, { total: 0, active: 0, inactive: 0 });
      }

      for (const product of products || []) {
        const categoryId = subcatToCategory.get(product.subcategory_id);
        if (categoryId && categoryStats.has(categoryId)) {
          const stats = categoryStats.get(categoryId)!;
          stats.total += 1;
          if (product.active !== false) {
            stats.active += 1;
          } else {
            stats.inactive += 1;
          }
        }
      }

      return (categories || []).map(cat => {
        const stats = categoryStats.get(cat.id) || { total: 0, active: 0, inactive: 0 };
        return {
          category_id: cat.id,
          category_name: cat.name,
          product_count: stats.total,
          active_count: stats.active,
          inactive_count: stats.inactive,
        };
      }).sort((a, b) => b.product_count - a.product_count);
    },
    enabled: !!company?.id,
  });
}
