import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';

export interface HelpArticle {
  id: string;
  company_id: string | null;
  category: string;
  title: string;
  content: string;
  video_url: string | null;
  order_index: number;
  is_global: boolean;
  icon: string | null;
  created_at: string;
}

export function useHelpArticles(category?: string) {
  return useQuery({
    queryKey: ['help-articles', category],
    queryFn: async () => {
      let query = supabase
        .from('help_articles')
        .select('*')
        .order('order_index', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as HelpArticle[];
    },
  });
}

export function useHelpCategories() {
  return useQuery({
    queryKey: ['help-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_articles')
        .select('category')
        .order('category');

      if (error) throw error;

      // Get unique categories
      const categories = [...new Set(data.map((d) => d.category))];
      return categories;
    },
  });
}
