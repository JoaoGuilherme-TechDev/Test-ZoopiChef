/**
 * Hook to check product stock availability.
 * Products (or their linked ingredients) with stock below minimum are blocked from ordering.
 * 
 * GLOBAL RULE: A product is unavailable if:
 * 1. Any ingredient linked to the product (via erp_recipes -> erp_recipe_lines) has insufficient stock
 * 
 * This hook is used across all ordering channels to filter unavailable products.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';

interface StockAvailabilityResult {
  unavailableProductIds: Set<string>;
  unavailableReasons: Map<string, string>;
}

interface LowStockItem {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
}

interface RecipeLine {
  recipe_id: string;
  component_item_id: string;
}

interface Recipe {
  id: string;
  sale_item_id: string;
}

/**
 * Hook to check which products are available based on stock levels.
 * Returns a set of unavailable product IDs and reasons.
 */
export function useProductStockAvailability(companyId: string | undefined) {
  return useQuery({
    queryKey: ['product-stock-availability', companyId],
    enabled: !!companyId,
    staleTime: 30000, // 30 seconds - stock changes frequently
    refetchInterval: 60000, // Refetch every minute
    queryFn: async (): Promise<StockAvailabilityResult> => {
      if (!companyId) {
        return { 
          unavailableProductIds: new Set(),
          unavailableReasons: new Map()
        };
      }

      // Step 1: Get all ERP items with low stock
      const { data: stockItems, error: stockError } = await supabase
        .from('erp_items')
        .select('id, name, current_stock, min_stock')
        .eq('company_id', companyId)
        .eq('active', true)
        .eq('track_stock', true);

      if (stockError) {
        console.error('Error fetching stock:', stockError);
        return { 
          unavailableProductIds: new Set(),
          unavailableReasons: new Map()
        };
      }

      // Find items that are actually low on stock
      const lowStockItemIds = new Set<string>();
      const lowStockItemNames = new Map<string, string>();
      
      ((stockItems || []) as LowStockItem[]).forEach(item => {
        const currentStock = item.current_stock || 0;
        const minStock = item.min_stock || 0;
        
        if (currentStock <= minStock) {
          lowStockItemIds.add(item.id);
          lowStockItemNames.set(item.id, item.name);
        }
      });

      // If no items are low on stock, all products are available
      if (lowStockItemIds.size === 0) {
        return { 
          unavailableProductIds: new Set(),
          unavailableReasons: new Map()
        };
      }

      // Step 2: Get recipe lines that use low-stock items
      const { data: recipeLines, error: linesError } = await supabase
        .from('erp_recipe_lines')
        .select('recipe_id, component_item_id')
        .eq('company_id', companyId)
        .in('component_item_id', Array.from(lowStockItemIds));

      if (linesError) {
        console.error('Error fetching recipe lines:', linesError);
        return { 
          unavailableProductIds: new Set(),
          unavailableReasons: new Map()
        };
      }

      if (!recipeLines?.length) {
        return { 
          unavailableProductIds: new Set(),
          unavailableReasons: new Map()
        };
      }

      // Get unique recipe IDs
      const recipeIds = [...new Set((recipeLines as RecipeLine[]).map(l => l.recipe_id))];

      // Step 3: Get recipes to find linked sale items (products)
      const { data: recipes, error: recipesError } = await supabase
        .from('erp_recipes')
        .select('id, sale_item_id')
        .eq('company_id', companyId)
        .eq('active', true)
        .in('id', recipeIds);

      if (recipesError) {
        console.error('Error fetching recipes:', recipesError);
        return { 
          unavailableProductIds: new Set(),
          unavailableReasons: new Map()
        };
      }

      // Build unavailable products set
      const unavailableProductIds = new Set<string>();
      const unavailableReasons = new Map<string, string>();

      // Map recipe_id to sale_item_id
      const recipeToProduct = new Map<string, string>();
      ((recipes || []) as Recipe[]).forEach(r => {
        if (r.sale_item_id) {
          recipeToProduct.set(r.id, r.sale_item_id);
        }
      });

      // For each recipe line with low stock component, mark the product as unavailable
      (recipeLines as RecipeLine[]).forEach(line => {
        const productId = recipeToProduct.get(line.recipe_id);
        if (productId && lowStockItemIds.has(line.component_item_id)) {
          unavailableProductIds.add(productId);
          const itemName = lowStockItemNames.get(line.component_item_id) || 'Ingrediente';
          unavailableReasons.set(productId, `Estoque insuficiente: ${itemName}`);
        }
      });

      return { 
        unavailableProductIds,
        unavailableReasons
      };
    },
  });
}

/**
 * Helper hook to check if a specific product is available.
 */
export function useIsProductAvailable(
  productId: string | undefined, 
  companyId: string | undefined
) {
  const { data, isLoading } = useProductStockAvailability(companyId);

  if (!productId || isLoading || !data) {
    return { isAvailable: true, isLoading, reason: null };
  }

  const isAvailable = !data.unavailableProductIds.has(productId);
  const reason = data.unavailableReasons.get(productId) || null;

  return { isAvailable, isLoading, reason };
}

/**
 * Filter a list of products to only include available ones.
 */
export function filterAvailableProducts<T extends { id: string }>(
  products: T[],
  stockData: StockAvailabilityResult | undefined
): T[] {
  if (!stockData || stockData.unavailableProductIds.size === 0) {
    return products;
  }

  return products.filter(p => !stockData.unavailableProductIds.has(p.id));
}