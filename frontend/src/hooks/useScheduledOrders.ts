import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';
import { format } from 'date-fns';

export type ScheduledOrderStatus = 'pending' | 'confirmed' | 'preparing' | 'completed' | 'cancelled';
export type ScheduledOrderType = 'delivery' | 'pickup' | 'table';

export interface ScheduledOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  notes?: string;
  optionals?: any[];
}

export interface ScheduledOrder {
  id: string;
  company_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  scheduled_date: string;
  scheduled_time: string;
  order_type: ScheduledOrderType;
  delivery_address: any | null;
  items: ScheduledOrderItem[];
  subtotal_cents: number;
  delivery_fee_cents: number;
  discount_cents: number;
  total_cents: number;
  notes: string | null;
  status: ScheduledOrderStatus;
  confirmed_at: string | null;
  converted_order_id: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledOrderParams {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  scheduledDate: string;
  scheduledTime: string;
  orderType: ScheduledOrderType;
  deliveryAddress?: any;
  items: ScheduledOrderItem[];
  subtotalCents: number;
  deliveryFeeCents?: number;
  discountCents?: number;
  totalCents: number;
  notes?: string;
}

export function useScheduledOrders(dateFilter?: Date) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['scheduled-orders', company?.id, dateFilter?.toISOString()],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('scheduled_orders')
        .select('*')
        .eq('company_id', company.id)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (dateFilter) {
        query = query.eq('scheduled_date', format(dateFilter, 'yyyy-MM-dd'));
      } else {
        // Default: show upcoming orders
        query = query.gte('scheduled_date', format(new Date(), 'yyyy-MM-dd'));
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      
      return (data || []).map(order => ({
        ...order,
        items: Array.isArray(order.items) ? order.items as unknown as ScheduledOrderItem[] : [],
      })) as ScheduledOrder[];
    },
    enabled: !!company?.id,
  });

  const createScheduledOrder = useMutation({
    mutationFn: async (params: CreateScheduledOrderParams) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase
        .from('scheduled_orders')
        .insert({
          company_id: company.id,
          customer_id: params.customerId,
          customer_name: params.customerName,
          customer_phone: params.customerPhone,
          customer_email: params.customerEmail,
          scheduled_date: params.scheduledDate,
          scheduled_time: params.scheduledTime,
          order_type: params.orderType,
          delivery_address: params.deliveryAddress,
          items: params.items as unknown as any,
          subtotal_cents: params.subtotalCents,
          delivery_fee_cents: params.deliveryFeeCents || 0,
          discount_cents: params.discountCents || 0,
          total_cents: params.totalCents,
          notes: params.notes,
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
      toast.error('Erro ao agendar pedido: ' + error.message);
    },
  });

  const confirmOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('scheduled_orders')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
      toast.success('Pedido confirmado!');
    },
    onError: (error) => {
      toast.error('Erro ao confirmar: ' + error.message);
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      const { error } = await supabase
        .from('scheduled_orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason,
        })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
      toast.success('Pedido cancelado!');
    },
    onError: (error) => {
      toast.error('Erro ao cancelar: ' + error.message);
    },
  });

  const convertToOrder = useMutation({
    mutationFn: async (scheduledOrder: ScheduledOrder) => {
      // This would create a real order from the scheduled order
      // For now, just mark as preparing
      const { error } = await supabase
        .from('scheduled_orders')
        .update({ status: 'preparing' })
        .eq('id', scheduledOrder.id);

      if (error) throw error;
      return scheduledOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
      toast.success('Pedido iniciado!');
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const completeOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('scheduled_orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
      toast.success('Pedido finalizado!');
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Statistics
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const confirmedOrders = orders.filter((o) => o.status === 'confirmed');
  const todayOrders = orders.filter(
    (o) => o.scheduled_date === format(new Date(), 'yyyy-MM-dd')
  );

  return {
    orders,
    isLoading,
    createScheduledOrder,
    confirmOrder,
    cancelOrder,
    convertToOrder,
    completeOrder,
    stats: {
      total: orders.length,
      pending: pendingOrders.length,
      confirmed: confirmedOrders.length,
      today: todayOrders.length,
    },
  };
}
