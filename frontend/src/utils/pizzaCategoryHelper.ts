/**
 * Pizza Category Helper
 * 
 * STRICT RULE: Ingredient removal and pizza-specific behavior is ONLY enabled
 * when the product's category name === "Pizza" (case-insensitive).
 * 
 * DO NOT check product_type, has_flavors, or any other field.
 * ONLY the category name determines pizza behavior.
 */

export interface ProductWithCategory {
  subcategory?: {
    category?: {
      name?: string | null;
    } | null;
  } | null;
}

/**
 * Check if a product belongs to the Pizza category.
 * This is the ONLY source of truth for pizza-specific UI behavior.
 * 
 * @param product - Product with optional subcategory.category.name
 * @returns true if category name includes "pizza" (case-insensitive)
 */
export function isPizzaCategory(product: ProductWithCategory | Record<string, any> | null | undefined): boolean {
  if (!product) return false;
  
  // Handle flexible product structure - may have subcategory or subcategories
  const subcategory = (product as any).subcategory || (product as any).subcategories;
  if (!subcategory) return false;
  
  // Handle category or categories (both naming conventions)
  const category = subcategory.category || subcategory.categories;
  if (!category) return false;
  
  const categoryName = (category.name || '').toLowerCase();
  return categoryName.includes('pizza');
}

/**
 * Check if a product should show ingredient removal UI.
 * This is ONLY for Pizza category products.
 * 
 * @param product - Product with category info
 * @returns true if ingredient removal should be shown
 */
export function shouldShowIngredientRemoval(product: ProductWithCategory | Record<string, any> | null | undefined): boolean {
  return isPizzaCategory(product);
}
