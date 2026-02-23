import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export type ItemStatus = 'pendente' | 'preparo' | 'pronto' | 'cancelado';

export interface ItemStatusUpdate {
  itemId: string;
  status: ItemStatus;
  orderId?: string; // Needed for event logging
}

export function useItemStatus() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Helper function to log item status events
  const logItemEvent = async (
    orderId: string, 
    orderItemId: string, 
    fromStatus: string | null, 
    toStatus: string,
    meta?: Record<string, any>
  ) => {
    if (!company?.id) return;

    try {
      await supabase
        .from('order_item_status_events')
        .insert({
          company_id: company.id,
          order_id: orderId,
          order_item_id: orderItemId,
          from_status: fromStatus,
          to_status: toStatus,
          meta: { 
            source: 'kds_item_button',
            ...meta 
          }
        });
    } catch (error) {
      console.error('Error logging item event:', error);
    }
  };

  // Update status of a single item
  const updateItemStatus = useMutation({
    mutationFn: async ({ itemId, status, orderId }: ItemStatusUpdate) => {
      const now = new Date().toISOString();
      
      // First, get current status for event logging
      const { data: currentItem } = await supabase
        .from('order_items')
        .select('item_status, order_id')
        .eq('id', itemId)
        .single();

      const fromStatus = currentItem?.item_status || 'pendente';
      const actualOrderId = orderId || currentItem?.order_id;

      const updateData: Record<string, any> = { item_status: status };
      
      // Set timestamps based on status transition
      if (status === 'preparo') {
        updateData.started_at = now;
      } else if (status === 'pronto') {
        updateData.finished_at = now;
      }

      const { error } = await supabase
        .from('order_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;

      // Log the event
      if (actualOrderId && company?.id) {
        await logItemEvent(actualOrderId, itemId, fromStatus, status);
      }

      return { itemId, fromStatus, toStatus: status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      console.error('Error updating item status:', error);
      toast.error('Erro ao atualizar status do item');
    },
  });

  // Update status of multiple items at once (partial preparation)
  const updateMultipleItemsStatus = useMutation({
    mutationFn: async ({ itemIds, status, orderId }: { itemIds: string[]; status: ItemStatus; orderId?: string }) => {
      const now = new Date().toISOString();
      
      // Get current statuses for event logging
      const { data: currentItems } = await supabase
        .from('order_items')
        .select('id, item_status, order_id')
        .in('id', itemIds);

      const updateData: Record<string, any> = { item_status: status };
      
      if (status === 'preparo') {
        updateData.started_at = now;
      } else if (status === 'pronto') {
        updateData.finished_at = now;
      }

      const { error } = await supabase
        .from('order_items')
        .update(updateData)
        .in('id', itemIds);

      if (error) throw error;

      // Log events for each item
      if (company?.id && currentItems) {
        for (const item of currentItems) {
          await logItemEvent(
            orderId || item.order_id, 
            item.id, 
            item.item_status || 'pendente', 
            status
          );
        }
      }
      
      return { count: itemIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`${data.count} item(s) atualizado(s)`);
    },
    onError: (error) => {
      console.error('Error updating items:', error);
      toast.error('Erro ao atualizar itens');
    },
  });

  // Start preparation for all items in an order
  const startAllItemsPreparation = useMutation({
    mutationFn: async (orderId: string) => {
      const now = new Date().toISOString();
      
      // Get all pending items
      const { data: pendingItems } = await supabase
        .from('order_items')
        .select('id, item_status')
        .eq('order_id', orderId)
        .eq('item_status', 'pendente');

      const { error } = await supabase
        .from('order_items')
        .update({ 
          item_status: 'preparo',
          started_at: now
        })
        .eq('order_id', orderId)
        .eq('item_status', 'pendente');

      if (error) throw error;

      // Log events for each item
      if (company?.id && pendingItems) {
        for (const item of pendingItems) {
          await logItemEvent(orderId, item.id, 'pendente', 'preparo', {
            batch: true,
            source: 'kds_order_button'
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // Mark all items as ready
  const markAllItemsReady = useMutation({
    mutationFn: async (orderId: string) => {
      const now = new Date().toISOString();
      
      // Get all non-ready items
      const { data: nonReadyItems } = await supabase
        .from('order_items')
        .select('id, item_status')
        .eq('order_id', orderId)
        .in('item_status', ['pendente', 'preparo']);

      const { error } = await supabase
        .from('order_items')
        .update({ 
          item_status: 'pronto',
          finished_at: now
        })
        .eq('order_id', orderId)
        .in('item_status', ['pendente', 'preparo']);

      if (error) throw error;

      // Log events for each item
      if (company?.id && nonReadyItems) {
        for (const item of nonReadyItems) {
          await logItemEvent(orderId, item.id, item.item_status || 'pendente', 'pronto', {
            batch: true,
            source: 'kds_order_button'
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return {
    updateItemStatus,
    updateMultipleItemsStatus,
    startAllItemsPreparation,
    markAllItemsReady,
  };
}
