import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

// ==============================================
// BATCH ACTIONS FOR CATEGORIES, SUBCATEGORIES, PRODUCTS
// ==============================================

export function useBatchUpdateProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      productIds, 
      updates 
    }: { 
      productIds: string[]; 
      updates: Record<string, any> 
    }) => {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .in('id', productIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useBatchUpdateCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      categoryIds, 
      updates 
    }: { 
      categoryIds: string[]; 
      updates: Record<string, any> 
    }) => {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .in('id', categoryIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useBatchUpdateSubcategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      subcategoryIds, 
      updates 
    }: { 
      subcategoryIds: string[]; 
      updates: Record<string, any> 
    }) => {
      const { error } = await supabase
        .from('subcategories')
        .update(updates)
        .in('id', subcategoryIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
    },
  });
}

// Batch link option groups to products
export function useBatchLinkOptionGroups() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async ({ 
      productIds, 
      sourceProductId 
    }: { 
      productIds: string[]; 
      sourceProductId: string; // Product to copy option groups from
    }) => {
      if (!company?.id) throw new Error('Company not found');

      // Get option groups from source product
      const { data: sourceGroups, error: groupsError } = await supabase
        .from('product_option_groups')
        .select('*, items:product_option_items(*)')
        .eq('product_id', sourceProductId);

      if (groupsError) throw groupsError;
      if (!sourceGroups?.length) throw new Error('Produto de origem não possui grupos de opcionais');

      // For each target product, create copies of the option groups
      for (const targetProductId of productIds) {
        if (targetProductId === sourceProductId) continue;

        for (const group of sourceGroups) {
          // Create group for target product
          const { data: newGroup, error: createGroupError } = await supabase
            .from('product_option_groups')
            .insert({
              company_id: company.id,
              product_id: targetProductId,
              name: group.name,
              type: group.type,
              min_select: group.min_select,
              max_select: group.max_select,
              required: group.required,
              sort_order: group.sort_order,
              active: group.active,
            })
            .select()
            .single();

          if (createGroupError) {
            // If duplicate, skip
            if (createGroupError.code === '23505') continue;
            throw createGroupError;
          }

          // Create items for the new group
          if (group.items?.length && newGroup) {
            const itemsToInsert = group.items.map((item: any) => ({
              company_id: company.id,
              group_id: newGroup.id,
              label: item.label,
              price_delta: item.price_delta,
              sort_order: item.sort_order,
              active: item.active,
            }));

            const { error: itemsError } = await supabase
              .from('product_option_items')
              .insert(itemsToInsert);

            if (itemsError) throw itemsError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-option-groups'] });
    },
  });
}

// Batch link flavors to products
export function useBatchLinkFlavors() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async ({ 
      productIds, 
      flavorIds 
    }: { 
      productIds: string[]; 
      flavorIds: string[]; 
    }) => {
      if (!company?.id) throw new Error('Company not found');

      const records = productIds.flatMap(productId => 
        flavorIds.map((flavorId, index) => ({
          company_id: company.id,
          product_id: productId,
          flavor_id: flavorId,
          active: true,
          sort_order: index,
        }))
      );

      const { error } = await supabase
        .from('product_flavors')
        .upsert(records, { onConflict: 'product_id,flavor_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-flavors'] });
    },
  });
}

// Get products by category (for batch selection)
export function useProductsByCategory() {
  const { data: company } = useCompany();

  return async (categoryId: string): Promise<string[]> => {
    if (!company?.id) return [];

    // First get subcategories in this category
    const { data: subs } = await supabase
      .from('subcategories')
      .select('id')
      .eq('category_id', categoryId);

    if (!subs?.length) return [];

    // Then get products in those subcategories
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .in('subcategory_id', subs.map(s => s.id))
      .eq('active', true);

    return products?.map(p => p.id) || [];
  };
}

// Get products by subcategory (for batch selection)
export function useProductsBySubcategory() {
  const { data: company } = useCompany();

  return async (subcategoryId: string): Promise<string[]> => {
    if (!company?.id) return [];

    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('subcategory_id', subcategoryId)
      .eq('active', true);

    return products?.map(p => p.id) || [];
  };
}

// Batch update production location
export function useBatchUpdateProductionLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      entityType, 
      entityIds, 
      productionLocation 
    }: { 
      entityType: 'category' | 'subcategory' | 'product';
      entityIds: string[];
      productionLocation: string;
    }) => {
      const table = entityType === 'category' ? 'categories' : 
                    entityType === 'subcategory' ? 'subcategories' : 'products';

      const { error } = await supabase
        .from(table)
        .update({ production_location: productionLocation })
        .in('id', entityIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Batch toggle visibility
export function useBatchToggleVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      productIds, 
      visibility 
    }: { 
      productIds: string[];
      visibility: {
        aparece_delivery?: boolean;
        aparece_tv?: boolean;
        aparece_qrcode?: boolean;
        aparece_totem?: boolean;
        aparece_tablet?: boolean;
      };
    }) => {
      const { error } = await supabase
        .from('products')
        .update(visibility)
        .in('id', productIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Batch toggle active status
export function useBatchToggleActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      entityType,
      entityIds, 
      active 
    }: { 
      entityType: 'category' | 'subcategory' | 'product';
      entityIds: string[];
      active: boolean;
    }) => {
      const table = entityType === 'category' ? 'categories' : 
                    entityType === 'subcategory' ? 'subcategories' : 'products';

      const { error } = await supabase
        .from(table)
        .update({ active })
        .in('id', entityIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
