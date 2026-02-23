import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { useCompany } from './useCompany';

export type OrderStatus = 'novo' | 'preparo' | 'pronto' | 'em_rota' | 'entregue';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  selected_options_json?: unknown;
  // Sommelier fields
  sommelier_suggested?: boolean;
  sommelier_wine_id?: string | null;
  sommelier_tip?: string | null;
  // Item status for KDS
  item_status?: 'pendente' | 'preparando' | 'preparo' | 'pronto' | 'cancelado';
  started_at?: string | null;
  finished_at?: string | null;
  edit_status?: 'new' | 'modified' | 'removed' | null;
  previous_quantity?: number | null;
  previous_notes?: string | null;
}

export interface Order {
  id: string;
  company_id: string;
  customer_id: string | null;
  deliverer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  address_notes: string | null;
  delivery_address_id: string | null;
  status: OrderStatus;
  order_type: string;
  receipt_type: string | null;
  payment_method: string | null;
  change_for: number | null;
  delivery_fee: number | null;
  delivery_distance_km: number | null;
  table_number: string | null;
  total: number;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  fulfillment_type: 'delivery' | 'pickup' | 'dine_in' | 'table';
  delivery_fee_cents: number;
  delivery_mode: 'neighborhood' | 'radius' | 'manual' | null;
  delivery_rule_id: string | null;
  delivery_rule_snapshot: Record<string, unknown> | null;
  destination_cep: string | null;
  destination_address: Record<string, unknown> | null;
  eta_minutes: number | null;
  accepted_at: string | null;
  ready_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  order_number: number | null;
  settled_at: string | null;
  settlement_id: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  cash_session_id: string | null;
  items?: OrderItem[];
  customer?: {
    id: string;
    name: string;
    whatsapp: string;
    alerts: string | null;
  } | null;
  deliverer?: {
    id: string;
    name: string;
    whatsapp: string | null;
  } | null;
}

// Configuração de cache otimizada por tipo de dados
const CACHE_CONFIG = {
  orders: {
    staleTime: 1000 * 30, // 30 segundos - dados que mudam frequentemente
    gcTime: 1000 * 60 * 5, // 5 minutos
  },
  static: {
    staleTime: 1000 * 60 * 10, // 10 minutos - dados que raramente mudam
    gcTime: 1000 * 60 * 30, // 30 minutos
  },
};

export const mapOrderItemToFrontend = (item: any): OrderItem => {
  return {
    ...item,
    order_id: item.orderId,
    product_id: item.productId,
    product_name: item.productName,
    unit_price: Number(item.unitPrice),
    selected_options_json: item.selectedOptionsJson,
    sommelier_suggested: item.sommelierSuggested,
    sommelier_wine_id: item.sommelierWineId,
    sommelier_tip: item.sommelierTip,
    item_status: item.itemStatus,
    started_at: item.startedAt,
    finished_at: item.finishedAt,
    edit_status: item.editStatus,
    previous_quantity: item.previousQuantity,
    previous_notes: item.previousNotes,
  };
};

export const mapOrderToFrontend = (order: any): Order => {
  return {
    ...order,
    company_id: order.companyId,
    customer_id: order.customerId,
    deliverer_id: order.delivererId,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    customer_address: order.customerAddress,
    address_notes: order.addressNotes,
    delivery_address_id: order.deliveryAddressId,
    order_type: order.orderType,
    receipt_type: order.receiptType,
    payment_method: order.paymentMethod,
    change_for: order.changeFor ? Number(order.changeFor) : null,
    delivery_fee: order.deliveryFee ? Number(order.deliveryFee) : null,
    delivery_distance_km: order.deliveryDistanceKm ? Number(order.deliveryDistanceKm) : null,
    table_number: order.tableNumber,
    total: Number(order.total),
    fulfillment_type: order.fulfillmentType,
    delivery_fee_cents: order.deliveryFeeCents,
    delivery_mode: order.deliveryMode,
    delivery_rule_id: order.deliveryRuleId,
    delivery_rule_snapshot: order.deliveryRuleSnapshot,
    destination_cep: order.destinationCep,
    destination_address: order.destinationAddress,
    eta_minutes: order.etaMinutes,
    accepted_at: order.acceptedAt,
    ready_at: order.readyAt,
    dispatched_at: order.dispatchedAt,
    delivered_at: order.deliveredAt,
    order_number: order.orderNumber,
    settled_at: order.settledAt,
    settlement_id: order.settlementId,
    cancelled_at: order.cancelledAt,
    cancelled_by: order.cancelledBy,
    cancel_reason: order.cancelReason,
    cash_session_id: order.cashSessionId,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    items: order.items?.map(mapOrderItemToFrontend),
    customer: order.customer ? {
      id: order.customer.id,
      name: order.customer.name,
      whatsapp: order.customer.whatsapp,
      alerts: order.customer.alerts,
    } : null,
    deliverer: order.deliverer ? {
      id: order.deliverer.id,
      name: order.deliverer.name,
      whatsapp: order.deliverer.whatsapp,
    } : null,
  };
};

