import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { usePrintSectors } from './usePrintSectors';
import { useEffect, useMemo } from 'react';
import { OrderItem, OrderStatus } from './useOrders';
import { toast } from 'sonner';

export type EditStatus = 'new' | 'modified' | 'removed' | null;

export type ItemStatus = 'pendente' | 'preparo' | 'pronto' | 'cancelado';

export interface KDSOrderItem extends OrderItem {
  sector_id?: string;
  sector_name?: string;
  sector_color?: string;
  edit_status?: EditStatus;
  previous_quantity?: number | null;
  previous_notes?: string | null;
  item_status?: ItemStatus;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface KDSOrder {
  id: string;
  company_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  status: OrderStatus;
  order_type: string;
  payment_method: string | null;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: KDSOrderItem[];
  customer?: {
    id: string;
    name: string;
    whatsapp: string;
  } | null;
  age_minutes: number;
  is_overdue: boolean;
  edit_version?: number;
  last_edit_at?: string | null;
  is_edited?: boolean;
  order_number?: number | null;
  // Stage timestamps for timers
  accepted_at?: string | null;
  ready_at?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
}

export interface KDSFilters {
  sectorId: string | null;
  status: OrderStatus | 'all';
}

export function useKDS(filters: KDSFilters) {
  const { data: company } = useCompany();
  const { activeSectors } = usePrintSectors();
  const queryClient = useQueryClient();

  // Fetch orders with items and sector mappings
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['kds-orders', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      // Only get orders that are not completed (novo, preparo, pronto)
      let query = supabase
        .from('orders')
        .select('*, customer:customers(id, name, whatsapp)')
        .eq('company_id', company.id)
        .in('status', ['novo', 'preparo', 'pronto'])
        .order('created_at', { ascending: true });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data: ordersData, error: ordersError } = await query;
      if (ordersError) throw ordersError;

      // Get all order items
      const orderIds = ordersData.map(o => o.id);
      if (orderIds.length === 0) return [];

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Get product-sector mappings
      const productIds = [...new Set(itemsData.map(i => i.product_id))];
      const { data: sectorMappings, error: sectorError } = await supabase
        .from('product_print_sectors')
        .select('*, sector:print_sectors(id, name, color)')
        .in('product_id', productIds);

      if (sectorError) throw sectorError;

      // Build mapping of product_id -> sector info
      const productSectorMap = new Map<string, { id: string; name: string; color: string }>();
      sectorMappings?.forEach((m: any) => {
        if (m.sector) {
          productSectorMap.set(m.product_id, {
            id: m.sector.id,
            name: m.sector.name,
            color: m.sector.color,
          });
        }
      });

      const now = new Date();

      // Build KDS orders
      const kdsOrders: KDSOrder[] = ordersData.map(order => {
        const orderItems = itemsData
          .filter(item => item.order_id === order.id)
          .map(item => {
            const sectorInfo = productSectorMap.get(item.product_id);
            return {
              ...item,
              sector_id: sectorInfo?.id,
              sector_name: sectorInfo?.name,
              sector_color: sectorInfo?.color,
              edit_status: item.edit_status as KDSOrderItem['edit_status'],
              previous_quantity: item.previous_quantity,
              previous_notes: item.previous_notes,
              item_status: (item as any).item_status || 'pendente',
              started_at: (item as any).started_at,
              finished_at: (item as any).finished_at,
            };
          });

        // Filter by sector if specified (but keep removed items for display)
        const filteredItems = filters.sectorId
          ? orderItems.filter(item => item.sector_id === filters.sectorId || item.edit_status === 'removed')
          : orderItems;

        // Calculate age
        const createdAt = new Date(order.created_at);
        const ageMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));

        // Check if overdue based on sector SLA
        const sectorSLA = filters.sectorId 
          ? activeSectors.find(s => s.id === filters.sectorId)?.sla_minutes || 15
          : 15;

        // Check if order has been edited
        const hasEditedItems = orderItems.some(item => item.edit_status);
        const isEdited = order.edit_version > 0 || hasEditedItems;

        return {
          ...order,
          items: filteredItems,
          age_minutes: ageMinutes,
          is_overdue: ageMinutes > sectorSLA,
          edit_version: order.edit_version,
          last_edit_at: order.last_edit_at,
          is_edited: isEdited,
          // Include timestamps for stage timers
          accepted_at: order.accepted_at,
          ready_at: order.ready_at,
          dispatched_at: order.dispatched_at,
          delivered_at: order.delivered_at,
        };
      });

      // Filter out orders with no active items for the selected sector
      // But keep orders that have at least one non-removed item
      return kdsOrders.filter(order => order.items.some(item => item.edit_status !== 'removed'));
    },
    enabled: !!company?.id,
    staleTime: 1000 * 20,
    refetchInterval: 1000 * 60, // OTIMIZAÇÃO: 60 segundos (era 30s) - realtime cuida de updates
    refetchOnWindowFocus: false,
  });

  // Update order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ 
      orderId, 
      status,
      orderNumber,
      customerName,
      delivererId,
    }: { 
      orderId: string; 
      status: OrderStatus;
      orderNumber?: number;
      customerName?: string | null;
      delivererId?: string | null;
    }) => {
      // Build update object
      const updateData: { status: OrderStatus; deliverer_id?: string | null } = { status };
      
      // If dispatching (em_rota), also assign deliverer
      if (status === 'em_rota' && delivererId) {
        updateData.deliverer_id = delivererId;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Trigger order ready call for TV in two scenarios:
      // 1. Status is "pronto" - order is ready to be picked up
      // 2. Status is "em_rota" for non-delivery orders (balcão) - customer should be called
      const shouldTriggerTVCall = 
        (status === 'pronto' || status === 'em_rota') && 
        orderNumber && 
        company?.id;

      if (shouldTriggerTVCall) {
        try {
          // Check if feature is enabled
          const { data: companyData } = await supabase
            .from('companies')
            .select('enable_order_ready_call')
            .eq('id', company.id)
            .single();

          if (companyData?.enable_order_ready_call) {
            // Check if already called for this order to avoid duplicates
            const { data: existingCall } = await (supabase as any)
              .from('order_ready_calls')
              .select('id')
              .eq('order_id', orderId)
              .limit(1);

            if (!existingCall || existingCall.length === 0) {
              await (supabase as any)
                .from('order_ready_calls')
                .insert({
                  company_id: company.id,
                  order_id: orderId,
                  order_number: orderNumber,
                  customer_name: customerName || null,
                });
              console.log('[KDS] Order ready call triggered for TV:', orderNumber);
            }
          }
        } catch (err) {
          console.warn('Failed to trigger order ready call:', err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('kds-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Stats
  const stats = useMemo(() => {
    const novo = orders.filter(o => o.status === 'novo').length;
    const preparo = orders.filter(o => o.status === 'preparo').length;
    const pronto = orders.filter(o => o.status === 'pronto').length;
    const overdue = orders.filter(o => o.is_overdue).length;

    return { novo, preparo, pronto, overdue, total: orders.length };
  }, [orders]);

  return {
    orders,
    stats,
    isLoading,
    error,
    updateOrderStatus,
  };
}
