import { useState } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface IFoodOptionItem {
  name: string;
  price: number;
}

export interface IFoodOptionGroup {
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  items: IFoodOptionItem[];
}

export interface IFoodProduct {
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  optionGroups: IFoodOptionGroup[];
}

export interface IFoodSubcategory {
  name: string;
  products: IFoodProduct[];
}

export interface IFoodCategory {
  name: string;
  subcategories: IFoodSubcategory[];
}

export interface ScrapeResult {
  categories: IFoodCategory[];
  rawMarkdown: string;
  stats: {
    categoriesCount: number;
    productsCount: number;
  };
}

export interface ImportResult {
  categories: number;
  subcategories: number;
  products: number;
  optionGroups: number;
}

export function useIFoodImport() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const scrapeMenu = async (url: string): Promise<ScrapeResult | null> => {
    if (!url) {
      toast.error('URL é obrigatória');
      return null;
    }

    setIsLoading(true);
    setScrapeResult(null);
    setImportResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('ifood-menu-scrape', {
        body: { url, action: 'scrape' }
      });

      if (error) {
        console.error('Erro no scrape (invoke):', error);
        toast.error(error.message || 'Erro ao acessar cardápio do iFood');
        return null;
      }

      if (!data?.success) {
        const message = data?.error || 'Erro ao acessar cardápio';
        toast.error(message);
        return null;
      }

      setScrapeResult(data.data);
      toast.success(`Encontrados ${data.data.stats.categoriesCount} categorias e ${data.data.stats.productsCount} produtos`);
      return data.data;
    } catch (error: any) {
      console.error('Erro no scrape:', error);
      toast.error(error.message || 'Erro ao acessar cardápio do iFood');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const importMenu = async (categories: IFoodCategory[]): Promise<ImportResult | null> => {
    if (!company?.id) {
      toast.error('Empresa não encontrada');
      return null;
    }

    if (!categories || categories.length === 0) {
      toast.error('Nenhuma categoria para importar');
      return null;
    }

    setIsLoading(true);
    setImportResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('ifood-menu-scrape', {
        body: { 
          companyId: company.id, 
          categories,
          action: 'import' 
        }
      });

      if (error) {
        console.error('Erro na importação (invoke):', error);
        toast.error(error.message || 'Erro ao importar cardápio');
        return null;
      }

      if (!data?.success) {
        const message = data?.error || 'Erro ao importar cardápio';
        toast.error(message);
        return null;
      }

      setImportResult(data.imported);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['all-option-groups'] });

      toast.success(
        `Importados: ${data.imported.categories} categorias, ${data.imported.subcategories} subcategorias, ${data.imported.products} produtos, ${data.imported.optionGroups} grupos de opcionais`
      );
      
      return data.imported;
    } catch (error: any) {
      console.error('Erro na importação:', error);
      toast.error(error.message || 'Erro ao importar cardápio');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setScrapeResult(null);
    setImportResult(null);
  };

  return {
    isLoading,
    scrapeResult,
    importResult,
    scrapeMenu,
    importMenu,
    reset
  };
}
