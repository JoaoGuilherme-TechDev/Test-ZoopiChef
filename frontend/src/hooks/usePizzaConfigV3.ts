/**
 * Pizza Configuration Hook V3 - COMPLETE REBUILD
 * 
 * CRITICAL ARCHITECTURE RULES:
 * - NO useEffect that writes to state
 * - NO derived state stored as state
 * - ONE-DIRECTIONAL data flow only
 * - Pure React Query for data fetching
 * - Explicit user-triggered updates only
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';

// ============================================
// CONSTANTS
// ============================================

export const PIZZA_SIZES = {
  broto: { label: 'Broto', slices: 4, maxFlavors: 1 },
  media: { label: 'Média', slices: 6, maxFlavors: 2 },
  grande: { label: 'Grande', slices: 8, maxFlavors: 3 },
  gigante: { label: 'Gigante', slices: 12, maxFlavors: 4 },
} as const;

export type PizzaSizeKey = keyof typeof PIZZA_SIZES;

// ============================================
// TYPES
// ============================================

export interface FlavorData {
  id: string;
  name: string;
  description: string | null;
  ingredients_raw: string | null;
  highlight_group: string | null;
  prices: { size_name: string; price_full: number }[];
}

export interface BorderData {
  id: string;
  name: string;
  price: number;
}

export interface OptionalGroupData {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  items: { id: string; label: string; price: number }[];
}

export interface PizzaConfig {
  product_id: string;
  allowed_sizes: string[];
  slices_per_size: Record<string, number>;
  max_flavors_per_size: Record<string, number>;
  pricing_model: 'maior' | 'media' | 'partes';
}

// ============================================
// QUERY KEYS
// ============================================

const queryKeys = {
  config: (productId: string) => ['pizza-v3-config', productId],
  flavors: (companyId: string) => ['pizza-v3-flavors', companyId],
  borders: (companyId: string) => ['pizza-v3-borders', companyId],
  optionals: (companyId: string) => ['pizza-v3-optionals', companyId],
  productFlavors: (productId: string) => ['pizza-v3-product-flavors', productId],
  productOptionals: (productId: string) => ['pizza-v3-product-optionals', productId],
};

// ============================================
// FETCH HOOKS
// ============================================

/**
 * Fetch the pizza config for a product
 */
export function usePizzaConfig(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.config(productId || ''),
    enabled: !!productId,
    staleTime: 30000,
    queryFn: async (): Promise<PizzaConfig | null> => {
      const { data, error } = await supabase
        .from('product_pizza_config')
        .select('*')
        .eq('product_id', productId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        product_id: data.product_id,
        allowed_sizes: data.allowed_sizes || [],
        slices_per_size: (data.slices_per_size as Record<string, number>) || {},
        max_flavors_per_size: (data.max_flavors_per_size as Record<string, number>) || {},
        pricing_model: (data.pricing_model as 'maior' | 'media' | 'partes') || 'maior',
      };
    },
  });
}

/**
 * Fetch ALL flavors (non-border) for company
 */
export function useAllFlavors(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.flavors(companyId || ''),
    enabled: !!companyId,
    staleTime: 30000,
    queryFn: async (): Promise<FlavorData[]> => {
      const { data, error } = await supabase
        .from('flavors')
        .select('id, name, description, ingredients_raw, highlight_group, usage_type')
        .eq('company_id', companyId!)
        .eq('active', true)
        .order('name');

      if (error) throw error;

      // Filter: pizza flavors that are NOT borders
      const flavors = (data || []).filter(
        f => f.usage_type === 'pizza' && !f.name.toLowerCase().includes('borda')
      );

      if (flavors.length === 0) return [];

      // Get prices
      const ids = flavors.map(f => f.id);
      const { data: prices } = await supabase
        .from('flavor_prices')
        .select('flavor_id, size_name, price_full')
        .in('flavor_id', ids);

      const priceMap = new Map<string, { size_name: string; price_full: number }[]>();
      (prices || []).forEach(p => {
        const list = priceMap.get(p.flavor_id) || [];
        list.push({ size_name: p.size_name, price_full: p.price_full });
        priceMap.set(p.flavor_id, list);
      });

      return flavors.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        ingredients_raw: f.ingredients_raw,
        highlight_group: f.highlight_group,
        prices: priceMap.get(f.id) || [],
      }));
    },
  });
}

/**
 * Fetch ALL borders for company
 */
export function useAllBorders(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.borders(companyId || ''),
    enabled: !!companyId,
    staleTime: 30000,
    queryFn: async (): Promise<BorderData[]> => {
      const { data, error } = await supabase
        .from('flavors')
        .select('id, name, description')
        .eq('company_id', companyId!)
        .eq('active', true)
        .ilike('name', '%borda%')
        .order('name');

      if (error) throw error;
      if (!data?.length) return [];

      const ids = data.map(b => b.id);
      const { data: prices } = await supabase
        .from('flavor_prices')
        .select('flavor_id, price_full')
        .in('flavor_id', ids);

      const priceMap = new Map<string, number>();
      (prices || []).forEach(p => {
        if (!priceMap.has(p.flavor_id)) {
          priceMap.set(p.flavor_id, p.price_full);
        }
      });

      return data.map(b => ({
        id: b.id,
        name: b.name,
        price: priceMap.get(b.id) || 0,
      }));
    },
  });
}

