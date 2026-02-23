
/**
 * Pizza Price Utilities
 * 
 * GLOBAL RULE: Pizza products must ALWAYS display "A partir de R$ X"
 * where X is the lowest flavor price for that pizza.
 * 
 * This utility provides functions to:
 * 1. Get the lowest flavor price for a pizza product
 * 2. Format pizza prices consistently across all modules
 */

// Removed Supabase import
// import { supabase } from '@/lib/supabase-shim';

export interface PizzaLowestPrice {
  productId: string;
  lowestPrice: number | null;
  hasConfiguration: boolean;
}

/**
 * Cache for pizza lowest prices to avoid repeated queries
 */
const priceCache = new Map<string, { price: number | null; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Get the lowest flavor price for a pizza product.
 * This is used to display "A partir de R$ X" for pizzas.
 * 
 * @param productId - The product ID
 * @returns The lowest flavor price or null if no flavors configured
 */
export async function getLowestPizzaFlavorPrice(productId: string): Promise<number | null> {
  if (!productId) return null;

  // Check cache first
  const cached = priceCache.get(productId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  try {
    // TODO: Migrate to Backend API
    // Supabase logic removed.
    console.warn('[getLowestPizzaFlavorPrice] Backend migration pending.');
    
    priceCache.set(productId, { price: null, timestamp: Date.now() });
    return null;
  } catch (error) {
    console.error('[getLowestPizzaFlavorPrice] Error:', error);
    return null;
  }
}
