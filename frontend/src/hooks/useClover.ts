import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface CloverConfig {
  company_id: string;
  is_enabled: boolean;
  environment: 'sandbox' | 'production';
  merchant_id: string | null;
  api_access_token: string | null;
  app_id: string | null;
  app_secret: string | null;
  public_token: string | null;
  private_token: string | null;
  auto_refresh_token: boolean;
  webhook_secret: string | null;
  account_name: string | null;
  account_email: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloverTransaction {
  id: string;
  company_id: string;
  order_id: string | null;
  clover_order_id: string | null;
  clover_charge_id: string | null;
  clover_payment_id: string | null;
  reference_id: string | null;
  amount_cents: number;
  tip_amount_cents: number | null;
  tax_amount_cents: number | null;
  currency: string;
  status: string;
  payment_method: string | null;
  card_brand: string | null;
  card_last4: string | null;
  card_first6: string | null;
  authorization_code: string | null;
  ref_num: string | null;
  captured: boolean | null;
  amount_refunded_cents: number | null;
  refunded_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  external_reference_id: string | null;
  terminal_id: string | null;
  device_id: string | null;
  error_message: string | null;
  error_code: string | null;
  decline_code: string | null;
  metadata: any;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloverEvent {
  id: string;
  company_id: string;
  transaction_id: string | null;
  event_type: string;
  clover_notification_id: string | null;
  status_from: string | null;
  status_to: string | null;
  payload: any;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export function useClover() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const companyId = company?.id;

  // ─── CONFIG ──────────────────────────────────────
  const configQuery = useQuery({
    queryKey: ['clover-config', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await (supabase as any)
        .from('clover_config')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data as CloverConfig | null;
    },
    enabled: !!companyId,
  });

  const saveConfig = useMutation({
    mutationFn: async (config: Partial<CloverConfig>) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      const { data, error } = await (supabase as any)
        .from('clover_config')
        .upsert({ company_id: companyId, ...config }, { onConflict: 'company_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clover-config', companyId] });
      toast.success('Configurações Clover salvas!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar config: ' + error.message);
    },
  });

  // ─── TRANSACTIONS ───────────────────────────────
  const transactionsQuery = useQuery({
    queryKey: ['clover-transactions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from('clover_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as CloverTransaction[];
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  // ─── EVENTS LOG ─────────────────────────────────
  const eventsQuery = useQuery({
    queryKey: ['clover-events', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from('clover_events')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as CloverEvent[];
    },
    enabled: !!companyId,
  });

  const getEvents = async (transactionId: string) => {
    const { data, error } = await (supabase as any)
      .from('clover_events')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []) as CloverEvent[];
  };

  // ─── API ACTIONS ────────────────────────────────
  const testConnection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('clover-api', {
        body: { action: 'test', company_id: companyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        toast.success(`Conexão Clover OK! ${data.merchant_name ? `(${data.merchant_name})` : ''}`);
      } else {
        toast.error('Falha na conexão: ' + (data?.error || 'Erro desconhecido'));
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao testar conexão: ' + error.message);
    },
  });

  const createCharge = useMutation({
    mutationFn: async (params: {
      amount_cents: number;
      source: string;
      currency?: string;
      capture?: boolean;
      description?: string;
      receipt_email?: string;
      tip_amount?: number;
      tax_amount?: number;
      external_reference_id?: string;
      ecomind?: 'ecom' | 'moto';
      metadata?: Record<string, any>;
      order_id?: string;
      customer?: { name?: string; email?: string };
    }) => {
      const { data, error } = await supabase.functions.invoke('clover-api', {
        body: { action: 'create_charge', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clover-transactions', companyId] });
      toast.success('Cobrança Clover criada!');
    },
    onError: (error: Error) => {
      toast.error('Erro na cobrança: ' + error.message);
    },
  });

  const captureCharge = useMutation({
    mutationFn: async (params: { transaction_id: string; amount_cents?: number }) => {
      const { data, error } = await supabase.functions.invoke('clover-api', {
        body: { action: 'capture', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clover-transactions', companyId] });
      toast.success('Captura realizada!');
    },
    onError: (error: Error) => {
      toast.error('Erro na captura: ' + error.message);
    },
  });

  const refundTransaction = useMutation({
    mutationFn: async (params: { transaction_id: string; amount_cents?: number; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke('clover-api', {
        body: { action: 'refund', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clover-transactions', companyId] });
      toast.success('Estorno processado!');
    },
    onError: (error: Error) => {
      toast.error('Erro no estorno: ' + error.message);
    },
  });

  const refreshStatus = useMutation({
    mutationFn: async (transactionId: string) => {
      const { data, error } = await supabase.functions.invoke('clover-api', {
        body: { action: 'get_status', company_id: companyId, transaction_id: transactionId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clover-transactions', companyId] });
    },
  });

  const createOrder = useMutation({
    mutationFn: async (params: {
      items?: { name: string; price_cents: number; quantity?: number }[];
      title?: string;
      note?: string;
      order_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('clover-api', {
        body: { action: 'create_order', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clover-transactions', companyId] });
      toast.success('Pedido Clover criado!');
    },
    onError: (error: Error) => {
      toast.error('Erro no pedido: ' + error.message);
    },
  });

  const payOrder = useMutation({
    mutationFn: async (params: { transaction_id: string; source: string; tip_amount?: number }) => {
      const { data, error } = await supabase.functions.invoke('clover-api', {
        body: { action: 'pay_order', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clover-transactions', companyId] });
      toast.success('Pagamento processado!');
    },
    onError: (error: Error) => {
      toast.error('Erro no pagamento: ' + error.message);
    },
  });

  return {
    config: configQuery.data,
    isConfigLoading: configQuery.isLoading,
    saveConfig,

    transactions: transactionsQuery.data || [],
    isTransactionsLoading: transactionsQuery.isLoading,
    events: eventsQuery.data || [],
    isEventsLoading: eventsQuery.isLoading,
    getEvents,

    testConnection,
    createCharge,
    captureCharge,
    refundTransaction,
    refreshStatus,
    createOrder,
    payOrder,
  };
}

// ─── STATUS DISPLAY HELPERS ────────────────────
export const CLOVER_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Criado',
  AUTHORIZED: 'Autorizado',
  CAPTURED: 'Capturado',
  PAID: 'Pago',
  FAILED: 'Falhou',
  CANCELED: 'Cancelado',
  REFUNDED: 'Estornado',
  PARTIALLY_REFUNDED: 'Estorno Parcial',
  PENDING: 'Pendente',
  ERROR: 'Erro',
};

export const CLOVER_STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-muted text-muted-foreground',
  AUTHORIZED: 'bg-blue-500/10 text-blue-500',
  CAPTURED: 'bg-blue-500/10 text-blue-500',
  PAID: 'bg-emerald-500/10 text-emerald-500',
  FAILED: 'bg-destructive/10 text-destructive',
  CANCELED: 'bg-destructive/10 text-destructive',
  REFUNDED: 'bg-purple-500/10 text-purple-500',
  PARTIALLY_REFUNDED: 'bg-purple-500/10 text-purple-500',
  PENDING: 'bg-amber-500/10 text-amber-500',
  ERROR: 'bg-destructive/10 text-destructive',
};
