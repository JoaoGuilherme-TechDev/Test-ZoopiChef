import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { FoodSelection, ProductTag, SommelierCustomerInfo } from '../types';

export interface FoodWinePairing {
  wine_id: string;
  score: number;
  pairing_reason: string;
  reason?: string; // Alias for pairing_reason for compatibility
  serving_tip?: string;
  grape?: string;
  country?: string;
  region?: string;
  wine: {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string | null;
    tags: { tag_type: string; tag_value: string }[];
  };
}

export interface FoodPairingResult {
  greeting: string;
  food_analysis: string;
  recommendations: FoodWinePairing[];
  pairing_tip?: string;
  overall_tip?: string; // Alias for compatibility
  quantity_suggestion?: string;
  total_wines: number;
  food_category: string;
  food_details?: string;
  // Safety info
  allergenFiltered?: boolean;
  excludedCount?: number;
  dietaryRestrictionsApplied?: boolean;
}

/**
 * Hook que chama a IA para recomendar vinhos baseado no alimento escolhido
 * CRITICAL: Now includes grape, country, region and dietary restrictions
 */
export function useSommelierFoodPairing(
  companyId: string | undefined,
  food: FoodSelection | null,
  context: 'local' | 'takeaway' | null,
  enabled: boolean = true,
  customer?: SommelierCustomerInfo | null
) {
  return useQuery({
    queryKey: ['sommelier_food_pairing', companyId, food, context, customer?.id],
    queryFn: async (): Promise<FoodPairingResult | null> => {
      if (!companyId || !food || !context) return null;

      // Build dietary restrictions from customer info
      const dietaryRestrictions = customer ? {
        has_gluten_intolerance: customer.has_gluten_intolerance || false,
        has_lactose_intolerance: customer.has_lactose_intolerance || false,
        dietary_restrictions: customer.dietary_restrictions || [],
        allergy_notes: customer.allergy_notes,
      } : undefined;

      console.log('[SommelierFoodPairing] Calling with dietary restrictions:', dietaryRestrictions);

      const { data, error } = await supabase.functions.invoke('sommelier-food-pairing', {
        body: {
          companyId,
          food,
          context,
          dietaryRestrictions,
        }
      });

      if (error) {
        console.error('[SommelierFoodPairing] Error:', error);
        throw error;
      }

      if (!data?.success) {
        console.warn('[SommelierFoodPairing] No success:', data);
        return null;
      }

      // Log safety info
      if (data.allergenFiltered) {
        console.log(`[SommelierFoodPairing] ⚠️ SAFETY: ${data.excludedCount} wines excluded due to allergens`);
      }

      return {
        greeting: data.greeting || 'Olá! Veja minhas sugestões de harmonização.',
        food_analysis: data.food_analysis || '',
        recommendations: data.recommendations || [],
        pairing_tip: data.pairing_tip,
        quantity_suggestion: data.quantity_suggestion,
        total_wines: data.total_wines || 0,
        food_category: data.food_category,
        food_details: data.food_details,
        allergenFiltered: data.allergenFiltered,
        excludedCount: data.excludedCount,
        dietaryRestrictionsApplied: data.dietaryRestrictionsApplied,
      };
    },
    enabled: !!companyId && !!food && !!context && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
  });
}

// Extended type for AI enriched wine
export interface AIEnrichedFoodWine {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  tags: ProductTag[];
  sensoryProfile?: string;
  badge?: string;
  aiScore?: number;
  aiReason?: string;
  aiTip?: string;
  grape?: string;
  country?: string;
  region?: string;
}

/**
 * Transforma FoodWinePairing[] em formato compatível com WineProduct[]
 * NOW INCLUDES: grape, country, region
 */
export function transformFoodPairingToWines(pairings: FoodWinePairing[]): AIEnrichedFoodWine[] {
  return pairings.map(rec => ({
    id: rec.wine.id,
    name: rec.wine.name,
    description: rec.wine.description || null,
    price: rec.wine.price,
    image_url: rec.wine.image_url || null,
    tags: rec.wine.tags as ProductTag[],
    sensoryProfile: buildSensoryProfile(rec.wine.tags),
    badge: getBadge(rec.wine.tags),
    // AI enriched fields
    aiScore: rec.score,
    aiReason: rec.pairing_reason,
    aiTip: rec.serving_tip,
    grape: rec.grape,
    country: rec.country,
    region: rec.region,
  }));
}

function buildSensoryProfile(tags: { tag_type: string; tag_value: string }[]): string {
  const parts: string[] = [];
  const tipo = tags.find((t) => t.tag_type === 'tipo');
  if (tipo) parts.push(tipo.tag_value.charAt(0).toUpperCase() + tipo.tag_value.slice(1));
  const corpo = tags.find((t) => t.tag_type === 'corpo');
  if (corpo) parts.push(corpo.tag_value);
  return parts.join(' • ');
}

function getBadge(tags: { tag_type: string; tag_value: string }[]): string | undefined {
  const highlight = tags.find((t) => t.tag_type === 'destaque');
  if (highlight) {
    switch (highlight.tag_value) {
      case 'sommelier_pick': return 'Escolha do Sommelier';
      case 'best_seller': return 'Mais Vendido';
      default: return undefined;
    }
  }
  return undefined;
}
