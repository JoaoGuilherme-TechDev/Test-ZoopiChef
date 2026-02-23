/**
 * useOrderTracker - Hook para acompanhamento de pedido em tempo real
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-shim';

export interface TrackedOrder {
  id: string;
  order_number: number | null;
  customer_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  order_type: string | null;
  total: number | null;
  ready_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  company_id: string;
}

interface UseOrderTrackerResult {
  order: TrackedOrder | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOrderTracker(orderId: string | undefined): UseOrderTrackerResult {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    if (!orderId) {
      setError('ID do pedido não informado');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          status,
          created_at,
          updated_at,
          order_type,
          total,
          ready_at,
          dispatched_at,
          delivered_at,
          company_id
        `)
        .eq('id', orderId)
        .single();

      if (fetchError || !data) {
        setError('Pedido não encontrado');
        setOrder(null);
      } else {
        setOrder(data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Erro ao carregar pedido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    if (!orderId) return;

    // Realtime subscription
    const channel = supabase
      .channel(`order-tracker-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return {
    order,
    isLoading,
    error,
    refetch: fetchOrder,
  };
}

// Status helpers
export const ORDER_STATUS_LABELS: Record<string, string> = {
  novo: 'Recebido',
  preparo: 'Em Preparo',
  pronto: 'Pronto!',
  em_rota: 'Em Rota',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  novo: 'amber',
  preparo: 'orange',
  pronto: 'green',
  em_rota: 'blue',
  entregue: 'emerald',
  cancelado: 'red',
};

export function getStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] || status;
}

export function isOrderReady(status: string): boolean {
  return status === 'pronto';
}

export function isOrderCompleted(status: string): boolean {
  return status === 'entregue' || status === 'cancelado';
}
