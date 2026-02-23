import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCallback } from 'react';

export interface PublicProductOptionalGroupLink {
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
  if (lower.includes('grande') || lower.includes('gigante')) return 'grande';
  if (lower.includes('média') || lower.includes('media')) return 'média';
  if (lower.includes('broto') || lower.includes('pequena')) return 'broto';
  if (lower.includes('família') || lower.includes('familia')) return 'família';
  return 'grande';
}

// Fetch links for a specific product (public version - no auth required)
export function usePublicProductOptionalGroupLinks(productId: string | undefined, companyId: string | undefined) {
  return useQuery({
    queryKey: ['public-product-optional-group-links', productId, companyId],
    queryFn: async () => {
      if (!productId || !companyId) return [];

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
        .eq('company_id', companyId)
        // Compat: treat NULL as active (older rows)
        .or('active.is.null,active.eq.true')
        .order('sort_order');

      if (error) throw error;
      
      // For groups with source_type = 'flavors' or 'products', fetch items dynamically
      const enrichedLinks = await Promise.all(
        (links || []).map(async (link) => {
          const og = link.optional_group;
          
          // If source_type is 'flavors' and has a flavor_group_id, fetch flavors with prices
          if (og?.source_type === 'flavors' && og?.flavor_group_id) {
            const { data: flavors } = await supabase
              .from('flavors')
              .select('id, name, active')
              .eq('flavor_group_id', og.flavor_group_id)
              .eq('active', true)
              .order('name');
            
            const flavorIds = (flavors || []).map(f => f.id);
            const { data: prices } = await supabase
              .from('flavor_prices')
              .select('flavor_id, price_full, size_name')
              .in('flavor_id', flavorIds)
              .eq('size_name', sizeName);
            
            const priceMap = new Map(
              (prices || []).map(p => [p.flavor_id, p.price_full])
            );

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
          
          // If source_type is 'products', use items with price_override
          if (og?.source_type === 'products') {
            // Items already loaded - use price_override when available
            const enrichedItems = (og.items || []).map(item => ({
              ...item,
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
      
      return enrichedLinks as PublicProductOptionalGroupLink[];
    },
    enabled: !!productId && !!companyId,
  });
}

// Check if a product has ACTIVE optional groups with ACTIVE items linked (public version)
export function usePublicCheckProductHasOptionals(companyId: string | undefined) {
  const checkProduct = useCallback(async (productId: string): Promise<boolean> => {
    if (!companyId) {
      console.log('[checkProduct] No companyId, returning false');
      return false;
    }

    console.log('[checkProduct] Checking product:', productId, 'company:', companyId);

    // Fetch links + minimal optional group data
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
      .eq('company_id', companyId);

    if (error) {
      console.error('[checkProduct] Query error:', error);
      return false;
    }

    // Filter active links (treat NULL as active for backwards compatibility)
    const activeLinks = (links || []).filter((link: any) => link.active !== false);
    console.log('[checkProduct] Active links:', activeLinks?.length);

    for (const link of activeLinks) {
      const og: any = (link as any).optional_group;
      if (!og) continue;

      console.log('[checkProduct] Checking group:', og.source_type, 'flavor_group_id:', og.flavor_group_id);

      // Flavors: need at least 1 active flavor in the linked flavor group
      if (og.source_type === 'flavors' && og.flavor_group_id) {
        const { count, error: fErr } = await supabase
          .from('flavors')
          .select('id', { count: 'exact', head: true })
          .eq('flavor_group_id', og.flavor_group_id)
          .eq('active', true);
        
        console.log('[checkProduct] Flavors count:', count, 'error:', fErr);
        if (!fErr && (count || 0) > 0) return true;
        continue;
      }

      // Default: optional_group_items must have at least 1 active item
      const items: any[] = Array.isArray(og.items) ? og.items : [];
      console.log('[checkProduct] Items count:', items.length);
      // Compat: treat NULL as active (older rows)
      if (items.some((i) => i?.active !== false)) return true;
    }

    console.log('[checkProduct] No optionals found, returning false');
    return false;
  }, [companyId]);

  return { checkProduct };
}
