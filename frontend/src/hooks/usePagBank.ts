import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface PagBankConfig {
  company_id: string;
  is_enabled: boolean;
  environment: 'sandbox' | 'production';
  client_id: string | null;
  client_secret: string | null;
  smartpos_key: string | null;
  smartpos_secret: string | null;
  auto_refresh_token: boolean;
  webhook_secret: string | null;
  account_email: string | null;
  account_name: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PagBankTransaction {
  id: string;
  company_id: string;
  order_id: string | null;
  pagbank_order_id: string | null;
  pagbank_charge_id: string | null;
  reference_id: string | null;
  amount_cents: number;
  status: string;
  payment_method: string | null;
  card_brand: string | null;
  card_last_digits: string | null;
  authorization_code: string | null;
  nsu: string | null;
  pix_qrcode: string | null;
  pix_qrcode_url: string | null;
  boleto_url: string | null;
  payment_link_url: string | null;
  refund_amount_cents: number | null;
  refunded_at: string | null;
  terminal_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  error_message: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PagBankEvent {
  id: string;
  company_id: string;
  transaction_id: string | null;
  event_type: string;
  status_from: string | null;
  status_to: string | null;
  payload: any;
  created_at: string;
}

export function usePagBank() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const companyId = company?.id;

  // ─── CONFIG ──────────────────────────────────────
  const configQuery = useQuery({
    queryKey: ['pagbank-config', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await (supabase as any)
        .from('pagbank_config')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data as PagBankConfig | null;
    },
    enabled: !!companyId,
  });

  const saveConfig = useMutation({
    mutationFn: async (config: Partial<PagBankConfig>) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      const { data, error } = await (supabase as any)
        .from('pagbank_config')
        .upsert({ company_id: companyId, ...config }, { onConflict: 'company_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagbank-config', companyId] });
      toast.success('Configurações PagBank salvas!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar config: ' + error.message);
    },
  });

  // ─── TRANSACTIONS ───────────────────────────────
  const transactionsQuery = useQuery({
    queryKey: ['pagbank-transactions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from('pagbank_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as PagBankTransaction[];
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  // ─── EVENTS LOG ─────────────────────────────────
  const getEvents = async (transactionId: string) => {
    const { data, error } = await (supabase as any)
      .from('pagbank_events')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []) as PagBankEvent[];
  };

  // ─── API ACTIONS ────────────────────────────────
  const testConnection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('pagbank-api', {
        body: { action: 'test', company_id: companyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        toast.success('Conexão PagBank OK!');
      } else {
        toast.error('Falha na conexão: ' + (data?.error || 'Erro desconhecido'));
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao testar conexão: ' + error.message);
    },
  });

  const createOrder = useMutation({
    mutationFn: async (params: {
      reference_id?: string;
      amount_cents: number;
      payment_method: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO';
      customer?: { name?: string; email?: string; phone?: string; tax_id?: string };
      card_token?: string;
      installments?: number;
      items?: { name: string; quantity: number; unit_amount: number }[];
      order_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('pagbank-api', {
        body: { action: 'create_order', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagbank-transactions', companyId] });
      toast.success('Pagamento criado!');
    },
    onError: (error: Error) => {
      toast.error('Erro no pagamento: ' + error.message);
    },
  });

  const refundTransaction = useMutation({
    mutationFn: async (params: { transaction_id: string; amount_cents?: number }) => {
      const { data, error } = await supabase.functions.invoke('pagbank-api', {
        body: { action: 'refund', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagbank-transactions', companyId] });
      toast.success('Reembolso processado!');
    },
    onError: (error: Error) => {
      toast.error('Erro no reembolso: ' + error.message);
    },
  });

  const refreshStatus = useMutation({
    mutationFn: async (transactionId: string) => {
      const { data, error } = await supabase.functions.invoke('pagbank-api', {
        body: { action: 'get_status', company_id: companyId, transaction_id: transactionId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagbank-transactions', companyId] });
    },
  });

  const createPaymentLink = useMutation({
    mutationFn: async (params: {
      amount_cents: number;
      description?: string;
      reference_id?: string;
      expiration_minutes?: number;
      order_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('pagbank-api', {
        body: { action: 'create_payment_link', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagbank-transactions', companyId] });
      toast.success('Link de pagamento criado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar link: ' + error.message);
    },
  });

  const sendToTerminal = useMutation({
    mutationFn: async (params: {
      device_id: string;
      amount_cents: number;
      payment_method?: string;
      order_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('pagbank-api', {
        body: { action: 'send_to_terminal', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagbank-transactions', companyId] });
      toast.success('Transação enviada ao terminal!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar ao terminal: ' + error.message);
    },
  });

  return {
    // Config
    config: configQuery.data,
    isConfigLoading: configQuery.isLoading,
    saveConfig,

    // Transactions
    transactions: transactionsQuery.data || [],
    isTransactionsLoading: transactionsQuery.isLoading,
    getEvents,

    // Actions
    testConnection,
    createOrder,
    refundTransaction,
    refreshStatus,
    createPaymentLink,
    sendToTerminal,
  };
}

// ─── STATUS DISPLAY HELPERS ────────────────────
export const PAGBANK_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Criado',
  WAITING: 'Aguardando',
  IN_ANALYSIS: 'Em Análise',
  PRE_AUTHORIZED: 'Pré-autorizado',
  AUTHORIZED: 'Autorizado',
  PAID: 'Pago',
  AVAILABLE: 'Disponível',
  DISPUTE: 'Disputa',
  REFUNDED: 'Reembolsado',
  PARTIALLY_REFUNDED: 'Parcial Reembolso',
  DECLINED: 'Recusado',
  CANCELED: 'Cancelado',
  VOIDED: 'Anulado',
  ERROR: 'Erro',
};

export const PAGBANK_STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-muted text-muted-foreground',
  WAITING: 'bg-amber-500/10 text-amber-500',
  IN_ANALYSIS: 'bg-blue-500/10 text-blue-500',
  PRE_AUTHORIZED: 'bg-cyan-500/10 text-cyan-500',
  AUTHORIZED: 'bg-indigo-500/10 text-indigo-500',
  PAID: 'bg-emerald-500/10 text-emerald-500',
  AVAILABLE: 'bg-emerald-500/10 text-emerald-500',
  DISPUTE: 'bg-orange-500/10 text-orange-500',
  REFUNDED: 'bg-purple-500/10 text-purple-500',
  PARTIALLY_REFUNDED: 'bg-purple-500/10 text-purple-500',
  DECLINED: 'bg-destructive/10 text-destructive',
  CANCELED: 'bg-destructive/10 text-destructive',
  VOIDED: 'bg-destructive/10 text-destructive',
  ERROR: 'bg-destructive/10 text-destructive',
};

export const PAGBANK_PAYMENT_METHOD_LABELS: Record<string, string> = {
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  PIX: 'PIX',
  BOLETO: 'Boleto',
  WALLET: 'Carteira Digital',
  PAYMENT_LINK: 'Link de Pagamento',
};
