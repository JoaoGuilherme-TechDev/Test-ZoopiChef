import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { PrintSector } from './usePrintSectors';

export interface CategoryPrintSectorMapping {
  id: string;
  category_id: string;
  sector_id: string;
  created_at: string;
  sector?: PrintSector;
}

export interface SubcategoryPrintSectorMapping {
  id: string;
  subcategory_id: string;
  sector_id: string;
  created_at: string;
  sector?: PrintSector;
}

export interface ProductPrintSectorMapping {
  id: string;
  product_id: string;
  sector_id: string;
  created_at: string;
  sector?: PrintSector;
}

// Hook para mapeamentos de Categoria -> Setores
export function useCategoryPrintSectors() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['category-print-sectors', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('category_print_sectors')
        .select(`
          *,
          sector:print_sectors!inner(id, name, color, active)
        `)
        .eq('sector.company_id', company.id);

      if (error) throw error;
      return (data || []) as CategoryPrintSectorMapping[];
    },
    enabled: !!company?.id,
  });

  const assignSector = useMutation({
    mutationFn: async ({ categoryId, sectorId }: { categoryId: string; sectorId: string }) => {
      const { data, error } = await supabase
        .from('category_print_sectors')
        .insert({ category_id: categoryId, sector_id: sectorId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-print-sectors'] });
    },
  });

  const removeSector = useMutation({
    mutationFn: async ({ categoryId, sectorId }: { categoryId: string; sectorId: string }) => {
      const { error } = await supabase
        .from('category_print_sectors')
        .delete()
        .eq('category_id', categoryId)
        .eq('sector_id', sectorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-print-sectors'] });
    },
  });

  const getSectorsForCategory = (categoryId: string) => {
    return mappings.filter((m) => m.category_id === categoryId);
  };

  return {
    mappings,
    isLoading,
    assignSector,
    removeSector,
    getSectorsForCategory,
  };
}

// Hook para mapeamentos de Subcategoria -> Setores
export function useSubcategoryPrintSectors() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['subcategory-print-sectors', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('subcategory_print_sectors')
        .select(`
          *,
          sector:print_sectors!inner(id, name, color, active)
        `)
        .eq('sector.company_id', company.id);

      if (error) throw error;
      return (data || []) as SubcategoryPrintSectorMapping[];
    },
    enabled: !!company?.id,
  });

  const assignSector = useMutation({
    mutationFn: async ({ subcategoryId, sectorId }: { subcategoryId: string; sectorId: string }) => {
      const { data, error } = await supabase
        .from('subcategory_print_sectors')
        .insert({ subcategory_id: subcategoryId, sector_id: sectorId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategory-print-sectors'] });
    },
  });

  const removeSector = useMutation({
    mutationFn: async ({ subcategoryId, sectorId }: { subcategoryId: string; sectorId: string }) => {
      const { error } = await supabase
        .from('subcategory_print_sectors')
        .delete()
        .eq('subcategory_id', subcategoryId)
        .eq('sector_id', sectorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategory-print-sectors'] });
    },
  });

  const getSectorsForSubcategory = (subcategoryId: string) => {
    return mappings.filter((m) => m.subcategory_id === subcategoryId);
  };

  return {
    mappings,
    isLoading,
    assignSector,
    removeSector,
    getSectorsForSubcategory,
  };
}

// Hook atualizado para mapeamentos de Produto -> Setores (máx 4)
export function useProductPrintSectorsMappings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['product-print-sectors', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('product_print_sectors')
        .select(`
          *,
          sector:print_sectors!inner(id, name, color, active)
        `)
        .eq('sector.company_id', company.id);

      if (error) throw error;
      return (data || []) as ProductPrintSectorMapping[];
    },
    enabled: !!company?.id,
  });

  const assignSector = useMutation({
    mutationFn: async ({ productId, sectorId }: { productId: string; sectorId: string }) => {
      // Verificar se já tem 4 setores
      const existingCount = mappings.filter(m => m.product_id === productId).length;
      if (existingCount >= 4) {
        throw new Error('Máximo de 4 impressoras por produto');
      }
      
      const { data, error } = await supabase
        .from('product_print_sectors')
        .insert({ product_id: productId, sector_id: sectorId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-print-sectors'] });
    },
  });

  const removeSector = useMutation({
    mutationFn: async ({ productId, sectorId }: { productId: string; sectorId: string }) => {
      const { error } = await supabase
        .from('product_print_sectors')
        .delete()
        .eq('product_id', productId)
        .eq('sector_id', sectorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-print-sectors'] });
    },
  });

  const getSectorsForProduct = (productId: string) => {
    return mappings.filter((m) => m.product_id === productId);
  };

  return {
    mappings,
    isLoading,
    assignSector,
    removeSector,
    getSectorsForProduct,
  };
}

// Hook para resolver a hierarquia de impressão
// Prioridade: Produto > Subcategoria > Categoria
export function usePrintHierarchyResolver() {
  const { mappings: productMappings } = useProductPrintSectorsMappings();
  const { mappings: subcategoryMappings } = useSubcategoryPrintSectors();
  const { mappings: categoryMappings } = useCategoryPrintSectors();

  const getEffectiveSectors = (productId: string, subcategoryId: string, categoryId: string): string[] => {
    // 1. Verificar se produto tem setores configurados
    const productSectors = productMappings.filter(m => m.product_id === productId);
    if (productSectors.length > 0) {
      return productSectors.map(m => m.sector_id);
    }

    // 2. Verificar se subcategoria tem setores configurados
    const subcategorySectors = subcategoryMappings.filter(m => m.subcategory_id === subcategoryId);
    if (subcategorySectors.length > 0) {
      return subcategorySectors.map(m => m.sector_id);
    }

    // 3. Verificar se categoria tem setores configurados
    const categorySectors = categoryMappings.filter(m => m.category_id === categoryId);
    if (categorySectors.length > 0) {
      return categorySectors.map(m => m.sector_id);
    }

    return [];
  };

  // Detectar se há conflito (múltiplos níveis com setores)
  const hasConflict = (productId: string, subcategoryId: string, categoryId: string): { 
    hasConflict: boolean; 
    levels: ('product' | 'subcategory' | 'category')[] 
  } => {
    const levels: ('product' | 'subcategory' | 'category')[] = [];
    
    if (productMappings.some(m => m.product_id === productId)) {
      levels.push('product');
    }
    if (subcategoryMappings.some(m => m.subcategory_id === subcategoryId)) {
      levels.push('subcategory');
    }
    if (categoryMappings.some(m => m.category_id === categoryId)) {
      levels.push('category');
    }

    return {
      hasConflict: levels.length > 1,
      levels,
    };
  };

  return {
    getEffectiveSectors,
    hasConflict,
  };
}
