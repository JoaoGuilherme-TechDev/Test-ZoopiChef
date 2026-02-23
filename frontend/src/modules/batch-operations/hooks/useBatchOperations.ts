import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import type { 
  ProductForBatch, 
  BatchProductUpdate, 
  BatchPriceChange, 
  BatchNeighborhoodUpdate,
  NeighborhoodForBatch 
} from '../types';

// Hook para buscar produtos por categoria/subcategoria
export function useBatchProducts(categoryId?: string, subcategoryId?: string) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['batch-products', company?.id, categoryId, subcategoryId],
    queryFn: async (): Promise<ProductForBatch[]> => {
      if (!company?.id) return [];

      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          sale_price,
          ncm_code,
          cfop_code,
          cest_code,
          is_weighted,
          production_location,
          tax_status,
          origem,
          subcategory_id,
          subcategories:subcategory_id(
            id,
            name,
            category_id,
            categories:category_id(id, name)
          )
        `)
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name');

      // Filtrar por subcategoria direta
      if (subcategoryId && subcategoryId !== 'all') {
        query = query.eq('subcategory_id', subcategoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Mapear dados
      let products: ProductForBatch[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        sale_price: p.sale_price,
        ncm_code: p.ncm_code,
        cfop_code: p.cfop_code,
        cest_code: p.cest_code,
        is_weighted: p.is_weighted,
        production_location: p.production_location,
        tax_status: p.tax_status,
        origem: p.origem,
        subcategory_id: p.subcategory_id,
        subcategory: p.subcategories ? {
          id: p.subcategories.id,
          name: p.subcategories.name,
          category_id: p.subcategories.category_id,
          category: p.subcategories.categories ? {
            id: p.subcategories.categories.id,
            name: p.subcategories.categories.name,
          } : undefined
        } : undefined
      }));

      // Se tiver categoria mas não subcategoria, filtramos no cliente
      if (categoryId && categoryId !== 'all' && (!subcategoryId || subcategoryId === 'all')) {
        products = products.filter(p => p.subcategory?.category_id === categoryId);
      }

      return products;
    },
    enabled: !!company?.id,
  });
}

// Hook para buscar bairros
export function useBatchNeighborhoods() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['batch-neighborhoods', company?.id],
    queryFn: async (): Promise<NeighborhoodForBatch[]> => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('delivery_fee_neighborhoods')
        .select('*')
        .eq('company_id', company.id)
        .order('neighborhood');

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });
}

// Hook para atualizar produtos em lote
export function useBatchUpdateProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      productIds, 
      updates 
    }: { 
      productIds: string[]; 
      updates: BatchProductUpdate;
    }) => {
      if (!productIds.length) throw new Error('Nenhum produto selecionado');
      
      // Filtrar apenas campos com valor definido
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined && v !== '')
      );

      if (Object.keys(cleanUpdates).length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }

      const { error } = await supabase
        .from('products')
        .update(cleanUpdates)
        .in('id', productIds);

      if (error) throw error;
      return { count: productIds.length, updates: cleanUpdates };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['batch-products'] });
      toast.success(`${result.count} produtos atualizados com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar produtos: ${error.message}`);
    },
  });
}

// Hook para atualizar preços em lote
export function useBatchUpdatePrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changes: BatchPriceChange[]) => {
      if (!changes.length) throw new Error('Nenhuma alteração de preço');

      const updates = changes.map(c => ({
        id: c.productId,
        price: c.newPrice,
        sale_price: c.newSalePrice,
      }));

      // Atualizar um por um para garantir
      for (const update of updates) {
        const { error } = await supabase
          .from('products')
          .update({ 
            price: update.price, 
            sale_price: update.sale_price 
          })
          .eq('id', update.id);

        if (error) throw error;
      }

      return { count: changes.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['batch-products'] });
      toast.success(`${result.count} preços atualizados com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar preços: ${error.message}`);
    },
  });
}

// Hook para atualizar bairros em lote
export function useBatchUpdateNeighborhoods() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changes: BatchNeighborhoodUpdate[]) => {
      if (!changes.length) throw new Error('Nenhuma alteração de bairro');

      for (const change of changes) {
        const { error } = await supabase
          .from('delivery_fee_neighborhoods')
          .update({ fee: change.newFee })
          .eq('id', change.neighborhoodId);

        if (error) throw error;
      }

      return { count: changes.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['delivery_fee_neighborhoods'] });
      queryClient.invalidateQueries({ queryKey: ['batch-neighborhoods'] });
      toast.success(`${result.count} bairros atualizados com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar bairros: ${error.message}`);
    },
  });
}

// Hook para mover produtos entre subcategorias
export function useBatchMoveProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      productIds, 
      targetSubcategoryId 
    }: { 
      productIds: string[]; 
      targetSubcategoryId: string;
    }) => {
      if (!productIds.length) throw new Error('Nenhum produto selecionado');

      const { error } = await supabase
        .from('products')
        .update({ subcategory_id: targetSubcategoryId })
        .in('id', productIds);

      if (error) throw error;
      return { count: productIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['batch-products'] });
      toast.success(`${result.count} produtos movidos com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao mover produtos: ${error.message}`);
    },
  });
}
