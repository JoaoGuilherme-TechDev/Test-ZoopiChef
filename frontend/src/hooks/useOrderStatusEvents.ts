import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { OrderStatus } from './useOrders';

interface StatusEventMeta {
  source?: 'kanban' | 'manual' | 'kds' | 'system';
  deliverer_id?: string;
  [key: string]: unknown;
}

export function useOrderStatusEvents() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const recordStatusChange = useMutation({
    mutationFn: async ({
      orderId,
      fromStatus,
      toStatus,
      meta,
      orderNumber,
      customerName,
    }: {
      orderId: string;
      fromStatus: OrderStatus | null;
      toStatus: OrderStatus;
      meta?: StatusEventMeta;
      orderNumber?: number;
      customerName?: string | null;
    }) => {
      if (!company?.id) throw new Error('No company');

      // Insert the status event
      const { error: eventError } = await (supabase as any)
        .from('order_status_events')
        .insert({
          company_id: company.id,
          order_id: orderId,
          from_status: fromStatus,
          to_status: toStatus,
          meta,
        });

      if (eventError) throw eventError;

      // Update order timestamps based on new status
      const now = new Date().toISOString();

      // Each status transition updates a specific timestamp field
      // Only update if the field is currently null to preserve original values
      if (toStatus === 'preparo') {
        const { error } = await supabase
          .from('orders')
          .update({ accepted_at: now })
          .eq('id', orderId)
          .is('accepted_at', null);
        if (error) console.warn('Failed to update accepted_at:', error);
      } else if (toStatus === 'pronto') {
        const { error } = await supabase
          .from('orders')
          .update({ ready_at: now })
          .eq('id', orderId)
          .is('ready_at', null);
        if (error) console.warn('Failed to update ready_at:', error);

        // Trigger order ready call for TV - fetch order data if not provided
        try {
          // Check if feature is enabled
          const { data: companyData } = await supabase
            .from('companies')
            .select('enable_order_ready_call')
            .eq('id', company.id)
            .single();

          if (companyData?.enable_order_ready_call) {
            // If orderNumber not provided, fetch from the order
            let finalOrderNumber = orderNumber;
            let finalCustomerName = customerName;
            
            if (finalOrderNumber === undefined) {
              const { data: orderData } = await supabase
                .from('orders')
                .select('order_number, customer_name')
                .eq('id', orderId)
                .single();
              
              if (orderData) {
                finalOrderNumber = orderData.order_number;
                finalCustomerName = orderData.customer_name;
              }
            }

            if (finalOrderNumber) {
              await (supabase as any)
                .from('order_ready_calls')
                .insert({
                  company_id: company.id,
                  order_id: orderId,
                  order_number: finalOrderNumber,
                  customer_name: finalCustomerName || null,
                });
            }
          }
        } catch (err) {
          console.warn('Failed to trigger order ready call:', err);
        }
      } else if (toStatus === 'em_rota') {
        const { error } = await supabase
          .from('orders')
          .update({ dispatched_at: now })
          .eq('id', orderId)
          .is('dispatched_at', null);
        if (error) console.warn('Failed to update dispatched_at:', error);
      } else if (toStatus === 'entregue') {
        const { error } = await supabase
          .from('orders')
          .update({ delivered_at: now })
          .eq('id', orderId)
          .is('delivered_at', null);
        if (error) console.warn('Failed to update delivered_at:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return { recordStatusChange };
}
