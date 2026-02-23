import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';

/**
 * Hook for managing Machine Global delivery integration.
 * Handles config, creating deliveries, tracking, and cancellation.
 */
export function useMachineDelivery() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const companyId = company?.id;

  // ─── CONFIG ──────────────────────────────────────
  const configQuery = useQuery({
    queryKey: ['machine-config', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await (supabase as any)
        .from('machine_delivery_config')
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
        .from('machine_delivery_config')
        .upsert({ company_id: companyId, ...config }, { onConflict: 'company_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-config', companyId] });
    },
  });

  // ─── DELIVERIES ──────────────────────────────────
  const deliveriesQuery = useQuery({
    queryKey: ['machine-deliveries', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from('machine_delivery_orders')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  // ─── EVENTS LOG ──────────────────────────────────
  const getEvents = async (deliveryId: string) => {
    const { data, error } = await (supabase as any)
      .from('machine_delivery_events')
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
      const { data, error } = await supabase.functions.invoke('machine-delivery', {
        body: { action: 'test', company_id: companyId },
      });
      if (error) throw error;
      return data;
    },
  });

  const getCategories = useMutation({
    mutationFn: async (params?: { lat?: number; lng?: number }) => {
      const { data, error } = await supabase.functions.invoke('machine-delivery', {
        body: { action: 'get_categories', company_id: companyId, ...params },
      });
      if (error) throw error;
      return data;
    },
  });

  const estimateDelivery = useMutation({
    mutationFn: async (params: {
      pickup: { lat: number; lng: number; address?: string; neighborhood?: string; city?: string; state?: string };
      destination: { lat: number; lng: number; address?: string; neighborhood?: string; city?: string; state?: string };
      category_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('machine-delivery', {
        body: { action: 'estimate', company_id: companyId, ...params },
      });
      if (error) throw error;
      return data;
    },
  });

  const createDelivery = useMutation({
    mutationFn: async (params: {
      order_id?: string;
      customer_phone: string;
      customer_name: string;
      pickup: { lat: number; lng: number; address: string; neighborhood?: string; city?: string; state?: string };
      destination: { lat: number; lng: number; address: string; neighborhood?: string; city?: string; state?: string };
      payment_type?: string;
      category_id?: string;
      category_name?: string;
      info_before?: string;
      info_after?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('machine-delivery', {
        body: { action: 'create_delivery', company_id: companyId, ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-deliveries', companyId] });
    },
  });

  const refreshStatus = useMutation({
    mutationFn: async (params: { delivery_id: string; machine_request_id: string }) => {
      const { data, error } = await supabase.functions.invoke('machine-delivery', {
        body: { action: 'get_status', company_id: companyId, ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-deliveries', companyId] });
    },
  });

  const getDriverPosition = useMutation({
    mutationFn: async (params: { delivery_id: string; machine_request_id: string }) => {
      const { data, error } = await supabase.functions.invoke('machine-delivery', {
        body: { action: 'get_driver_position', company_id: companyId, ...params },
      });
      if (error) throw error;
      return data;
    },
  });

  const cancelDelivery = useMutation({
    mutationFn: async (params: { delivery_id: string; machine_request_id: string }) => {
      const { data, error } = await supabase.functions.invoke('machine-delivery', {
        body: { action: 'cancel', company_id: companyId, ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-deliveries', companyId] });
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
    getCategories,
    estimateDelivery,
    createDelivery,
    refreshStatus,
    getDriverPosition,
    cancelDelivery,
  };
}

// Status display helpers
export const MACHINE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  distributing: 'Distribuindo',
  accepted: 'Aceita',
  in_progress: 'Em Andamento',
  finished: 'Finalizada',
  cancelled: 'Cancelada',
  error: 'Erro',
};

export const MACHINE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  distributing: 'bg-blue-500/10 text-blue-500',
  accepted: 'bg-amber-500/10 text-amber-500',
  in_progress: 'bg-purple-500/10 text-purple-500',
  finished: 'bg-emerald-500/10 text-emerald-500',
  cancelled: 'bg-destructive/10 text-destructive',
  error: 'bg-destructive/10 text-destructive',
};
