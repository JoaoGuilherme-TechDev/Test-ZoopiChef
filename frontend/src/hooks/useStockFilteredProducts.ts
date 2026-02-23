/**
 * Hook to filter products based on stock availability.
 * This is used across all ordering channels (Delivery, Totem, Tablet, Mesa, Waiter)
 * to ensure products with insufficient stock are not displayed.
 * 
 * GLOBAL RULE: A product is hidden if:
 * 1. Any ingredient linked to the product (via erp_recipes -> erp_recipe_lines) has insufficient stock
 */

import { useMemo } from 'react';
import { useProductStockAvailability, filterAvailableProducts } from './useProductStockAvailability';
import type { DeliveryCategory, DeliveryProduct } from './useDeliveryMenu';
import type { MenuCategory, MenuProduct } from './useMenuByToken';

interface ProductWithId {
  id: string;
  [key: string]: any;
}

/**
 * Hook that filters an array of products based on stock availability.
 * Returns only products that have sufficient stock.
 * 
 * @param products Array of products to filter
 * @param companyId Company ID to check stock for
 * @returns Object with filtered products and loading state
 */
export function useStockFilteredProducts<T extends ProductWithId>(
  products: T[],
  companyId: string | undefined
) {
  const { data: stockData, isLoading: stockLoading } = useProductStockAvailability(companyId);

  const filteredProducts = useMemo(() => {
    if (!stockData || stockData.unavailableProductIds.size === 0) {
      return products;
    }
    return filterAvailableProducts(products, stockData);
  }, [products, stockData]);

  const unavailableCount = useMemo(() => {
    if (!stockData) return 0;
    return products.filter(p => stockData.unavailableProductIds.has(p.id)).length;
  }, [products, stockData]);

  return {
    products: filteredProducts,
    isLoading: stockLoading,
    unavailableCount,
    unavailableProductIds: stockData?.unavailableProductIds || new Set<string>(),
    getUnavailableReason: (productId: string) => stockData?.unavailableReasons.get(productId) || null,
  };
}

/**
 * Filter delivery categories based on stock availability.
 * Used by PublicMenuBySlug (Delivery).
 */
export function useStockFilteredDeliveryCategories(
  categories: DeliveryCategory[],
  companyId: string | undefined
) {
  const { data: stockData, isLoading: stockLoading } = useProductStockAvailability(companyId);

  const filteredCategories = useMemo((): DeliveryCategory[] => {
    if (!stockData || stockData.unavailableProductIds.size === 0) {
      return categories;
    }

    return categories
      .map(category => ({
        ...category,
        subcategories: category.subcategories
          .map(subcategory => ({
            ...subcategory,
            products: subcategory.products.filter(
              product => !stockData.unavailableProductIds.has(product.id)
            ),
          }))
          .filter(sub => sub.products.length > 0),
      }))
      .filter(cat => cat.subcategories.length > 0);
  }, [categories, stockData]);

  return {
    categories: filteredCategories,
    isLoading: stockLoading,
    unavailableProductIds: stockData?.unavailableProductIds || new Set<string>(),
  };
}

/**
 * Filter menu categories based on stock availability.
 * Used by PublicMenuByToken (Mesa/QR).
 */
export function useStockFilteredMenuCategories(
  categories: MenuCategory[],
  companyId: string | undefined
) {
  const { data: stockData, isLoading: stockLoading } = useProductStockAvailability(companyId);

  const filteredCategories = useMemo((): MenuCategory[] => {
    if (!stockData || stockData.unavailableProductIds.size === 0) {
      return categories;
    }

    return categories
      .map(category => ({
        ...category,
        subcategories: category.subcategories
          .map(subcategory => ({
            ...subcategory,
            products: subcategory.products.filter(
              product => !stockData.unavailableProductIds.has(product.id)
            ),
          }))
          .filter(sub => sub.products.length > 0),
      }))
      .filter(cat => cat.subcategories.length > 0);
  }, [categories, stockData]);

  return {
    categories: filteredCategories,
    isLoading: stockLoading,
    unavailableProductIds: stockData?.unavailableProductIds || new Set<string>(),
  };
}
