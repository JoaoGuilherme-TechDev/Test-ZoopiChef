import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DeductionItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

interface DeductionResult {
  success: boolean;
  deductions: {
    erp_item_id: string;
    item_name: string;
    qty_deducted: number;
    new_stock: number;
  }[];
  errors: string[];
}

/**
 * Hook para baixa automática de estoque
 * - Baixa ocorre ao RECEBER A CONTA (status entregue/pago), não ao lançar
 * - Suporta produtos CMV (venda direta) e fichas técnicas (receitas)
 */
export function useERPStockDeduction() {
  const { data: company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Deduzir estoque para um pedido completo
  const deductOrderStock = useMutation({
    mutationFn: async (orderId: string): Promise<DeductionResult> => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const result: DeductionResult = { success: true, deductions: [], errors: [] };

      // Buscar itens do pedido
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('id, product_id, product_name, quantity')
        .eq('order_id', orderId);
      if (itemsError) throw itemsError;

      // Buscar mapeamentos produto -> item ERP
      const { data: mappings } = await (supabase as any)
        .from('erp_product_map')
        .select('product_id, erp_item_id')
        .eq('company_id', company.id);

      // Buscar receitas ativas
      const { data: recipes } = await (supabase as any)
        .from('erp_recipes')
        .select(`
          id,
          sale_item_id,
          yield_qty,
          lines:erp_recipe_lines(
            component_item_id,
            qty,
            waste_percent
          )
        `)
        .eq('company_id', company.id)
        .eq('active', true);

      // Buscar itens ERP para atualizar estoque
      const { data: erpItems } = await (supabase as any)
        .from('erp_items')
        .select('id, name, current_stock, avg_cost, track_stock')
        .eq('company_id', company.id)
        .eq('active', true);

      // Processar cada item do pedido
      for (const orderItem of orderItems || []) {
        const mapping = mappings?.find((m: any) => m.product_id === orderItem.product_id);
        if (!mapping) {
          result.errors.push(`Produto "${orderItem.product_name}" não mapeado no ERP`);
          continue;
        }

        const recipe = recipes?.find((r: any) => r.sale_item_id === mapping.erp_item_id);

        if (recipe && recipe.lines?.length > 0) {
          // Produto com ficha técnica - baixar insumos
          const unitsProduced = orderItem.quantity;
          const yieldQty = recipe.yield_qty || 1;
          const productionFactor = unitsProduced / yieldQty;

          for (const line of recipe.lines) {
            const component = erpItems?.find((i: any) => i.id === line.component_item_id);
            if (!component || !component.track_stock) continue;

            const wasteFactor = 1 + (line.waste_percent || 0) / 100;
            const qtyToDeduct = line.qty * productionFactor * wasteFactor;
            const newStock = Math.max(0, (component.current_stock || 0) - qtyToDeduct);

            // Atualizar estoque do componente
            await (supabase as any)
              .from('erp_items')
              .update({ current_stock: newStock })
              .eq('id', component.id);

            // Criar movimento de estoque
            await (supabase as any)
              .from('erp_stock_movements')
              .insert({
                company_id: company.id,
                erp_item_id: component.id,
                movement_type: 'sale_out',
                qty: qtyToDeduct,
                unit_cost_snapshot: component.avg_cost,
                balance_after: newStock,
                source_table: 'orders',
                source_id: orderId,
                reason: `Venda: ${orderItem.product_name}`,
                created_by: user?.id,
              });

            result.deductions.push({
              erp_item_id: component.id,
              item_name: component.name,
              qty_deducted: qtyToDeduct,
              new_stock: newStock,
            });
          }
        } else {
          // Produto CMV (venda direta) - baixar o próprio item
          const directItem = erpItems?.find((i: any) => i.id === mapping.erp_item_id);
          if (!directItem || !directItem.track_stock) {
            result.errors.push(`Item ERP para "${orderItem.product_name}" não rastreia estoque`);
            continue;
          }

          const qtyToDeduct = orderItem.quantity;
          const newStock = Math.max(0, (directItem.current_stock || 0) - qtyToDeduct);

          // Atualizar estoque
          await (supabase as any)
            .from('erp_items')
            .update({ current_stock: newStock })
            .eq('id', directItem.id);

          // Criar movimento
          await (supabase as any)
            .from('erp_stock_movements')
            .insert({
              company_id: company.id,
              erp_item_id: directItem.id,
              movement_type: 'sale_out',
              qty: qtyToDeduct,
              unit_cost_snapshot: directItem.avg_cost,
              balance_after: newStock,
              source_table: 'orders',
              source_id: orderId,
              reason: `Venda direta: ${orderItem.product_name}`,
              created_by: user?.id,
            });

          result.deductions.push({
            erp_item_id: directItem.id,
            item_name: directItem.name,
            qty_deducted: qtyToDeduct,
            new_stock: newStock,
          });
        }
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['erp-items'] });
      queryClient.invalidateQueries({ queryKey: ['erp-stock-movements'] });
      if (data.deductions.length > 0) {
        toast.success(`Estoque atualizado: ${data.deductions.length} itens baixados`);
      }
      if (data.errors.length > 0) {
        toast.warning(`Avisos: ${data.errors.join(', ')}`);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao baixar estoque: ' + error.message);
    },
  });

  // Reverter baixa de estoque (para cancelamentos)
  const revertItemStock = useMutation({
    mutationFn: async ({
      orderItemId,
      productId,
      productName,
      quantity,
      returnToStock,
    }: {
      orderItemId: string;
      productId: string;
      productName: string;
      quantity: number;
      returnToStock: boolean;
    }) => {
      if (!company?.id || !returnToStock) return { reverted: false };

      // Buscar mapeamento
      const { data: mapping } = await (supabase as any)
        .from('erp_product_map')
        .select('erp_item_id')
        .eq('company_id', company.id)
        .eq('product_id', productId)
        .single();

      if (!mapping) return { reverted: false, reason: 'Sem mapeamento ERP' };

      // Buscar receita
      const { data: recipe } = await (supabase as any)
        .from('erp_recipes')
        .select(`
          id,
          sale_item_id,
          yield_qty,
          lines:erp_recipe_lines(
            component_item_id,
            qty,
            waste_percent
          )
        `)
        .eq('company_id', company.id)
        .eq('sale_item_id', mapping.erp_item_id)
        .eq('active', true)
        .single();

      // Buscar itens ERP
      const { data: erpItems } = await (supabase as any)
        .from('erp_items')
        .select('id, name, current_stock, avg_cost, track_stock')
        .eq('company_id', company.id);

      const reverted: string[] = [];

      if (recipe && recipe.lines?.length > 0) {
        // Reverter insumos da ficha técnica
        const productionFactor = quantity / (recipe.yield_qty || 1);

        for (const line of recipe.lines) {
          const component = erpItems?.find((i: any) => i.id === line.component_item_id);
          if (!component || !component.track_stock) continue;

          const wasteFactor = 1 + (line.waste_percent || 0) / 100;
          const qtyToReturn = line.qty * productionFactor * wasteFactor;
          const newStock = (component.current_stock || 0) + qtyToReturn;

          await (supabase as any)
            .from('erp_items')
            .update({ current_stock: newStock })
            .eq('id', component.id);

          await (supabase as any)
            .from('erp_stock_movements')
            .insert({
              company_id: company.id,
              erp_item_id: component.id,
              movement_type: 'adjust_in',
              qty: qtyToReturn,
              unit_cost_snapshot: component.avg_cost,
              balance_after: newStock,
              reason: `Cancelamento: ${productName}`,
              created_by: user?.id,
            });

          reverted.push(component.name);
        }
      } else {
        // Reverter item direto
        const directItem = erpItems?.find((i: any) => i.id === mapping.erp_item_id);
        if (directItem && directItem.track_stock) {
          const newStock = (directItem.current_stock || 0) + quantity;

          await (supabase as any)
            .from('erp_items')
            .update({ current_stock: newStock })
            .eq('id', directItem.id);

          await (supabase as any)
            .from('erp_stock_movements')
            .insert({
              company_id: company.id,
              erp_item_id: directItem.id,
              movement_type: 'adjust_in',
              qty: quantity,
              unit_cost_snapshot: directItem.avg_cost,
              balance_after: newStock,
              reason: `Cancelamento: ${productName}`,
              created_by: user?.id,
            });

          reverted.push(directItem.name);
        }
      }

      return { reverted: true, items: reverted };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['erp-items'] });
      queryClient.invalidateQueries({ queryKey: ['erp-stock-movements'] });
      if (data.reverted && data.items?.length) {
        toast.success(`Estoque revertido: ${data.items.join(', ')}`);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao reverter estoque: ' + error.message);
    },
  });

  return {
    deductOrderStock,
    revertItemStock,
  };
}
