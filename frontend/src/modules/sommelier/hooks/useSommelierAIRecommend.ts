import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { WineProfile, ConsumptionContext, WineProduct, ProductTag, SommelierCustomerInfo } from '../types';

export interface AIWineRecommendation {
  wine_id: string;
  score: number;
  reason: string;
  tip?: string;
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

export interface AIRecommendationResult {
  greeting: string;
  recommendations: AIWineRecommendation[];
  overall_tip?: string;
  quantity_suggestion?: string;
  total_wines: number;
  // Safety info
  allergenFiltered?: boolean;
  excludedCount?: number;
  dietaryRestrictionsApplied?: boolean;
}

// Extended WineProduct with AI fields
export interface AIEnrichedWineProduct extends WineProduct {
  aiScore?: number;
  aiReason?: string;
  aiTip?: string;
  grape?: string;
  country?: string;
  region?: string;
}

/**
 * Hook que chama a IA para recomendar vinhos baseado no perfil do usuário
 * CRITICAL: Now includes grape, country, region and dietary restrictions
 */
export function useSommelierAIRecommend(
  companyId: string | undefined,
  profile: WineProfile,
  context: ConsumptionContext | null,
  enabled: boolean = true,
  customer?: SommelierCustomerInfo | null
) {
  return useQuery({
    queryKey: ['sommelier_ai_recommend', companyId, profile, context, customer?.id],
    queryFn: async (): Promise<AIRecommendationResult | null> => {
      if (!companyId || !context) return null;

      // Build dietary restrictions from customer info
      const dietaryRestrictions = customer ? {
        has_gluten_intolerance: customer.has_gluten_intolerance || false,
        has_lactose_intolerance: customer.has_lactose_intolerance || false,
        dietary_restrictions: customer.dietary_restrictions || [],
        allergy_notes: customer.allergy_notes,
      } : undefined;

      console.log('[SommelierAI] Calling with dietary restrictions:', dietaryRestrictions);

      const { data, error } = await supabase.functions.invoke('sommelier-ai-recommend', {
        body: {
          companyId,
          profile: {
            intensity: profile.intensity,
            sweetness: profile.sweetness,
            occasion: profile.occasion,
            context,
          },
          dietaryRestrictions,
        }
      });

      if (error) {
        console.error('[SommelierAI] Error:', error);
        throw error;
      }

      if (!data?.success) {
        console.warn('[SommelierAI] No success:', data);
        return null;
      }

      // Log safety info
      if (data.allergenFiltered) {
        console.log(`[SommelierAI] ⚠️ SAFETY: ${data.excludedCount} wines excluded due to allergens`);
      }

      return {
        greeting: data.greeting || 'Olá! Veja minhas recomendações.',
        recommendations: data.recommendations || [],
        overall_tip: data.overall_tip,
        quantity_suggestion: data.quantity_suggestion,
        total_wines: data.total_wines || 0,
        allergenFiltered: data.allergenFiltered,
        excludedCount: data.excludedCount,
        dietaryRestrictionsApplied: data.dietaryRestrictionsApplied,
      };
    },
    enabled: !!companyId && !!context && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
  });
}

/**
 * Transforma recomendações da IA em WineProduct[] para uso nos componentes existentes
 * NOW INCLUDES: grape, country, region
 */
export function transformToWineProducts(recommendations: AIWineRecommendation[]): AIEnrichedWineProduct[] {
  return recommendations.map(rec => ({
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
    aiReason: rec.reason,
    aiTip: rec.tip,
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