/**
 * Fetch ALL optional groups for company
 */
export function useAllOptionalGroups(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.optionals(companyId || ''),
    enabled: !!companyId,
    staleTime: 30000,
    queryFn: async (): Promise<OptionalGroupData[]> => {
      const { data, error } = await supabase
        .from('optional_groups')
        .select('id, name, min_select, max_select')
        .eq('company_id', companyId!)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      if (!data?.length) return [];

      const ids = data.map(g => g.id);
      const { data: items } = await supabase
        .from('optional_group_items')
        .select('id, optional_group_id, label, price_delta, price_override')
        .in('optional_group_id', ids)
        .eq('active', true);

      const itemMap = new Map<string, { id: string; label: string; price: number }[]>();
      (items || []).forEach((item: any) => {
        const list = itemMap.get(item.optional_group_id) || [];
        list.push({
          id: item.id,
          label: item.label || '',
          price: item.price_override ?? item.price_delta ?? 0,
        });
        itemMap.set(item.optional_group_id, list);
      });

      return data.map(g => ({
        id: g.id,
        name: g.name,
        min_select: g.min_select || 0,
        max_select: g.max_select || 10,
        items: itemMap.get(g.id) || [],
      }));
    },
  });
}

/**
 * Fetch linked flavor IDs for a product
 */
export function useProductFlavorIds(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.productFlavors(productId || ''),
    enabled: !!productId,
    staleTime: 30000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('product_flavors')
        .select('flavor_id')
        .eq('product_id', productId!)
        .eq('active', true);

      if (error) throw error;
      return (data || []).map(d => d.flavor_id);
    },
  });
}

/**
 * Fetch linked optional group IDs for a product
 */
export function useProductOptionalIds(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.productOptionals(productId || ''),
    enabled: !!productId,
    staleTime: 30000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('product_optional_groups')
        .select('optional_group_id')
        .eq('product_id', productId!);

      if (error) throw error;
      return (data || []).map(d => d.optional_group_id);
    },
  });
}

// ============================================
// SAVE MUTATION
// ============================================

interface SaveParams {
  productId: string;
  companyId: string;
  sizes: string[];
  flavorIds: string[];
  borderIds: string[];
  optionalIds: string[];
  pricingModel: 'maior' | 'media' | 'partes';
}

