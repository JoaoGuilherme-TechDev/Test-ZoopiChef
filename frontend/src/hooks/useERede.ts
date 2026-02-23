import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────

export interface ERedeConfig {
  company_id: string;
  is_enabled: boolean;
  environment: 'sandbox' | 'production';
  client_id: string | null;
  client_secret: string | null;
  access_token: string | null;
  token_expires_at: string | null;
  soft_descriptor: string | null;
  auto_capture: boolean;
  pix_enabled: boolean;
  pix_key: string | null;
  notification_url: string | null;
  three_ds_enabled: boolean;
  three_ds_mpi: string;
  account_name: string | null;
  last_test_at: string | null;
  last_test_result: string | null;
  created_at: string;
  updated_at: string;
}

export interface ERedeTransaction {
  id: string;
  company_id: string;
  order_id: string | null;
  tid: string | null;
  nsu: string | null;
  reference: string | null;
  rede_order_id: string | null;
  authorization_code: string | null;
  amount_cents: number;
  captured_amount_cents: number | null;
  refunded_amount_cents: number | null;
  installments: number;
  currency: string;
  kind: string;
  card_bin: string | null;
  card_last4: string | null;
  card_brand: string | null;
  card_holder_name: string | null;
  status: string;
  capture: boolean;
  return_code: string | null;
  return_message: string | null;
  brand_return_code: string | null;
  brand_return_message: string | null;
  error_message: string | null;
  metadata: any;
  authorized_at: string | null;
  captured_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ERedeEvent {
  id: string;
  company_id: string;
  transaction_id: string | null;
  event_type: string;
  status_from: string | null;
  status_to: string | null;
  return_code: string | null;
  return_message: string | null;
  payload: any;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

// ─── Status Labels ─────────────────────────────────

export const EREDE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  authorized: 'Autorizada',
  captured: 'Capturada',
  denied: 'Negada',
  cancelled: 'Cancelada',
  processing_cancel: 'Cancelamento em processamento',
  error: 'Erro',
  zero_dollar: 'Zero Dollar (validação)',
  pix_pending: 'PIX pendente',
  pix_paid: 'PIX pago',
};

export const EREDE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  authorized: 'bg-blue-500',
  captured: 'bg-emerald-500',
  denied: 'bg-destructive',
  cancelled: 'bg-gray-500',
  processing_cancel: 'bg-orange-500',
  error: 'bg-destructive',
  zero_dollar: 'bg-cyan-500',
  pix_pending: 'bg-yellow-500',
  pix_paid: 'bg-emerald-500',
};

// ─── Hook ──────────────────────────────────────────

export function useERede() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const companyId = company?.id;

  // ─── CONFIG ──────────────────────────────────────
  const configQuery = useQuery({
    queryKey: ['erede-config', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await (supabase as any)
        .from('erede_config')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data as ERedeConfig | null;
    },
    enabled: !!companyId,
  });

  const saveConfig = useMutation({
    mutationFn: async (updates: Partial<ERedeConfig>) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      const { data, error } = await (supabase as any)
        .from('erede_config')
        .upsert({ company_id: companyId, ...updates }, { onConflict: 'company_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erede-config'] });
      toast.success('Configuração e.Rede salva!');
    },
    onError: (err: Error) => toast.error('Erro ao salvar: ' + err.message),
  });

  // ─── TRANSACTIONS ────────────────────────────────
  const transactionsQuery = useQuery({
    queryKey: ['erede-transactions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from('erede_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as ERedeTransaction[];
    },
    enabled: !!companyId,
  });

  // ─── EVENTS ──────────────────────────────────────
  const eventsQuery = useQuery({
    queryKey: ['erede-events', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from('erede_events')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as ERedeEvent[];
    },
    enabled: !!companyId,
  });

  // ─── API ACTIONS ─────────────────────────────────

  const invokeAction = async (action: string, params: Record<string, any> = {}) => {
    if (!companyId) throw new Error('Empresa não selecionada');
    const { data, error } = await supabase.functions.invoke('erede-api', {
      body: { action, company_id: companyId, ...params },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const testConnection = useMutation({
    mutationFn: () => invokeAction('test'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['erede-config'] });
      queryClient.invalidateQueries({ queryKey: ['erede-events'] });
      toast.success(data.message || 'Conexão bem-sucedida!');
    },
    onError: (err: Error) => toast.error('Erro no teste: ' + err.message),
  });

  const createTransaction = useMutation({
    mutationFn: (params: Record<string, any>) => invokeAction('create_transaction', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erede-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['erede-events'] });
      toast.success('Transação criada com sucesso!');
    },
    onError: (err: Error) => toast.error('Erro na transação: ' + err.message),
  });

  const captureTransaction = useMutation({
    mutationFn: (params: { transaction_id: string; amount_cents?: number }) =>
      invokeAction('capture', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erede-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['erede-events'] });
      toast.success('Captura realizada!');
    },
    onError: (err: Error) => toast.error('Erro na captura: ' + err.message),
  });

  const refundTransaction = useMutation({
    mutationFn: (params: { transaction_id: string; amount_cents: number; reference_refund?: string }) =>
      invokeAction('refund', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erede-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['erede-events'] });
      toast.success('Cancelamento solicitado!');
    },
    onError: (err: Error) => toast.error('Erro no cancelamento: ' + err.message),
  });

  const queryByReference = useMutation({
    mutationFn: (reference: string) => invokeAction('query_by_reference', { reference }),
  });

  const queryByTid = useMutation({
    mutationFn: (tid: string) => invokeAction('query_by_tid', { tid }),
  });

  const zeroDollar = useMutation({
    mutationFn: (params: Record<string, any>) => invokeAction('zero_dollar', params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['erede-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['erede-events'] });
      if (data.valid) {
        toast.success('Cartão validado com sucesso!');
      } else {
        toast.error('Cartão inválido');
      }
    },
    onError: (err: Error) => toast.error('Erro na validação: ' + err.message),
  });

  const getEvents = async (transactionId: string): Promise<ERedeEvent[]> => {
    if (!companyId) return [];
    const { data, error } = await (supabase as any)
      .from('erede_events')
      .select('*')
      .eq('company_id', companyId)
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ERedeEvent[];
  };

  return {
    config: configQuery.data,
    isConfigLoading: configQuery.isLoading,
    saveConfig,
    transactions: transactionsQuery.data || [],
    isTransactionsLoading: transactionsQuery.isLoading,
    events: eventsQuery.data || [],
    isEventsLoading: eventsQuery.isLoading,
    testConnection,
    createTransaction,
    captureTransaction,
    refundTransaction,
    queryByReference,
    queryByTid,
    zeroDollar,
    getEvents,
  };
}