/**
 * Hook otimizado para buscar pedidos do dia atual
 * MELHORIA: Limita a busca apenas ao dia atual e caixa aberto
 */
export function useOrders() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['orders', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const url = `/orders?companyId=${company.id}`;
      const { data } = await api.get(url);
      return data.map(mapOrderToFrontend);
    },
    enabled: !!company?.id,
    staleTime: CACHE_CONFIG.orders.staleTime,
    gcTime: CACHE_CONFIG.orders.gcTime,
    refetchOnWindowFocus: false,
    refetchInterval: 10000, // Polling every 10s
  });

  // Mutations otimizadas com optimistic updates
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      await api.put(`/orders/${orderId}`, { status });
    },
    onMutate: async ({ orderId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['orders', company?.id] });

      // Snapshot do valor anterior
      const previousOrders = queryClient.getQueryData(['orders', company?.id]);

      // Optimistic update
      queryClient.setQueryData(['orders', company?.id], (old: Order[] | undefined) =>
        old?.map(order =>
          order.id === orderId ? { ...order, status } : order
        )
      );

      return { previousOrders };
    },
    onError: (error: Error, _vars, context) => {
      // Rollback em caso de erro
      if (context?.previousOrders) {
        queryClient.setQueryData(['orders', company?.id], context.previousOrders);
      }
      toast.error('Erro ao atualizar status: ' + error.message);
    },
    onSettled: () => {
      // Revalidar após sucesso ou erro
      queryClient.invalidateQueries({ queryKey: ['orders', company?.id] });
    },
  });

  const assignDeliverer = useMutation({
    mutationFn: async ({ orderId, delivererId }: { orderId: string; delivererId: string | null }) => {
      await api.put(`/orders/${orderId}`, { delivererId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', company?.id] });
      queryClient.invalidateQueries({ queryKey: ['delivererSettlements'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atribuir entregador: ' + error.message);
    },
  });

  const updatePaymentMethod = useMutation({
    mutationFn: async ({ orderId, paymentMethod }: { orderId: string; paymentMethod: string }) => {
      await api.put(`/orders/${orderId}`, { paymentMethod });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', company?.id] });
      queryClient.invalidateQueries({ queryKey: ['delivererSettlements'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar pagamento: ' + error.message);
    },
  });

  const createOrder = useMutation({
    mutationFn: async (orderData: {
      company_id: string;
      order_type: string;
      status: OrderStatus;
      total: number;
      customer_name?: string;
      customer_phone?: string;
      customer_address?: string;
      notes?: string;
      payment_method?: string;
      items: Array<{
        product_id: string;
        product_name: string;
        quantity: number;
        unit_price: number;
        notes?: string;
        selected_options_json?: any;
        sommelier_suggested?: boolean;
        sommelier_wine_id?: string;
        sommelier_tip?: string;
      }>;
    }) => {
      const { items, ...order } = orderData;
      
      const payload = {
        companyId: order.company_id,
        orderType: order.order_type,
        status: order.status,
        total: order.total,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerAddress: order.customer_address,
        notes: order.notes,
        paymentMethod: order.payment_method,
        items: items.map(item => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          notes: item.notes,
          selectedOptionsJson: item.selected_options_json,
          sommelierSuggested: item.sommelier_suggested,
          sommelierWineId: item.sommelier_wine_id,
          sommelierTip: item.sommelier_tip,
        })),
      };

      const { data } = await api.post('/orders', payload);
      return mapOrderToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', company?.id] });
      toast.success('Pedido criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar pedido: ' + error.message);
    },
  });

  // Memoized orders by status for quick access
  const ordersByStatus = useMemo(() => ({
    novo: orders.filter(o => o.status === 'novo'),
    preparo: orders.filter(o => o.status === 'preparo'),
    pronto: orders.filter(o => o.status === 'pronto'),
    em_rota: orders.filter(o => o.status === 'em_rota'),
    entregue: orders.filter(o => o.status === 'entregue'),
  }), [orders]);

  return {
    orders,
    ordersByStatus,
    isLoading,
    error,
    refetch,
    updateOrderStatus,
    assignDeliverer,
    updatePaymentMethod,
    createOrder,
  };
}

export function useCreateOrder() {
  return useOrders().createOrder;
}

/**
 * Hook para buscar um pedido específico (com cache otimizado)
 */
export function useOrder(orderId: string | undefined) {
  const { data: company } = useCompany();
  
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data } = await api.get(`/orders/${orderId}`);
      return mapOrderToFrontend(data);
    },
    enabled: !!orderId && !!company?.id,
    staleTime: CACHE_CONFIG.orders.staleTime,
  });
}
