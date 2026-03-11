/**
 * Centralized Product Modal Handler
 * 
 * This is the SINGLE source of truth for determining which modal to open.
 * ALL ordering flows must use this function.
 * 
 * Rules:
 * - If product.category === "Pizza" → open pizza modal
 * - If product has optionals → open optionals modal
 * - Otherwise → add directly to cart
 */

import { isPizzaProduct } from '@/hooks/usePizzaConfigV3';

export type ProductModalAction = 
  | { type: 'pizza'; productId: string; productName: string; companyId: string }
  | { type: 'optionals'; productId: string; productName: string; price: number }
  | { type: 'direct'; productId: string; productName: string; price: number };

export interface ProductForModal {
  id: string;
  name: string;
  price: number;
  subcategory?: {
    category?: {
      id?: string;
      name?: string;
    } | null;
  } | null;
  subcategories?: {
    categories?: {
      id?: string;
      name?: string;
    } | null;
  } | null;
}

/**
 * Determine what action to take when a product is clicked
 * 
 * @param product - The product being added
 * @param companyId - The company ID
 * @param hasOptionals - Whether the product has optional groups (call checkProduct first)
 * @returns The action to take
 */
export function determineProductAction(
  product: ProductForModal,
  companyId: string,
  hasOptionals: boolean
): ProductModalAction {
  // PRIORITY 1: Pizza category always opens pizza modal
  if (isPizzaProduct(product)) {
    return {
      type: 'pizza',
      productId: product.id,
      productName: product.name,
      companyId,
    };
  }

  // PRIORITY 2: Products with optionals open optionals modal
  if (hasOptionals) {
    return {
      type: 'optionals',
      productId: product.id,
      productName: product.name,
      price: product.price,
    };
  }

  // PRIORITY 3: Simple products go directly to cart
  return {
    type: 'direct',
    productId: product.id,
    productName: product.name,
    price: product.price,
  };
}

/**
 * Check if a product is a pizza by category name
 * Exported for convenience - wraps the hook function
 */
export { isPizzaProduct };
