import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useCallback } from 'react';

export interface ProductOptionalGroupLink {
  id: string;
  company_id: string;
  product_id: string;
  optional_group_id: string;
  min_select: number;
  max_select: number;
  sort_order: number;
  selection_unique: boolean;
  calc_mode: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  optional_group?: {
    id: string;
    name: string;
    source_type: string;
    flavor_group_id: string | null;
    subcategory_id: string | null;
    calc_mode: string | null;
    items?: Array<{
      id: string;
      label: string;
      price_delta: number;
      price_override?: number | null;
      product_id?: string | null;
      flavor_id: string | null;
      active: boolean;
    }>;
  };
}

// Extract size name from product name (Pizza Grande -> grande, Pizza Média -> média, etc.)
function extractSizeFromProductName(productName: string): string {
  const lower = productName.toLowerCase();
  if (lower.includes('grande')) return 'grande';
  if (lower.includes('média') || lower.includes('media')) return 'média';
  if (lower.includes('broto') || lower.includes('pequena')) return 'broto';
  if (lower.includes('família') || lower.includes('familia')) return 'família';
  // Default to 'grande' if no size found
  return 'grande';
}

// Fetch links for a specific product, including flavors when source_type is 'flavors'
export function useProductOptionalGroupLinks(productId: string | undefined) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['product-optional-group-links', productId],
    queryFn: async () => {
      if (!productId || !company?.id) return [];

      // First get the product to extract size from name
      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();
      
      const sizeName = product ? extractSizeFromProductName(product.name) : 'grande';

      // Get the links with optional groups
      const { data: links, error } = await supabase
        .from('product_optional_groups')
        .select(`
          *,
          optional_group:optional_groups(
            id,
            name,
            source_type,
            flavor_group_id,
            subcategory_id,
            calc_mode,
            items:optional_group_items(id, label, price_delta, price_override, product_id, flavor_id, active)
          )
        `)
        .eq('product_id', productId)
        .eq('company_id', company.id)
        .order('sort_order');

      if (error) throw error;
      
      // For groups with source_type = 'flavors' or 'products', fetch items dynamically
      const enrichedLinks = await Promise.all(
        (links || []).map(async (link) => {
          const og = link.optional_group;
          
          // If source_type is 'flavors' and has a flavor_group_id, fetch flavors with prices
          if (og?.source_type === 'flavors' && og?.flavor_group_id) {
            // Get flavors
            const { data: flavors } = await supabase
              .from('flavors')
              .select('id, name, active')
              .eq('flavor_group_id', og.flavor_group_id)
              .eq('active', true)
              .order('name');
            
            // Get flavor prices for the correct size
            const flavorIds = (flavors || []).map(f => f.id);
            const { data: prices } = await supabase
              .from('flavor_prices')
              .select('flavor_id, price_full, size_name')
              .in('flavor_id', flavorIds)
              .eq('size_name', sizeName);
            
            const priceMap = new Map(
              (prices || []).map(p => [p.flavor_id, p.price_full])
            );

            // Convert flavors to items format with prices
            const flavorItems = (flavors || []).map(f => ({
              id: f.id,
              label: f.name,
              price_delta: priceMap.get(f.id) || 0,
              flavor_id: f.id,
              active: f.active,
            }));

            return {
              ...link,
              optional_group: {
                ...og,
                items: flavorItems,
              },
            };
          }
          
          // If source_type is 'products' and has items with product_id, use those
          // (items are created via sync, with price_override)
          if (og?.source_type === 'products') {
            // Items already loaded from join - use price_override when available
            const enrichedItems = (og.items || []).map(item => ({
              ...item,
              // Use price_override if set, otherwise fall back to price_delta
              price_delta: item.price_override ?? item.price_delta ?? 0,
            }));
            
            return {
              ...link,
              optional_group: {
                ...og,
                items: enrichedItems,
              },
            };
          }
          
          return link;
        })
      );
      
      return enrichedLinks as ProductOptionalGroupLink[];
    },
    enabled: !!productId && !!company?.id,
  });
}

// Link an optional group to a product
export function useLinkOptionalGroupToProduct() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (link: {
      product_id: string;
      optional_group_id: string;
      min_select?: number;
      max_select?: number;
      sort_order?: number;
      calc_mode?: string;
    }) => {
      if (!company?.id) throw new Error('Company not found');

      const { data, error } = await supabase
        .from('product_optional_groups')
        .insert({
          company_id: company.id,
          product_id: link.product_id,
          optional_group_id: link.optional_group_id,
          min_select: link.min_select ?? 1,
          max_select: link.max_select ?? 1,
          sort_order: link.sort_order ?? 0,
          calc_mode: link.calc_mode ?? null,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-optional-group-links', variables.product_id] });
    },
  });
}

// Update link settings
export function useUpdateProductOptionalGroupLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, product_id, ...updates }: Partial<ProductOptionalGroupLink> & { id: string; product_id: string }) => {
      const { data, error } = await supabase
        .from('product_optional_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, product_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-optional-group-links', data.product_id] });
    },
  });
}

// Check if a product has ACTIVE optional groups with ACTIVE items linked
export function useCheckProductHasOptionals() {
  const { data: company } = useCompany();

  const checkProduct = useCallback(async (productId: string): Promise<boolean> => {
    if (!company?.id) return false;

    const { data: links, error } = await supabase
      .from('product_optional_groups')
      .select(`
        id,
        active,
        optional_group:optional_groups(
          source_type,
          flavor_group_id,
          items:optional_group_items(active)
        )
      `)
      .eq('product_id', productId)
      .eq('company_id', company.id);

    if (error) return false;

    // Filter active links (treat NULL as active for backwards compatibility)
    const activeLinks = (links || []).filter((link: any) => link.active !== false);

    for (const link of activeLinks) {
      const og: any = (link as any).optional_group;
      if (!og) continue;

      if (og.source_type === 'flavors' && og.flavor_group_id) {
        const { count, error: fErr } = await supabase
          .from('flavors')
          .select('id', { count: 'exact', head: true })
          .eq('flavor_group_id', og.flavor_group_id)
          .eq('active', true);
        if (!fErr && (count || 0) > 0) return true;
        continue;
      }

      const items: any[] = Array.isArray(og.items) ? og.items : [];
      // Compat: treat NULL as active (older rows)
      if (items.some((i) => i?.active !== false)) return true;
    }

    return false;
  }, [company?.id]);

  return { checkProduct };
}

// Remove link
export function useUnlinkOptionalGroupFromProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, product_id }: { id: string; product_id: string }) => {
      const { error } = await supabase
        .from('product_optional_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { product_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-optional-group-links', data.product_id] });
    },
  });
}