export function useSavePizzaConfig() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveParams) => {
      const { productId, companyId, sizes, flavorIds, borderIds, optionalIds, pricingModel } = params;

      // Build slices and max flavors
      const slices: Record<string, number> = {};
      const maxFlavors: Record<string, number> = {};
      sizes.forEach(s => {
        const def = PIZZA_SIZES[s as PizzaSizeKey];
        slices[s] = def?.slices || 8;
        maxFlavors[s] = def?.maxFlavors || 2;
      });

      // 1. Upsert config
      const { error: cfgErr } = await supabase
        .from('product_pizza_config')
        .upsert({
          product_id: productId,
          company_id: companyId,
          requires_size: true,
          allowed_sizes: sizes,
          slices_per_size: slices,
          max_flavors_per_size: maxFlavors,
          pricing_model: pricingModel,
        }, { onConflict: 'product_id' });

      if (cfgErr) throw cfgErr;

      // 2. Replace product_flavors
      await supabase.from('product_flavors').delete().eq('product_id', productId);

      const allFlavorBorderIds = [...new Set([...flavorIds, ...borderIds])];
      if (allFlavorBorderIds.length > 0) {
        const records = allFlavorBorderIds.map((id, i) => ({
          company_id: companyId,
          product_id: productId,
          flavor_id: id,
          active: true,
          sort_order: i,
        }));
        const { error } = await supabase.from('product_flavors').insert(records);
        if (error) throw error;
      }

      // 3. Replace product_optional_groups
      await supabase.from('product_optional_groups').delete().eq('product_id', productId);

      if (optionalIds.length > 0) {
        const records = optionalIds.map((gid, i) => ({
          company_id: companyId,
          product_id: productId,
          optional_group_id: gid,
          min_select: 0,
          max_select: 10,
          sort_order: i,
          active: true,
        }));
        const { error } = await supabase.from('product_optional_groups').insert(records);
        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: (_, params) => {
      toast.success('Configuração salva!');
      qc.invalidateQueries({ queryKey: queryKeys.config(params.productId) });
      qc.invalidateQueries({ queryKey: queryKeys.productFlavors(params.productId) });
      qc.invalidateQueries({ queryKey: queryKeys.productOptionals(params.productId) });
      // Also invalidate modal data so changes appear immediately in ordering flow
      qc.invalidateQueries({ queryKey: ['pizza-v3-modal', params.productId, params.companyId] });
      qc.invalidateQueries({ queryKey: ['pizza-config-tab-data', params.productId] });
      // Invalidate public menu queries (used by FlavorSelectorDialog/PizzaConfiguratorDialog)
      qc.invalidateQueries({ queryKey: ['product-flavors-public', params.productId, params.companyId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar');
    },
  });
}

// ============================================
// CATEGORY DETECTION
// ============================================

export function isPizzaProduct(product: any): boolean {
  if (!product) return false;
  
  const sub = product.subcategory || product.subcategories;
  if (!sub) return false;
  
  const cat = sub.category || sub.categories;
  if (!cat) return false;
  
  const name = (cat.name || '').toLowerCase();
  return name.includes('pizza');
}

// ============================================
// MODAL DATA HOOK
// ============================================

export interface ModalPizzaData {
  config: PizzaConfig;
  flavors: FlavorData[];
  borders: BorderData[];
  optionals: OptionalGroupData[];
}

export function usePizzaModalData(productId: string | undefined, companyId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['pizza-v3-modal', productId, companyId],
    enabled: enabled && !!productId && !!companyId,
    staleTime: 30000,
    queryFn: async (): Promise<ModalPizzaData | null> => {
      // Get config
      const { data: cfg } = await supabase
        .from('product_pizza_config')
        .select('*')
        .eq('product_id', productId!)
        .maybeSingle();

      if (!cfg) return null;

      const config: PizzaConfig = {
        product_id: cfg.product_id,
        allowed_sizes: cfg.allowed_sizes || [],
        slices_per_size: (cfg.slices_per_size as Record<string, number>) || {},
        max_flavors_per_size: (cfg.max_flavors_per_size as Record<string, number>) || {},
        pricing_model: (cfg.pricing_model as 'maior' | 'media' | 'partes') || 'maior',
      };

      // Get linked flavor/border IDs
      const { data: links } = await supabase
        .from('product_flavors')
        .select('flavor_id')
        .eq('product_id', productId!)
        .eq('active', true);

      const linkedIds = (links || []).map(l => l.flavor_id);
      if (linkedIds.length === 0) {
        return { config, flavors: [], borders: [], optionals: [] };
      }

      // Get flavor details
      const { data: flavorData } = await supabase
        .from('flavors')
        .select('id, name, description, ingredients_raw, highlight_group')
        .in('id', linkedIds)
        .eq('active', true);

      // Separate flavors from borders
      const rawFlavors = (flavorData || []).filter(f => !f.name.toLowerCase().includes('borda'));
      const rawBorders = (flavorData || []).filter(f => f.name.toLowerCase().includes('borda'));

      // Get prices
      const allIds = (flavorData || []).map(f => f.id);
      const { data: priceData } = await supabase
        .from('flavor_prices')
        .select('flavor_id, size_name, price_full')
        .in('flavor_id', allIds);

      const priceMap = new Map<string, { size_name: string; price_full: number }[]>();
      (priceData || []).forEach(p => {
        const list = priceMap.get(p.flavor_id) || [];
        list.push({ size_name: p.size_name, price_full: p.price_full });
        priceMap.set(p.flavor_id, list);
      });

      const flavors: FlavorData[] = rawFlavors.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        ingredients_raw: f.ingredients_raw,
        highlight_group: f.highlight_group,
        prices: priceMap.get(f.id) || [],
      }));

      const borders: BorderData[] = rawBorders.map(b => ({
        id: b.id,
        name: b.name,
        price: priceMap.get(b.id)?.[0]?.price_full || 0,
      }));

      // Get optionals
      const { data: optLinks } = await supabase
        .from('product_optional_groups')
        .select('optional_group_id')
        .eq('product_id', productId!);

      const optIds = (optLinks || []).map(o => o.optional_group_id);
      let optionals: OptionalGroupData[] = [];

      if (optIds.length > 0) {
        const { data: optData } = await supabase
          .from('optional_groups')
          .select('id, name, min_select, max_select')
          .in('id', optIds)
          .eq('active', true);

        if (optData?.length) {
          const { data: items } = await supabase
            .from('optional_group_items')
            .select('id, optional_group_id, label, price_delta, price_override')
            .in('optional_group_id', optIds)
            .eq('active', true);

          const itemMap = new Map<string, { id: string; label: string; price: number }[]>();
          (items || []).forEach((it: any) => {
            const list = itemMap.get(it.optional_group_id) || [];
            list.push({
              id: it.id,
              label: it.label || '',
              price: it.price_override ?? it.price_delta ?? 0,
            });
            itemMap.set(it.optional_group_id, list);
          });

          optionals = optData.map(g => ({
            id: g.id,
            name: g.name,
            min_select: g.min_select || 0,
            max_select: g.max_select || 10,
            items: itemMap.get(g.id) || [],
          }));
        }
      }

      return { config, flavors, borders, optionals };
    },
  });
}
