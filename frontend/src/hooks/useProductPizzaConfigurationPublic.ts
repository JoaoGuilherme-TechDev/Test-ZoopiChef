import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';

export interface PublicPizzaFlavor {
  id: string;
  name: string;
  highlight_group: string | null;
  description: string | null;
  ingredients_raw: string | null;
  prices: Array<{
    size_name: string;
    price_full: number;
    price_per_part?: number;
    price_avg?: number;
  }>;
}

export interface PublicPizzaBorder {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

export interface PublicPizzaConfig {
  allowed_sizes: string[];
  slices_per_size: Record<string, number>;
  max_flavors_per_size: Record<string, number>;
  pricing_model: 'maior' | 'media' | 'partes';
}

export interface PublicPizzaOptionalGroup {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  type: 'single' | 'multiple';
  calc_mode: string;
  items: Array<{ id: string; label: string; price_delta: number }>;
}

export interface PublicPizzaDoughType {
  id: string;
  name: string;
  price_delta: number;
  is_default: boolean;
}

export interface PublicPizzaBorderType {
  id: string;
  name: string;
  price_delta: number;
  is_default: boolean;
}

export interface PublicProductPizzaConfiguration {
  product_id: string;
  pizzaConfig: PublicPizzaConfig | null;
  flavors: PublicPizzaFlavor[];
  borders: PublicPizzaBorder[];
  optionGroups: PublicPizzaOptionalGroup[];
  doughTypes: PublicPizzaDoughType[];
  borderTypes: PublicPizzaBorderType[];
}

export function isValidPizzaConfiguration(cfg: PublicProductPizzaConfiguration | null | undefined): boolean {
  if (!cfg) return false;
  const sizes = cfg.pizzaConfig?.allowed_sizes?.length ?? 0;
  return (
    sizes > 0 ||
    (cfg.flavors?.length ?? 0) > 0 ||
    (cfg.borders?.length ?? 0) > 0 ||
    (cfg.optionGroups?.length ?? 0) > 0 ||
    (cfg.doughTypes?.length ?? 0) > 0 ||
    (cfg.borderTypes?.length ?? 0) > 0
  );
}

/**
 * SINGLE SOURCE OF TRUTH (public): product.pizzaConfiguration
 *
 * Loads ALL pizza-related configuration for ordering.
 * - Never assumes config is missing just because product_flavors is empty.
 * - Resolves async timing by returning loading state until everything is fetched.
 */
export function useProductPizzaConfigurationPublic(
  productId: string | undefined,
  companyId: string | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['product-pizza-configuration-public', productId, companyId],
    enabled: enabled && !!productId && !!companyId,
    staleTime: 30_000,
    queryFn: async (): Promise<PublicProductPizzaConfiguration> => {
      if (!productId || !companyId) {
        return {
          product_id: productId || '',
          pizzaConfig: null,
          flavors: [],
          borders: [],
          optionGroups: [],
          doughTypes: [],
          borderTypes: [],
        };
      }

      // Fetch core pieces in parallel (no early-return assumptions)
      const [pizzaConfigRes, flavorLinksRes, optionalLinksRes, doughLinksRes, borderTypeLinksRes] = await Promise.all([
        supabase.from('product_pizza_config').select('*').eq('product_id', productId).maybeSingle(),
        supabase
          .from('product_flavors')
          .select('flavor_id, sort_order')
          .eq('product_id', productId)
          .eq('active', true)
          .order('sort_order'),
        supabase
          .from('product_optional_groups')
          .select(
            `
            id,
            min_select,
            max_select,
            sort_order,
            calc_mode,
            active,
            optional_group:optional_groups(
              id,
              name,
              source_type,
              flavor_group_id,
              calc_mode,
              items:optional_group_items(id, label, price_delta, price_override, active)
            )
          `
          )
          .eq('product_id', productId)
          .eq('company_id', companyId)
          .or('active.is.null,active.eq.true')
          .order('sort_order'),
        supabase
          .from('product_pizza_dough_types')
          .select('dough_type_id')
          .eq('product_id', productId),
        supabase
          .from('product_pizza_border_types')
          .select('border_type_id')
          .eq('product_id', productId),
      ]);

      if (pizzaConfigRes.error) throw pizzaConfigRes.error;
      if (flavorLinksRes.error) throw flavorLinksRes.error;
      if (optionalLinksRes.error) throw optionalLinksRes.error;

      const pizzaConfigRow: any = pizzaConfigRes.data;
      const pizzaConfig: PublicPizzaConfig | null = pizzaConfigRow
        ? {
            allowed_sizes: (pizzaConfigRow.allowed_sizes || []) as string[],
            slices_per_size: (pizzaConfigRow.slices_per_size as Record<string, number>) || {},
            max_flavors_per_size: (pizzaConfigRow.max_flavors_per_size as Record<string, number>) || {},
            pricing_model: (pizzaConfigRow.pricing_model as 'maior' | 'media' | 'partes') || 'maior',
          }
        : null;

      // Flavors + borders
      const flavorIds = (flavorLinksRes.data || []).map((l: any) => l.flavor_id).filter(Boolean);
      let flavors: PublicPizzaFlavor[] = [];
      let borders: PublicPizzaBorder[] = [];

      if (flavorIds.length > 0) {
        const [flavorsRes, pricesRes] = await Promise.all([
          supabase.from('flavors').select('*').in('id', flavorIds).eq('active', true),
          supabase.from('flavor_prices').select('*').in('flavor_id', flavorIds),
        ]);

        if (flavorsRes.error) throw flavorsRes.error;
        if (pricesRes.error) throw pricesRes.error;

        const allLinked = (flavorsRes.data || []) as any[];
        const priceRows = (pricesRes.data || []) as any[];

        const byId = new Map<string, any>();
        allLinked.forEach((f) => byId.set(f.id, f));

        // Keep UI order based on product_flavors.sort_order
        const ordered = flavorIds.map((id) => byId.get(id)).filter(Boolean);

        const priceMap = new Map<string, any[]>();
        priceRows.forEach((p) => {
          const list = priceMap.get(p.flavor_id) || [];
          list.push(p);
          priceMap.set(p.flavor_id, list);
        });

        const isBorderName = (name: string) => (name || '').toLowerCase().includes('borda');

        ordered.forEach((f) => {
          if (isBorderName(f.name)) {
            const first = (priceMap.get(f.id) || [])[0];
            borders.push({
              id: f.id,
              name: f.name,
              description: f.description ?? null,
              price: first ? Number(first.price_full) || 0 : 0,
            });
            return;
          }

          flavors.push({
            id: f.id,
            name: f.name,
            highlight_group: f.highlight_group ?? null,
            description: f.description ?? null,
            ingredients_raw: f.ingredients_raw ?? null,
            prices: (priceMap.get(f.id) || []).map((p) => ({
              size_name: p.size_name,
              price_full: Number(p.price_full) || 0,
              price_per_part: p.price_per_part != null ? Number(p.price_per_part) || 0 : undefined,
              price_avg: p.price_avg != null ? Number(p.price_avg) || 0 : undefined,
            })),
          });
        });
      }

      // Option groups
      const optionGroups: PublicPizzaOptionalGroup[] = (optionalLinksRes.data || [])
        .filter((link: any) => link.optional_group)
        .map((link: any) => {
          const og = link.optional_group;
          const items = (og.items || [])
            .filter((item: any) => item?.active !== false)
            .map((item: any) => ({
              id: item.id,
              label: item.label,
              price_delta: Number(item.price_override ?? item.price_delta ?? 0),
            }));

          return {
            id: og.id,
            name: og.name,
            min_select: link.min_select ?? 0,
            max_select: link.max_select ?? items.length,
            required: (link.min_select ?? 0) > 0,
            type: (link.max_select === 1 ? 'single' : 'multiple') as 'single' | 'multiple',
            calc_mode: link.calc_mode || og.calc_mode || 'proportional',
            items,
          };
        })
        .filter((g: PublicPizzaOptionalGroup) => g.items.length > 0);

      // Dough types
      const doughTypeIds = (doughLinksRes.data || []).map((d: any) => d.dough_type_id).filter(Boolean);
      let doughTypes: PublicPizzaDoughType[] = [];
      if (doughTypeIds.length > 0) {
        const { data: doughData } = await supabase
          .from('pizza_dough_types')
          .select('id, name, price_delta, is_default')
          .in('id', doughTypeIds)
          .eq('is_active', true)
          .order('sort_order');
        doughTypes = (doughData || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          price_delta: Number(d.price_delta) || 0,
          is_default: d.is_default || false,
        }));
      }

      // Border types
      const borderTypeIds = (borderTypeLinksRes.data || []).map((b: any) => b.border_type_id).filter(Boolean);
      let borderTypes: PublicPizzaBorderType[] = [];
      if (borderTypeIds.length > 0) {
        const { data: borderData } = await supabase
          .from('pizza_border_types')
          .select('id, name, price_delta, is_default')
          .in('id', borderTypeIds)
          .eq('is_active', true)
          .order('sort_order');
        borderTypes = (borderData || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          price_delta: Number(b.price_delta) || 0,
          is_default: b.is_default || false,
        }));
      }

      return {
        product_id: productId,
        pizzaConfig,
        flavors,
        borders,
        optionGroups,
        doughTypes,
        borderTypes,
      };
    },
  });
}
