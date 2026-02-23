import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-shim';
import type { 
  CookingMethod, 
  MeatPreferences, 
  MeatOccasion, 
  MeatProduct,
  RotisseurCustomerInfo 
} from '../types';

export interface AIRecommendation {
  product_id: string;
  product_name: string;
  quantity_grams: number;
  expert_description: string;
  preparation_tip: string;
  ideal_doneness?: string;
  confidence_score: number;
  budget_fit?: string;
  pre_filter_score?: number;
  pre_filter_reason?: string;
  product: MeatProduct | null;
}

export interface MaitreResponse {
  greeting: string;
  analysis: string;
  recommendations: AIRecommendation[];
  total_quantity_grams: number;
  variety_note: string;
  serving_suggestion?: string;
  budget_summary?: string;
  closing_message: string;
  calculated_for_people: number;
  customer_history_used?: boolean;
}

export interface ComplementSuggestion {
  product_id: string;
  product_name: string;
  product_price: number;
  suggested_quantity: number;
  reason: string;
  confidence_score: number;
  product: MeatProduct;
}

export interface ComplementsResponse {
  suggestions: ComplementSuggestion[];
  message: string;
  total_suggested: number;
  based_on_meats: string[];
  occasion_context: string;
}

interface UseRotisseurAIParams {
  companyId: string;
  cookingMethod: CookingMethod;
  preferences: MeatPreferences | null;
  occasion: MeatOccasion;
  numberOfPeople: number;
  customer: RotisseurCustomerInfo | null;
  availableMeats: MeatProduct[];
}

interface UseComplementsAIParams {
  companyId: string;
  selectedMeats: { id: string; name: string; quantity_grams: number }[];
  availableComplements: MeatProduct[];
  numberOfPeople: number;
  occasion: MeatOccasion;
  cookingMethod: CookingMethod;
}

export function useRotisseurAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<MaitreResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Complements AI state
  const [isLoadingComplements, setIsLoadingComplements] = useState(false);
  const [complementsResponse, setComplementsResponse] = useState<ComplementsResponse | null>(null);
  const [complementsError, setComplementsError] = useState<string | null>(null);

  const getRecommendations = useCallback(async (params: UseRotisseurAIParams) => {
    const { companyId, cookingMethod, preferences, occasion, numberOfPeople, customer, availableMeats } = params;

    if (!companyId || !cookingMethod || !occasion || availableMeats.length === 0) {
      setError('Dados insuficientes para recomendação');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // ⚠️ CRITICAL SAFETY: Prepare ALL dietary restrictions including allergy notes
      const dietaryRestrictions = [
        ...(customer?.has_gluten_intolerance ? ['gluten', 'sem glúten'] : []),
        ...(customer?.has_lactose_intolerance ? ['lactose', 'sem lactose'] : []),
        ...(customer?.dietary_restrictions || []),
      ].filter(Boolean);

      const { data, error: fnError } = await supabase.functions.invoke('rotisseur-ai-recommend', {
        body: {
          companyId,
          userPreferences: {
            cooking_method: cookingMethod,
            preferences: {
              texture: preferences?.texture,
              flavor: preferences?.flavor,
              doneness: preferences?.doneness,
              budget: preferences?.budget,
            },
            occasion,
            number_of_people: numberOfPeople,
            customer_name: customer?.name,
            customer_id: customer?.id, // Pass customer ID for history lookup
            customer_history: {
              dietary_restrictions: dietaryRestrictions,
              // ⚠️ CRITICAL: Pass allergy_notes for pepper, peanut, etc
              allergy_notes: customer?.allergy_notes || null,
            },
          },
          availableMeats: availableMeats.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            price: m.price,
            tags: m.tags?.map(t => t.tag_value),
            subcategory_name: m.subcategory_name,
          })),
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro na consulta ao Maître');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResponse(data as MaitreResponse);
      return data as MaitreResponse;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao consultar o Maître';
      setError(message);
      console.error('[useRotisseurAI] Error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // New: Get complement suggestions based on selected meats
  const getComplementSuggestions = useCallback(async (params: UseComplementsAIParams) => {
    const { companyId, selectedMeats, availableComplements, numberOfPeople, occasion, cookingMethod } = params;

    if (!companyId || selectedMeats.length === 0 || availableComplements.length === 0) {
      return null;
    }

    setIsLoadingComplements(true);
    setComplementsError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('rotisseur-ai-complements', {
        body: {
          companyId,
          selectedMeats: selectedMeats.map(m => ({
            id: m.id,
            name: m.name,
            quantity_grams: m.quantity_grams,
          })),
          availableComplements: availableComplements.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            tags: p.tags?.map(t => t.tag_value),
          })),
          numberOfPeople,
          occasion,
          cookingMethod,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao buscar sugestões de complementos');
      }

      setComplementsResponse(data as ComplementsResponse);
      return data as ComplementsResponse;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar complementos';
      setComplementsError(message);
      console.error('[useRotisseurAI] Complements Error:', err);
      return null;
    } finally {
      setIsLoadingComplements(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResponse(null);
    setError(null);
    setComplementsResponse(null);
    setComplementsError(null);
  }, []);

  return {
    // Main recommendations
    isLoading,
    response,
    error,
    getRecommendations,
    // Complements
    isLoadingComplements,
    complementsResponse,
    complementsError,
    getComplementSuggestions,
    // Reset
    reset,
  };
}
