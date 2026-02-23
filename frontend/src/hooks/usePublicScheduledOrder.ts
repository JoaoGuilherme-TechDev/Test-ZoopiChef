/**
 * usePublicScheduledOrder
 * 
 * Hook for creating scheduled orders from the public delivery interface.
 * This is a simplified version of useScheduledOrders that works without auth.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { CartItem } from '@/contexts/CartContext';

export interface CreatePublicScheduledOrderParams {
  companyId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  scheduledDate: Date;
  scheduledTime: string;
  orderType: 'delivery' | 'pickup' | 'table';
  deliveryAddress?: {
    address: string;
    neighborhood?: string;
    city?: string;
    cep?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
  };
  items: CartItem[];
  subtotalCents: number;
  deliveryFeeCents?: number;
  discountCents?: number;
  totalCents: number;
  notes?: string;
  paymentMethod?: string;
}

export function usePublicScheduledOrder() {
  const queryClient = useQueryClient();

  const createScheduledOrder = useMutation({
    mutationFn: async (params: CreatePublicScheduledOrderParams) => {
      // Convert cart items to scheduled order items format
      const orderItems = params.items.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price_cents: Math.round(item.price * 100),
        notes: item.notes || null,
        optionals: item.selectedOptions || null,
      }));

      const { data, error } = await supabase
        .from('scheduled_orders')
        .insert({
          company_id: params.companyId,
          customer_name: params.customerName,
          customer_phone: params.customerPhone,
          customer_email: params.customerEmail || null,
          scheduled_date: format(params.scheduledDate, 'yyyy-MM-dd'),
          scheduled_time: params.scheduledTime,
          order_type: params.orderType,
          delivery_address: params.deliveryAddress || null,
          items: orderItems as unknown as any,
          subtotal_cents: params.subtotalCents,
          delivery_fee_cents: params.deliveryFeeCents || 0,
          discount_cents: params.discountCents || 0,
          total_cents: params.totalCents,
          notes: params.notes || null,
          status: 'pending', // Scheduled orders start as pending
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
      toast.success('Pedido agendado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating scheduled order:', error);
      toast.error('Erro ao agendar pedido. Tente novamente.');
    },
  });

  return {
    createScheduledOrder,
  };
}
