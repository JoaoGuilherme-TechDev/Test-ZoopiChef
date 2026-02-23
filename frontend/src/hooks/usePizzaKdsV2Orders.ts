import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useEffect } from 'react';
import { PizzaKdsV2Stage, PizzaKdsV2Urgency, getNextStage } from '@/lib/pizzaKdsV2Stages';

/**
 * Pizza KDS V2 Orders Hook
 * 
 * Completely independent from the original KDS.
 * Manages order items with realtime updates and atomic stage transitions.
 */

export interface PizzaKdsV2OrderItem {
  id: string;
  order_id: string;
  order_item_id: string | null;
  company_id: string;
  current_stage: PizzaKdsV2Stage;
  urgency: PizzaKdsV2Urgency;
  started_at: string | null;
  owned_at: string | null;
  completed_at: string | null;
  owned_by_operator_id: string | null;
  pizza_size: string | null;
  pizza_dough: string | null;
  pizza_border: string | null;
  pizza_flavors: string[];
  customer_name: string | null;
  order_number: string | null;
  table_number: string | null;
  comanda_number: string | null;
  delivery_type: string | null;
  created_at: string;
  updated_at: string;
}

interface UsePizzaKdsV2OrdersOptions {
  companyId: string | null;
  filterStage?: PizzaKdsV2Stage | null;
}

export function usePizzaKdsV2Orders({ companyId, filterStage }: UsePizzaKdsV2OrdersOptions) {
  const queryClient = useQueryClient();

  // Fetch orders query
  const query = useQuery({
    queryKey: ['pizza-kds-v2-orders', companyId, filterStage],
    queryFn: async () => {
      if (!companyId) return [];

      let queryBuilder = supabase
        .from('pizza_kds_v2_order_items')
        .select('*')
        .eq('company_id', companyId)
        .neq('current_stage', 'done')
        .order('created_at', { ascending: true });

      if (filterStage) {
        queryBuilder = queryBuilder.eq('current_stage', filterStage);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Error fetching pizza kds v2 orders:', error);
        throw error;
      }

      return (data || []) as unknown as PizzaKdsV2OrderItem[];
    },
    enabled: !!companyId,
    refetchInterval: 10000, // Fallback polling
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`pizza-kds-v2-orders-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pizza_kds_v2_order_items',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          // Invalidate and refetch on any change
          queryClient.invalidateQueries({ queryKey: ['pizza-kds-v2-orders', companyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  // Start working on an order (locks it to operator)
  const startOrder = useMutation({
    mutationFn: async ({ itemId, operatorId }: { itemId: string; operatorId: string }) => {
      const { error } = await supabase
        .from('pizza_kds_v2_order_items')
        .update({
          owned_by_operator_id: operatorId,
          started_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .is('owned_by_operator_id', null); // Only if not already owned

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizza-kds-v2-orders', companyId] });
    },
  });

  // Complete current stage and move to next
  const completeStage = useMutation({
    mutationFn: async ({ itemId, operatorId }: { itemId: string; operatorId: string }) => {
      // Get current item
      const { data: item, error: fetchError } = await supabase
        .from('pizza_kds_v2_order_items')
        .select('current_stage')
        .eq('id', itemId)
        .single();

      if (fetchError || !item) throw new Error('Item não encontrado');

      const nextStage = getNextStage(item.current_stage as PizzaKdsV2Stage);
      if (!nextStage) throw new Error('Já está na última etapa');

      // Atomic update: move to next stage, release ownership
      const { error: updateError } = await supabase
        .from('pizza_kds_v2_order_items')
        .update({
          current_stage: nextStage,
          owned_by_operator_id: null,
          started_at: null,
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Record history
      await supabase.from('pizza_kds_v2_stage_history').insert({
        order_item_id: itemId,
        from_stage: item.current_stage,
        to_stage: nextStage,
        operator_id: operatorId,
        action: 'complete',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizza-kds-v2-orders', companyId] });
    },
  });

  // Change urgency level (admin function)
  const changeUrgency = useMutation({
    mutationFn: async ({ itemId, urgency }: { itemId: string; urgency: PizzaKdsV2Urgency }) => {
      const { error } = await supabase
        .from('pizza_kds_v2_order_items')
        .update({ urgency })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizza-kds-v2-orders', companyId] });
    },
  });

  // Skip to a specific stage (admin function)
  const skipToStage = useMutation({
    mutationFn: async ({ 
      itemId, 
      targetStage, 
      operatorId 
    }: { 
      itemId: string; 
      targetStage: PizzaKdsV2Stage; 
      operatorId: string 
    }) => {
      // Get current stage
      const { data: item, error: fetchError } = await supabase
        .from('pizza_kds_v2_order_items')
        .select('current_stage')
        .eq('id', itemId)
        .single();

      if (fetchError || !item) throw new Error('Item não encontrado');

      const { error: updateError } = await supabase
        .from('pizza_kds_v2_order_items')
        .update({
          current_stage: targetStage,
          owned_by_operator_id: null,
          started_at: null,
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Record history with skip action
      await supabase.from('pizza_kds_v2_stage_history').insert({
        order_item_id: itemId,
        from_stage: item.current_stage,
        to_stage: targetStage,
        operator_id: operatorId,
        action: 'skip',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizza-kds-v2-orders', companyId] });
    },
  });

  // Release ownership without completing (cancel work)
  const releaseOwnership = useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      const { error } = await supabase
        .from('pizza_kds_v2_order_items')
        .update({
          owned_by_operator_id: null,
          started_at: null,
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizza-kds-v2-orders', companyId] });
    },
  });

  return {
    orders: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    startOrder,
    completeStage,
    changeUrgency,
    skipToStage,
    releaseOwnership,
  };
}
