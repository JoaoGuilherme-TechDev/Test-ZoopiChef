import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';

interface Category {
  id: string;
  name: string;
  active: boolean;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  subcategory_id: string;
  active: boolean;
  aparece_tv: boolean;
}

export function useTVMenu(slug: string | undefined) {
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['tv-company', slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['tv-categories', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!company?.id,
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ['tv-subcategories', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data as Subcategory[];
    },
    enabled: !!company?.id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['tv-products', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', company.id)
        .eq('active', true)
        .eq('aparece_tv', true)
        .order('name');

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!company?.id,
  });

  return {
    company,
    categories,
    subcategories,
    products,
    isLoading: companyLoading || categoriesLoading,
  };
}
