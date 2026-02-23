import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { ERPRecipe, ERPRecipeFormData, ERPRecipeCost } from '../types';

export function useERPRecipes() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const recipesQuery = useQuery({
    queryKey: ['erp-recipes', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('erp_recipes')
        .select(`
          *,
          sale_item:erp_items!sale_item_id(id, name, sku, item_type),
          lines:erp_recipe_lines(
            *,
            component_item:erp_items!component_item_id(id, name, sku, avg_cost, base_unit_id),
            unit:erp_units(*)
          )
        `)
        .eq('company_id', company.id)
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ERPRecipe[];
    },
    enabled: !!company?.id,
  });

  const createRecipe = useMutation({
    mutationFn: async (data: ERPRecipeFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Deactivate existing active recipe for this item
      await (supabase as any)
        .from('erp_recipes')
        .update({ active: false })
        .eq('company_id', company.id)
        .eq('sale_item_id', data.sale_item_id)
        .eq('active', true);

      // Get next version
      const { data: existing } = await (supabase as any)
        .from('erp_recipes')
        .select('version')
        .eq('company_id', company.id)
        .eq('sale_item_id', data.sale_item_id)
        .order('version', { ascending: false })
        .limit(1);
      const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1;

      // Create recipe
      const { data: recipe, error: recipeError } = await (supabase as any)
        .from('erp_recipes')
        .insert({
          company_id: company.id,
          sale_item_id: data.sale_item_id,
          version: nextVersion,
          active: true,
          yield_qty: data.yield_qty || 1,
          notes: data.notes || null,
        })
        .select()
        .single();
      if (recipeError) throw recipeError;

      // Create lines
      if (data.lines.length > 0) {
        const linesToInsert = data.lines.map(line => ({
          company_id: company.id,
          recipe_id: recipe.id,
          component_item_id: line.component_item_id,
          qty: line.qty,
          unit_id: line.unit_id || null,
          waste_percent: line.waste_percent || 0,
        }));
        const { error: linesError } = await (supabase as any)
          .from('erp_recipe_lines')
          .insert(linesToInsert);
        if (linesError) throw linesError;
      }

      return recipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-recipes'] });
      toast.success('Ficha técnica criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar ficha técnica: ' + error.message);
    },
  });

  const deactivateRecipe = useMutation({
    mutationFn: async (recipeId: string) => {
      const { error } = await (supabase as any)
        .from('erp_recipes')
        .update({ active: false })
        .eq('id', recipeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-recipes'] });
      toast.success('Ficha técnica desativada');
    },
    onError: (error: any) => {
      toast.error('Erro ao desativar ficha técnica: ' + error.message);
    },
  });

  // Calculate cost for a recipe
  const calculateRecipeCost = (recipe: ERPRecipe): ERPRecipeCost => {
    const lines = recipe.lines || [];
    let totalCost = 0;
    const costLines = lines.map(line => {
      const componentCost = line.component_item?.avg_cost || 0;
      const wasteFactor = 1 + (line.waste_percent || 0) / 100;
      const lineCost = line.qty * componentCost * wasteFactor;
      totalCost += lineCost;
      return {
        component_item_id: line.component_item_id,
        component_name: line.component_item?.name || '',
        qty: line.qty,
        waste_percent: line.waste_percent || 0,
        unit_cost: componentCost,
        line_cost: lineCost,
      };
    });

    // Divide by yield if > 1
    const yieldQty = recipe.yield_qty || 1;
    const costPerUnit = totalCost / yieldQty;

    return {
      recipe_id: recipe.id,
      sale_item_id: recipe.sale_item_id,
      sale_item_name: recipe.sale_item?.name || '',
      total_cost: costPerUnit,
      lines: costLines,
    };
  };

  // Get recipe for a sale item
  const getRecipeForItem = (saleItemId: string): ERPRecipe | undefined => {
    return recipesQuery.data?.find(r => r.sale_item_id === saleItemId && r.active);
  };

  return {
    recipes: recipesQuery.data || [],
    isLoading: recipesQuery.isLoading,
    createRecipe,
    deactivateRecipe,
    calculateRecipeCost,
    getRecipeForItem,
  };
}
