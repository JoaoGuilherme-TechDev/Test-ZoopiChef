import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface AiqfomeConfig {
  company_id: string;
  is_enabled: boolean;
  environment: 'sandbox' | 'production';
  client_id: string | null;
  client_secret: string | null;
  redirect_uri: string | null;
  store_id: string | null;
  store_name: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  token_scopes: string | null;
  webhook_url: string | null;
  webhook_secret: string | null;
  polling_enabled: boolean;
  polling_interval_seconds: number;
  last_polled_at: string | null;
  auto_confirm_orders: boolean;
  auto_dispatch_orders: boolean;
  default_preparation_time_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface AiqfomeOrder {
  id: string;
  company_id: string;
  aiqfome_order_id: string;
  aiqfome_store_id: string | null;
  aiqfome_display_id: string | null;
  internal_order_id: string | null;
  status: string;
  order_type: string | null;
  total_cents: number;
  subtotal_cents: number;
  delivery_fee_cents: number;
  discount_cents: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_document: string | null;
  delivery_address: string | null;
  delivery_neighborhood: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_postal_code: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_complement: string | null;
  delivery_reference: string | null;
  payment_method: string | null;
  payment_change_for: number | null;
  payment_prepaid: boolean;
  scheduled_for: string | null;
  preparation_time_minutes: number | null;
  items_json: any;
  raw_payload: any;
  placed_at: string | null;
  confirmed_at: string | null;
  ready_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiqfomeEvent {
  id: string;
  company_id: string;
  order_id: string | null;
  event_type: string;
  aiqfome_event_id: string | null;
  status_from: string | null;
  status_to: string | null;
  payload: any;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export function useAiqfome() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const companyId = company?.id;

  // ─── CONFIG ──────────────────────────────────────
  const configQuery = useQuery({
    queryKey: ['aiqfome-config', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await (supabase as any)
        .from('aiqfome_config')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data as AiqfomeConfig | null;
    },
    enabled: !!companyId,
  });

  const saveConfig = useMutation({
    mutationFn: async (config: Partial<AiqfomeConfig>) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      const { data, error } = await (supabase as any)
        .from('aiqfome_config')
        .upsert({ company_id: companyId, ...config }, { onConflict: 'company_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiqfome-config', companyId] });
      toast.success('Configurações AiqFome salvas!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar config: ' + error.message);
    },
  });

  // ─── ORDERS ─────────────────────────────────────
  const ordersQuery = useQuery({
    queryKey: ['aiqfome-orders', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from('aiqfome_orders')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as AiqfomeOrder[];
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  // ─── EVENTS LOG ─────────────────────────────────
  const eventsQuery = useQuery({
    queryKey: ['aiqfome-events', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from('aiqfome_events')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as AiqfomeEvent[];
    },
    enabled: !!companyId,
  });

  const getOrderEvents = async (orderId: string) => {
    const { data, error } = await (supabase as any)
      .from('aiqfome_events')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []) as AiqfomeEvent[];
  };

  // ─── API ACTIONS ────────────────────────────────
  const testConnection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('aiqfome-api', {
        body: { action: 'test', company_id: companyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        toast.success(`Conexão AiqFome OK! ${data.store_name ? `(${data.store_name})` : ''}`);
      } else {
        toast.error('Falha na conexão: ' + (data?.error || 'Erro desconhecido'));
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao testar conexão: ' + error.message);
    },
  });

  const exchangeCode = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.functions.invoke('aiqfome-api', {
        body: { action: 'exchange_code', company_id: companyId, code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiqfome-config', companyId] });
      toast.success('Token obtido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao trocar código: ' + error.message);
    },
  });

  const refreshToken = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('aiqfome-api', {
        body: { action: 'refresh_token', company_id: companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiqfome-config', companyId] });
      toast.success('Token renovado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao renovar token: ' + error.message);
    },
  });

  const pollEvents = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('aiqfome-api', {
        body: { action: 'poll_events', company_id: companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['aiqfome-orders', companyId] });
      queryClient.invalidateQueries({ queryKey: ['aiqfome-events', companyId] });
      const count = data?.count || 0;
      if (count > 0) {
        toast.success(`${count} evento(s) processado(s)!`);
      } else {
        toast.info('Sem novos eventos');
      }
    },
    onError: (error: Error) => {
      toast.error('Erro no polling: ' + error.message);
    },
  });

  const confirmOrder = useMutation({
    mutationFn: async (params: { order_id: string; preparation_time?: number }) => {
      const { data, error } = await supabase.functions.invoke('aiqfome-api', {
        body: { action: 'confirm_order', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiqfome-orders', companyId] });
      toast.success('Pedido confirmado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao confirmar: ' + error.message);
    },
  });

  const readyOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke('aiqfome-api', {
        body: { action: 'ready_order', company_id: companyId, order_id: orderId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiqfome-orders', companyId] });
      toast.success('Pedido marcado como pronto!');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const dispatchOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke('aiqfome-api', {
        body: { action: 'dispatch_order', company_id: companyId, order_id: orderId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiqfome-orders', companyId] });
      toast.success('Pedido despachado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao despachar: ' + error.message);
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async (params: { order_id: string; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke('aiqfome-api', {
        body: { action: 'cancel_order', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiqfome-orders', companyId] });
      toast.success('Pedido cancelado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cancelar: ' + error.message);
    },
  });

  const storeStandby = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data, error } = await supabase.functions.invoke('aiqfome-api', {
        body: { action: 'store_standby', company_id: companyId, enabled },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(data?.standBy ? 'Loja em stand-by' : 'Loja ativa');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    config: configQuery.data,
    isConfigLoading: configQuery.isLoading,
    saveConfig,

    orders: ordersQuery.data || [],
    isOrdersLoading: ordersQuery.isLoading,
    events: eventsQuery.data || [],
    isEventsLoading: eventsQuery.isLoading,
    getOrderEvents,

    testConnection,
    exchangeCode,
    refreshToken,
    pollEvents,
    confirmOrder,
    readyOrder,
    dispatchOrder,
    cancelOrder,
    storeStandby,
  };
}

// ─── STATUS DISPLAY HELPERS ────────────────────
export const AIQFOME_STATUS_LABELS: Record<string, string> = {
  PLACED: 'Recebido',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Preparando',
  READY: 'Pronto',
  DISPATCHED: 'Despachado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  CANCELLATION_REQUESTED: 'Cancelamento Solicitado',
};

export const AIQFOME_STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-amber-500/10 text-amber-500',
  CONFIRMED: 'bg-blue-500/10 text-blue-500',
  PREPARING: 'bg-orange-500/10 text-orange-500',
  READY: 'bg-cyan-500/10 text-cyan-500',
  DISPATCHED: 'bg-purple-500/10 text-purple-500',
  DELIVERED: 'bg-emerald-500/10 text-emerald-500',
  CANCELLED: 'bg-destructive/10 text-destructive',
  CANCELLATION_REQUESTED: 'bg-destructive/10 text-destructive',
};
