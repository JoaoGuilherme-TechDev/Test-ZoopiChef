import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { ERPPricing, ERPPricingAnalysis } from '../types';
import { useERPRecipes } from './useERPRecipes';
import { useERPProductMap } from './useERPProductMap';

export function useERPPricing() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const { recipes, calculateRecipeCost } = useERPRecipes();
  const { mappings } = useERPProductMap();

  const pricingQuery = useQuery({
    queryKey: ['erp-pricing', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('erp_pricing')
        .select(`
          *,
          sale_item:erp_items(id, name, sku, avg_cost)
        `)
        .eq('company_id', company.id);
      if (error) throw error;
      return data as ERPPricing[];
    },
    enabled: !!company?.id,
  });

  const updatePricing = useMutation({
    mutationFn: async (data: {
      sale_item_id: string;
      target_markup_percent?: number;
      target_margin_percent?: number;
    }) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Get current cost from recipe
      const recipe = recipes.find(r => r.sale_item_id === data.sale_item_id && r.active);
      let currentCost = 0;
      if (recipe) {
        const costData = calculateRecipeCost(recipe);
        currentCost = costData.total_cost;
      }

      // Calculate suggested prices
      let suggestedPrice: number | null = null;
      if (data.target_markup_percent != null && currentCost > 0) {
        suggestedPrice = currentCost * (1 + data.target_markup_percent / 100);
      } else if (data.target_margin_percent != null && data.target_margin_percent < 100) {
        suggestedPrice = currentCost / (1 - data.target_margin_percent / 100);
      }

      const { data: result, error } = await (supabase as any)
        .from('erp_pricing')
        .upsert({
          company_id: company.id,
          sale_item_id: data.sale_item_id,
          target_markup_percent: data.target_markup_percent ?? null,
          target_margin_percent: data.target_margin_percent ?? null,
          suggested_price: suggestedPrice,
          current_cost: currentCost,
          last_calculated_at: new Date().toISOString(),
        }, {
          onConflict: 'company_id,sale_item_id',
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-pricing'] });
      toast.success('Precificação atualizada');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar precificação: ' + error.message);
    },
  });

  // Recalculate all pricing (batch)
  const recalculateAllPricing = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const existingPricing = pricingQuery.data || [];
      let updated = 0;

      for (const pricing of existingPricing) {
        const recipe = recipes.find(r => r.sale_item_id === pricing.sale_item_id && r.active);
        let currentCost = 0;
        if (recipe) {
          const costData = calculateRecipeCost(recipe);
          currentCost = costData.total_cost;
        }

        let suggestedPrice: number | null = null;
        if (pricing.target_markup_percent != null && currentCost > 0) {
          suggestedPrice = currentCost * (1 + pricing.target_markup_percent / 100);
        } else if (pricing.target_margin_percent != null && pricing.target_margin_percent < 100) {
          suggestedPrice = currentCost / (1 - pricing.target_margin_percent / 100);
        }

        await (supabase as any)
          .from('erp_pricing')
          .update({
            suggested_price: suggestedPrice,
            current_cost: currentCost,
            last_calculated_at: new Date().toISOString(),
          })
          .eq('id', pricing.id);
        updated++;
      }

      return { updated };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['erp-pricing'] });
      toast.success(`${data.updated} preços recalculados`);
    },
    onError: (error: any) => {
      toast.error('Erro ao recalcular preços: ' + error.message);
    },
  });

  // Get pricing analysis for a sale item
  const getPricingAnalysis = (saleItemId: string): ERPPricingAnalysis | null => {
    const pricing = pricingQuery.data?.find(p => p.sale_item_id === saleItemId);
    const recipe = recipes.find(r => r.sale_item_id === saleItemId && r.active);
    
    // Get current price from product mapping
    const mapping = mappings.find(m => m.erp_item_id === saleItemId);
    const currentPrice = mapping?.product?.price || 0;

    let currentCost = 0;
    if (recipe) {
      const costData = calculateRecipeCost(recipe);
      currentCost = costData.total_cost;
    }

    const currentMarkup = currentCost > 0 ? ((currentPrice - currentCost) / currentCost) * 100 : 0;
    const currentMargin = currentPrice > 0 ? ((currentPrice - currentCost) / currentPrice) * 100 : 0;

    let suggestedPriceByMarkup: number | null = null;
    let suggestedPriceByMargin: number | null = null;

    if (pricing?.target_markup_percent != null && currentCost > 0) {
      suggestedPriceByMarkup = currentCost * (1 + pricing.target_markup_percent / 100);
    }
    if (pricing?.target_margin_percent != null && pricing.target_margin_percent < 100) {
      suggestedPriceByMargin = currentCost / (1 - pricing.target_margin_percent / 100);
    }

    const minMarginAlert = 10; // Alert if margin < 10%

    return {
      sale_item_id: saleItemId,
      sale_item_name: recipe?.sale_item?.name || pricing?.sale_item?.name || '',
      current_cost: currentCost,
      current_price: currentPrice,
      current_markup_percent: currentMarkup,
      current_margin_percent: currentMargin,
      target_markup_percent: pricing?.target_markup_percent ?? null,
      target_margin_percent: pricing?.target_margin_percent ?? null,
      suggested_price_by_markup: suggestedPriceByMarkup,
      suggested_price_by_margin: suggestedPriceByMargin,
      is_below_cost: currentPrice > 0 && currentPrice < currentCost,
      margin_alert: currentMargin < minMarginAlert && currentMargin >= 0,
    };
  };

  return {
    pricing: pricingQuery.data || [],
    isLoading: pricingQuery.isLoading,
    updatePricing,
    recalculateAllPricing,
    getPricingAnalysis,
  };
}
