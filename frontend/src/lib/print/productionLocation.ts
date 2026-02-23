import { supabase } from '@/lib/supabase-shim';

/**
 * Get the production location for an item, following inheritance rules:
 * 1. If product has production_location, use it
 * 2. Else if subcategory has production_location, use it
 * 3. Else if category has production_location, use it
 * 4. Else return null (use default printer)
 */
export async function getProductionLocation(
  productId: string
): Promise<string | null> {
  // Get product with subcategory and category
  const { data: product } = await supabase
    .from('products')
    .select(`
      production_location,
      subcategory:subcategories!inner (
        production_location,
        category:categories!inner (
          production_location
        )
      )
    `)
    .eq('id', productId)
    .single();

  if (!product) return null;

  // Check inheritance chain
  if (product.production_location) {
    return product.production_location;
  }

  const subcategory = product.subcategory as any;
  if (subcategory?.production_location) {
    return subcategory.production_location;
  }

  if (subcategory?.category?.production_location) {
    return subcategory.category.production_location;
  }

  return null;
}

/**
 * Get production locations for multiple products at once
 */
export async function getProductionLocationsForProducts(
  productIds: string[]
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  
  if (!productIds.length) return result;

  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      production_location,
      subcategory:subcategories!inner (
        production_location,
        category:categories!inner (
          production_location
        )
      )
    `)
    .in('id', productIds);

  if (!products) return result;

  products.forEach((product: any) => {
    let location: string | null = null;

    if (product.production_location) {
      location = product.production_location;
    } else if (product.subcategory?.production_location) {
      location = product.subcategory.production_location;
    } else if (product.subcategory?.category?.production_location) {
      location = product.subcategory.category.production_location;
    }

    result.set(product.id, location);
  });

  return result;
}

/**
 * Group items by production location for printing
 */
export async function groupItemsByProductionLocation<T extends { product_id: string }>(
  items: T[]
): Promise<Map<string, T[]>> {
  const productIds = items.map(i => i.product_id);
  const locations = await getProductionLocationsForProducts(productIds);
  
  const grouped = new Map<string, T[]>();
  
  items.forEach(item => {
    const location = locations.get(item.product_id) || 'default';
    
    if (!grouped.has(location)) {
      grouped.set(location, []);
    }
    grouped.get(location)!.push(item);
  });
  
  return grouped;
}
