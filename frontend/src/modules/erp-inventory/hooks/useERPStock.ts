import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ERPStockMovement, ERPStockAdjustFormData, ERPMovementType } from '../types';

export function useERPStock() {
  const { data: company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const movementsQuery = useQuery({
    queryKey: ['erp-stock-movements', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('erp_stock_movements')
        .select(`
          *,
          erp_item:erp_items(id, name, sku),
          unit:erp_units(*)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as ERPStockMovement[];
    },
    enabled: !!company?.id,
  });

  const adjustStock = useMutation({
    mutationFn: async (data: ERPStockAdjustFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Get current item data
      const { data: erpItem, error: itemError } = await (supabase as any)
        .from('erp_items')
        .select('*')
        .eq('id', data.erp_item_id)
        .single();
      if (itemError) throw itemError;

      const currentStock = erpItem.current_stock || 0;
      let newStock: number;
      const movementType = data.adjustment_type as ERPMovementType;

      if (movementType === 'adjust_in') {
        newStock = currentStock + data.qty;
      } else {
        // adjust_out or waste_out
        newStock = currentStock - data.qty;
        if (newStock < 0) {
          throw new Error('Estoque não pode ficar negativo');
        }
      }

      // Update item stock
      const { error: updateError } = await (supabase as any)
        .from('erp_items')
        .update({ current_stock: newStock })
        .eq('id', data.erp_item_id);
      if (updateError) throw updateError;

      // Create stock movement
      const { error: movementError } = await (supabase as any)
        .from('erp_stock_movements')
        .insert({
          company_id: company.id,
          erp_item_id: data.erp_item_id,
          movement_type: movementType,
          qty: data.qty,
          unit_cost_snapshot: erpItem.avg_cost,
          balance_after: newStock,
          reason: data.reason,
          created_by: user?.id,
        });
      if (movementError) throw movementError;

      return { newStock };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-items'] });
      queryClient.invalidateQueries({ queryKey: ['erp-stock-movements'] });
      toast.success('Estoque ajustado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao ajustar estoque: ' + error.message);
    },
  });

  return {
    movements: movementsQuery.data || [],
    isLoading: movementsQuery.isLoading,
    adjustStock,
  };
}
