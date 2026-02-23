// Sommelier Pairing Service - SSOT for pairing logic
// Following SRP: This service handles only pairing calculations

import { ProductTag } from '../types';

export interface PairingRule {
  wine_tag_type: string;
  wine_tag_value: string;
  pairing_tag_type: string;
  pairing_tag_value: string;
  weight: number;
}

export interface ScoredProduct {
  id: string;
  matchScore: number;
}

/**
 * Calculate match score between a wine and potential pairing products
 * Following KISS: Simple scoring algorithm
 */
export function calculatePairingScore(
  wineTags: ProductTag[],
  productTags: ProductTag[],
  rules: PairingRule[]
): number {
  let score = 0;

  for (const rule of rules) {
    const wineMatch = wineTags.some(
      (t) => t.tag_type === rule.wine_tag_type && t.tag_value === rule.wine_tag_value
    );
    const productMatch = productTags.some(
      (t) => t.tag_type === rule.pairing_tag_type && t.tag_value === rule.pairing_tag_value
    );

    if (wineMatch && productMatch) {
      score += rule.weight;
    }
  }

  return score;
}

/**
 * Sort products by pairing score (descending)
 */
export function sortByScore<T extends ScoredProduct>(products: T[]): T[] {
  return [...products].sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Filter products with positive match score
 */
export function filterPositiveMatches<T extends ScoredProduct>(products: T[]): T[] {
  return products.filter((p) => p.matchScore > 0);
}

/**
 * Get top N pairings
 */
export function getTopPairings<T extends ScoredProduct>(products: T[], limit: number): T[] {
  return sortByScore(filterPositiveMatches(products)).slice(0, limit);
}
