import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import type { DeliveryStatus } from '@/lib/delivery/types';

/**
 * Hook for managing OpenDelivery integration.
 * Handles config, creating deliveries, tracking, polling and cancellation.
 */
export function useOpenDelivery() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const companyId = company?.id;

  // ─── CONFIG ──────────────────────────────────────
  const configQuery = useQuery({
    queryKey: ['opendelivery-config', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await (supabase as any)
        .from('opendelivery_config')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const saveConfig = useMutation({
    mutationFn: async (config: Record<string, any>) => {
      if (!companyId) throw new Error('Company not found');
      const { data, error } = await (supabase as any)
        .from('opendelivery_config')
        .upsert(
          { company_id: companyId, provider_name: 'opendelivery', ...config },
          { onConflict: 'company_id,provider_name' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opendelivery-config', companyId] });
    },
  });

  // ─── DELIVERIES ──────────────────────────────────
  const deliveriesQuery = useQuery({
    queryKey: ['opendelivery-deliveries', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from('opendelivery_orders')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  // ─── EVENTS LOG ──────────────────────────────────
  const getEvents = async (deliveryId: string) => {
    const { data, error } = await (supabase as any)
      .from('opendelivery_events')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  };

  // ─── API ACTIONS ─────────────────────────────────
  const testConnection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('opendelivery', {
        body: { action: 'test', company_id: companyId },
      });
      if (error) throw error;
      return data;
    },
  });

  const estimateDelivery = useMutation({
    mutationFn: async (params: {
      pickup: { lat: number; lng: number; address?: string; city?: string; state?: string; neighborhood?: string; postalCode?: string };
      destination: { lat: number; lng: number; address?: string; city?: string; state?: string; neighborhood?: string; postalCode?: string };
      items?: Array<{ name: string; quantity: number; unitPrice?: number }>;
    }) => {
      const { data, error } = await supabase.functions.invoke('opendelivery', {
        body: { action: 'estimate', company_id: companyId, ...params },
      });
      if (error) throw error;
      return data;
    },
  });

  const createDelivery = useMutation({
    mutationFn: async (params: {
      order_id?: string;
      customer_name?: string;
      customer_phone?: string;
      pickup: { lat: number; lng: number; address: string; city?: string; state?: string; neighborhood?: string; postalCode?: string };
      destination: { lat: number; lng: number; address: string; city?: string; state?: string; neighborhood?: string; postalCode?: string; complement?: string; reference?: string };
      items?: Array<{ name: string; quantity: number; unitPrice?: number; externalCode?: string }>;
      instructions?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('opendelivery', {
        body: { action: 'create_delivery', company_id: companyId, ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opendelivery-deliveries', companyId] });
    },
  });

  const getDeliveryDetails = useMutation({
    mutationFn: async (params: { delivery_id: string; od_order_id: string }) => {
      const { data, error } = await supabase.functions.invoke('opendelivery', {
        body: { action: 'get_details', company_id: companyId, ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opendelivery-deliveries', companyId] });
    },
  });

  const pollEvents = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('opendelivery', {
        body: { action: 'poll_events', company_id: companyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opendelivery-deliveries', companyId] });
    },
  });

  const readyForPickup = useMutation({
    mutationFn: async (params: { delivery_id: string; od_order_id: string }) => {
      const { data, error } = await supabase.functions.invoke('opendelivery', {
        body: { action: 'ready_for_pickup', company_id: companyId, ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opendelivery-deliveries', companyId] });
    },
  });

  const finishDelivery = useMutation({
    mutationFn: async (params: { delivery_id: string; od_order_id: string }) => {
      const { data, error } = await supabase.functions.invoke('opendelivery', {
        body: { action: 'finish_delivery', company_id: companyId, ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opendelivery-deliveries', companyId] });
    },
  });

  const cancelDelivery = useMutation({
    mutationFn: async (params: { delivery_id: string; od_order_id: string; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke('opendelivery', {
        body: { action: 'cancel', company_id: companyId, ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opendelivery-deliveries', companyId] });
    },
  });

  const handleProblem = useMutation({
    mutationFn: async (params: { delivery_id: string; od_order_id: string; problem?: any }) => {
      const { data, error } = await supabase.functions.invoke('opendelivery', {
        body: { action: 'handle_problem', company_id: companyId, ...params },
      });
      if (error) throw error;
      return data;
    },
  });

  return {
    // Config
    config: configQuery.data,
    isConfigLoading: configQuery.isLoading,
    saveConfig,

    // Deliveries
    deliveries: deliveriesQuery.data || [],
    isDeliveriesLoading: deliveriesQuery.isLoading,
    getEvents,

    // Actions
    testConnection,
    estimateDelivery,
    createDelivery,
    getDeliveryDetails,
    pollEvents,
    readyForPickup,
    finishDelivery,
    cancelDelivery,
    handleProblem,
  };
}

// Status display helpers (OpenDelivery-specific)
export const OD_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  accepted: 'Aceita',
  preparing: 'Preparando',
  ready_for_pickup: 'Pronto p/ Coleta',
  picked_up: 'Coletado',
  in_progress: 'Em Rota',
  finished: 'Entregue',
  cancelled: 'Cancelada',
  error: 'Erro',
};

export const OD_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  accepted: 'bg-amber-500/10 text-amber-500',
  preparing: 'bg-orange-500/10 text-orange-500',
  ready_for_pickup: 'bg-cyan-500/10 text-cyan-500',
  picked_up: 'bg-indigo-500/10 text-indigo-500',
  in_progress: 'bg-purple-500/10 text-purple-500',
  finished: 'bg-emerald-500/10 text-emerald-500',
  cancelled: 'bg-destructive/10 text-destructive',
  error: 'bg-destructive/10 text-destructive',
};

export const OD_EVENT_TYPE_LABELS: Record<string, string> = {
  CREATED: 'Criado',
  CONFIRMED: 'Confirmado',
  PREPARATION_REQUESTED: 'Preparo Solicitado',
  PREPARING: 'Preparando',
  READY_FOR_PICKUP: 'Pronto p/ Coleta',
  PICKUP_AREA_ASSIGNED: 'Área de Coleta Definida',
  PICKED_UP: 'Coletado',
  DISPATCHED: 'Despachado',
  DELIVERED: 'Entregue',
  CONCLUDED: 'Concluído',
  CANCELLED: 'Cancelado',
  CANCELLATION_REQUESTED: 'Cancelamento Solicitado',
  CANCELLATION_REQUEST_DENIED: 'Cancel. Negado',
  ORDER_CANCELLATION_REQUEST: 'Solic. Cancelamento',
  CANCELLED_DENIED: 'Cancel. Negado',
};
