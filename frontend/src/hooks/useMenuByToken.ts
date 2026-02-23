import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyByToken } from './useCompanyPublicLinks';

export interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_featured: boolean;
  is_on_sale: boolean;
  sale_price: number | null;
  product_type?: string;
  has_flavors?: boolean;
  has_pizza_config?: boolean; // Product has product_pizza_config (requires size selection)
  min_optional_price?: number | null; // Menor preço dos opcionais quando price = 0
  // Category info for pizza detection (STRICT: only category.name determines pizza behavior)
  subcategory?: {
    id: string;
    name: string;
    category?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface MenuSubcategory {
  id: string;
  name: string;
  image_url?: string | null;
  products: MenuProduct[];
}

export interface MenuCategory {
  id: string;
  name: string;
  image_url?: string | null;
  subcategories: MenuSubcategory[];
}

export interface ProductFlavorData {
  id: string;
  name: string;
  highlight_group: string | null;
  description: string | null;
  ingredients_raw: string | null;
  prices: Array<{
    size_name: string;
    price_full: number;
    price_per_part: number;
    price_avg: number;
  }>;
}

export interface ProductPizzaConfigData {
  allowed_sizes: string[];
  slices_per_size: Record<string, number>;
  max_flavors_per_size: Record<string, number>;
  pricing_model: 'maior' | 'media' | 'partes';
}

export function useMenuByToken(token: string | undefined, tokenType: 'menu' | 'tv' = 'menu') {
  const { data: company, isLoading: companyLoading, isError: companyError } = useCompanyByToken(token, tokenType);

  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['menu_by_token', company?.id, tokenType],
    queryFn: async () => {
      if (!company?.id) return null;

      // Get company general settings
      const { data: generalSettings } = await supabase
        .from('company_general_settings')
        .select('allow_zero_price_sales, show_unavailable_products')
        .eq('company_id', company.id)
        .maybeSingle();

      const allowZeroPriceSales = generalSettings?.allow_zero_price_sales ?? false;

      // Always use aparece_delivery for the menu
      const visibilityField = 'aparece_delivery';

      const { data: products, error } = await supabase
        .from('products')
        .select(
          `
          id,
          name,
          description,
          price,
          image_url,
          is_featured,
          is_on_sale,
          sale_price,
          product_type,
          subcategory_id,
          subcategories!inner (
            id,
            name,
            image_url,
            active,
            category_id,
            categories!inner (
              id,
              name,
              image_url,
              active
            )
          )
        `
        )
        .eq('company_id', company.id)
        .eq('active', true)
        .eq(visibilityField, true)
        .order('is_featured', { ascending: false })
        .order('name');

      if (error) {
        console.error('Error fetching menu products:', error);
        return { categories: [], featuredProducts: [], saleProducts: [], productFlavors: {}, pizzaConfigs: {} };
      }

      // Get product_flavors links to see which products have flavors
      const { data: productFlavorsLinks } = await supabase
        .from('product_flavors')
        .select('product_id, flavor_id')
        .eq('company_id', company.id)
        .eq('active', true);

      const productIdsWithFlavors = new Set(productFlavorsLinks?.map(pf => pf.product_id) || []);

      // Get product_pizza_config to see which products have pizza size config
      const { data: pizzaConfigs } = await supabase
        .from('product_pizza_config')
        .select('product_id')
        .eq('company_id', company.id);

      const productIdsWithPizzaConfig = new Set(pizzaConfigs?.map(pc => pc.product_id) || []);

      // Get product_optional_groups links to see which products have optional groups
      const { data: productOptionalLinks } = await supabase
        .from('product_optional_groups')
        .select('product_id, optional_group_id')
        .eq('company_id', company.id)
        .or('active.is.null,active.eq.true');

      const productIdsWithOptionals = new Set(productOptionalLinks?.map(pog => pog.product_id) || []);

      // Extract size name from product name
      const extractSizeFromProductName = (name: string): string => {
        const lower = (name || '').toLowerCase();
        if (lower.includes('grande') || lower.includes('gigante')) return 'grande';
        if (lower.includes('média') || lower.includes('media')) return 'média';
        if (lower.includes('pequena') || lower.includes('pequeno')) return 'pequena';
        if (lower.includes('broto')) return 'broto';
        return 'grande';
      };

      // Get minimum prices for products with optionals (for "A partir de" display)
      const productMinPrices: Record<string, number> = {};
      
      // Get optional group IDs that are linked to products
      const optionalGroupIds = [...new Set(productOptionalLinks?.map(pog => pog.optional_group_id) || [])];
      
      if (optionalGroupIds.length > 0) {
        // Get optional groups with source_type and flavor_group_id
        const { data: optionalGroups } = await supabase
          .from('optional_groups')
          .select('id, source_type, flavor_group_id')
          .in('id', optionalGroupIds)
          .or('active.is.null,active.eq.true');

        // For flavor-based groups, get min prices from flavor_prices
        const flavorGroupIds = (optionalGroups || [])
          .filter((og: any) => og.source_type === 'flavors' && og.flavor_group_id)
          .map((og: any) => og.flavor_group_id);
        
        // Get all flavor prices for all sizes
        let allFlavorPrices: any[] = [];
        
        if (flavorGroupIds.length > 0) {
          // Get flavors in these groups - flavor_group_id is directly in flavors table
          const { data: flavorsInGroups } = await supabase
            .from('flavors')
            .select('id, flavor_group_id')
            .in('flavor_group_id', flavorGroupIds)
            .eq('active', true);
          
          const flavorIds = (flavorsInGroups || []).map((f: any) => f.id);
          
          if (flavorIds.length > 0) {
            // Get prices for these flavors (all sizes)
            const { data: flavorPrices } = await supabase
              .from('flavor_prices')
              .select('flavor_id, price_full, size_name')
              .in('flavor_id', flavorIds);
            
            // Map flavor to group
            const flavorToGroup: Record<string, string> = {};
            (flavorsInGroups || []).forEach((f: any) => {
              flavorToGroup[f.id] = f.flavor_group_id;
            });
            
            allFlavorPrices = (flavorPrices || []).map((fp: any) => ({
              ...fp,
              flavor_group_id: flavorToGroup[fp.flavor_id],
            }));
          }
        }

        // For regular item-based groups, get min prices from optional_group_items
        const itemGroupIds = (optionalGroups || [])
          .filter((og: any) => og.source_type !== 'flavors')
          .map((og: any) => og.id);
        
        let minItemPricesByGroup: Record<string, number> = {};
        
        if (itemGroupIds.length > 0) {
          const { data: optionalItems } = await supabase
            .from('optional_group_items')
            .select('optional_group_id, price_delta, price_override')
            .in('optional_group_id', itemGroupIds)
            .eq('active', true);
          
          (optionalItems || []).forEach((item: any) => {
            const price = Number(item.price_override ?? item.price_delta) || 0;
            if (price > 0) {
              if (!minItemPricesByGroup[item.optional_group_id] || price < minItemPricesByGroup[item.optional_group_id]) {
                minItemPricesByGroup[item.optional_group_id] = price;
              }
            }
          });
        }

        // For each product, calculate min price based on its size.
        // IMPORTANT: if the product has flavor-based groups (pizza flavors), we prioritize the minimum flavor price
        // (base price) over any add-on optional items (e.g. refrigerante, borda, extra) so we don't show "A partir de R$ 6,00".
        const productFlavorMinPrices: Record<string, number> = {};
        const productItemMinPrices: Record<string, number> = {};

        // Pre-map which flavor groups belong to each product (so we can take the min across all linked flavor groups,
        // ignoring groups that only have zero prices).
        const productToFlavorGroupIds: Record<string, string[]> = {};
        (productOptionalLinks || []).forEach((pog: any) => {
          const og = (optionalGroups || []).find((x: any) => x.id === pog.optional_group_id);
          if (og?.source_type === 'flavors' && og.flavor_group_id) {
            if (!productToFlavorGroupIds[pog.product_id]) productToFlavorGroupIds[pog.product_id] = [];
            productToFlavorGroupIds[pog.product_id].push(og.flavor_group_id);
          }
        });

        (productOptionalLinks || []).forEach((pog: any) => {
          const product = (products || []).find((p: any) => p.id === pog.product_id);
          if (!product || Number(product.price) !== 0) return;

          const optGroup = (optionalGroups || []).find((og: any) => og.id === pog.optional_group_id);
          if (!optGroup) return;

          if (optGroup.source_type === 'flavors') {
            const sizeName = extractSizeFromProductName(product.name);
            const linkedFlavorGroups = productToFlavorGroupIds[pog.product_id] || [];
            if (linkedFlavorGroups.length === 0) return;

            const relevantPrices = allFlavorPrices.filter(
              (fp: any) => linkedFlavorGroups.includes(fp.flavor_group_id) && fp.size_name === sizeName
            );
            const validPrices = relevantPrices.filter((fp: any) => Number(fp.price_full) > 0);
            if (validPrices.length === 0) return;

            const minFlavorPrice = Math.min(...validPrices.map((fp: any) => Number(fp.price_full)));
            if (!productFlavorMinPrices[pog.product_id] || minFlavorPrice < productFlavorMinPrices[pog.product_id]) {
              productFlavorMinPrices[pog.product_id] = minFlavorPrice;
            }
            return;
          }

          const itemMin = minItemPricesByGroup[optGroup.id] || 0;
          if (itemMin > 0) {
            if (!productItemMinPrices[pog.product_id] || itemMin < productItemMinPrices[pog.product_id]) {
              productItemMinPrices[pog.product_id] = itemMin;
            }
          }
        });

        // Final price: prefer flavors (pizza base) if present, otherwise fall back to item-based groups.
        Object.keys({ ...productFlavorMinPrices, ...productItemMinPrices }).forEach((productId) => {
          productMinPrices[productId] = productFlavorMinPrices[productId] || productItemMinPrices[productId];
        });
      }

      const categoriesMap = new Map<string, MenuCategory>();
      const featuredProducts: MenuProduct[] = [];
      const saleProducts: MenuProduct[] = [];

      products?.forEach((p: any) => {
        const subcategory = p.subcategories;
        const category = subcategory?.categories;

        if (!subcategory?.active || !category?.active) return;
        
        const hasFlavors = productIdsWithFlavors.has(p.id);
        const hasOptionals = productIdsWithOptionals.has(p.id);
        const hasPizzaConfig = productIdsWithPizzaConfig.has(p.id);
        // STRICT: Only category name === "Pizza" enables pizza behavior
        const categoryName = category?.name?.toLowerCase() || '';
        const isPizzaCategory = categoryName.includes('pizza');
        const isPizzaWithFlavors = isPizzaCategory && hasFlavors;
        const hasConfigurableOptions = isPizzaWithFlavors || hasOptionals || hasPizzaConfig;

        // Filter zero price products if not allowed (but keep products with flavors or optionals)
        if (!allowZeroPriceSales && Number(p.price) === 0 && (!p.is_on_sale || !p.sale_price) && !hasConfigurableOptions) return;

        // Get min price from optionals if product price is 0 and has optionals
        const minOptionalPrice = (Number(p.price) === 0 && hasOptionals) ? productMinPrices[p.id] || null : null;

        const product: MenuProduct = {
          id: p.id,
          name: p.name,
          description: p.description ?? null,
          price: p.price,
          image_url: p.image_url ?? null,
          is_featured: !!p.is_featured,
          is_on_sale: !!p.is_on_sale,
          sale_price: p.sale_price ?? null,
          product_type: p.product_type || 'simples',
          has_flavors: hasFlavors,
          has_pizza_config: hasPizzaConfig,
          min_optional_price: minOptionalPrice,
          // Category info for pizza detection (STRICT: only category.name determines pizza behavior)
          subcategory: {
            id: subcategory.id,
            name: subcategory.name,
            category: {
              id: category.id,
              name: category.name,
            },
          },
        };

        if (product.is_featured) featuredProducts.push(product);
        if (product.is_on_sale && product.sale_price) saleProducts.push(product);

        if (!categoriesMap.has(category.id)) {
          categoriesMap.set(category.id, {
            id: category.id,
            name: category.name,
            image_url: category.image_url || null,
            subcategories: [],
          });
        }

        const cat = categoriesMap.get(category.id)!;
        let subcat = cat.subcategories.find((s) => s.id === subcategory.id);

        if (!subcat) {
          subcat = {
            id: subcategory.id,
            name: subcategory.name,
            image_url: subcategory.image_url || null,
            products: [],
          };
          cat.subcategories.push(subcat);
        }

        subcat.products.push(product);
      });

      return {
        categories: Array.from(categoriesMap.values()),
        featuredProducts,
        saleProducts,
      };
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos em cache
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Only show loading if we're actually fetching company data
  // Once company query is settled (success or error), we can move on
  const isLoading = companyLoading || (!!company?.id && menuLoading);

  return {
    company,
    categories: menuData?.categories || [],
    featuredProducts: menuData?.featuredProducts || [],
    saleProducts: menuData?.saleProducts || [],
    isLoading,
    isError: companyError,
  };
}

// Border data type
export interface BorderData {
  id: string;
  name: string;
  description: string | null;
  price: number; // Price for this border
}
// Hook to get flavors, borders, and optionals for a specific product (for pizza selection)
// IMPORTANT: Flavors and borders are now PRODUCT-SPECIFIC (from product_flavors table)
export function useProductFlavorsPublic(productId: string | undefined, companyId: string | undefined) {
  return useQuery({
    queryKey: ['product-flavors-public', productId, companyId],
    queryFn: async () => {
      if (!productId || !companyId) return { flavors: [], borders: [], pizzaConfig: null, optionGroups: [] };

      // Get flavor links for this product (includes both pizza flavors AND borders)
      const { data: links } = await supabase
        .from('product_flavors')
        .select('flavor_id')
        .eq('product_id', productId)
        .eq('active', true)
        .order('sort_order');

      if (!links?.length) return { flavors: [], borders: [], pizzaConfig: null, optionGroups: [] };

      const flavorIds = links.map(l => l.flavor_id);

      // Get ALL flavor details for linked ids (both pizza flavors and borders)
      const { data: allLinkedFlavors } = await supabase
        .from('flavors')
        .select('*')
        .in('id', flavorIds)
        .eq('active', true);

      // Separate pizza flavors from borders based on name containing "borda"
      // Pizza flavors: those NOT containing "borda" in name
      const flavors = (allLinkedFlavors || []).filter(f => 
        !f.name.toLowerCase().includes('borda')
      );
      
      // Borders: those containing "borda" in name
      const borders = (allLinkedFlavors || []).filter(f => 
        f.name.toLowerCase().includes('borda')
      );

      // Get prices for all linked flavors (both pizza flavors and borders)
      const { data: prices } = await supabase
        .from('flavor_prices')
        .select('*')
        .in('flavor_id', flavorIds);

      // Get pizza config for this product
      const { data: pizzaConfig } = await supabase
        .from('product_pizza_config')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();

      // Get optional groups for this product
      const { data: optionalLinks } = await supabase
        .from('product_optional_groups')
        .select(`
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
            items:optional_group_items(id, label, price_delta, active)
          )
        `)
        .eq('product_id', productId)
        .eq('company_id', companyId)
        .or('active.is.null,active.eq.true')
        .order('sort_order');

      // Build flavor data with prices (excluding borders)
      const flavorData: ProductFlavorData[] = (flavors || [])
        .filter(f => f.usage_type !== 'border')
        .map(f => ({
          id: f.id,
          name: f.name,
          highlight_group: f.highlight_group,
          description: f.description,
          ingredients_raw: f.ingredients_raw,
          prices: (prices || [])
            .filter(p => p.flavor_id === f.id)
            .map(p => ({
              size_name: p.size_name,
              price_full: Number(p.price_full),
              price_per_part: Number(p.price_per_part),
              price_avg: Number(p.price_avg),
            })),
        }));

      // Build border data with prices (using the same prices array)
      const borderData: BorderData[] = (borders || []).map(b => {
        // Find the first price record for this border (any size, as borders typically have flat pricing)
        const priceRecord = (prices || []).find(p => p.flavor_id === b.id);
        return {
          id: b.id,
          name: b.name,
          description: b.description,
          price: priceRecord ? Number(priceRecord.price_full) : 0,
        };
      });

      const configData: ProductPizzaConfigData | null = pizzaConfig ? {
        allowed_sizes: pizzaConfig.allowed_sizes || ['broto', 'média', 'grande'],
        slices_per_size: (pizzaConfig.slices_per_size as Record<string, number>) || {},
        max_flavors_per_size: (pizzaConfig.max_flavors_per_size as Record<string, number>) || {},
        pricing_model: pizzaConfig.pricing_model as 'maior' | 'media' | 'partes',
      } : null;

      // Build optional groups data
      type OptionGroupItem = { id: string; label: string; price_delta: number };
      type OptionGroup = {
        id: string;
        name: string;
        min_select: number;
        max_select: number;
        required: boolean;
        type: 'single' | 'multiple';
        calc_mode: string;
        items: OptionGroupItem[];
      };

      const optionGroupsData: OptionGroup[] = (optionalLinks || [])
        .filter((link: any) => link.optional_group)
        .map((link: any) => {
          const og = link.optional_group;
          const items = (og.items || [])
            .filter((item: any) => item.active !== false)
            .map((item: any) => ({
              id: item.id,
              label: item.label,
              price_delta: Number(item.price_delta || 0),
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
        .filter((g: OptionGroup) => g.items.length > 0); // Only groups with active items

      return { flavors: flavorData, borders: borderData, pizzaConfig: configData, optionGroups: optionGroupsData };
    },
    enabled: !!productId && !!companyId,
  });
}
