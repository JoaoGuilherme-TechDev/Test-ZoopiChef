import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface CieloConfig {
  company_id: string;
  is_enabled: boolean;
  environment: 'sandbox' | 'production';
  client_id: string | null;
  access_token: string | null;
  merchant_code: string | null;
  auto_refresh_token: boolean;
  webhook_secret: string | null;
  account_name: string | null;
  account_email: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CieloTransaction {
  id: string;
  company_id: string;
  order_id: string | null;
  cielo_order_id: string | null;
  cielo_payment_id: string | null;
  reference_id: string | null;
  amount_cents: number;
  status: string;
  payment_method: string | null;
  payment_code: string | null;
  card_brand: string | null;
  card_mask: string | null;
  authorization_code: string | null;
  nsu: string | null;
  cielo_code: string | null;
  terminal_id: string | null;
  merchant_code: string | null;
  installments: number | null;
  pix_qrcode: string | null;
  pix_qrcode_url: string | null;
  refund_amount_cents: number | null;
  refunded_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  error_message: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CieloEvent {
  id: string;
  company_id: string;
  transaction_id: string | null;
  event_type: string;
  status_from: string | null;
  status_to: string | null;
  payload: any;
  created_at: string;
}

export interface CieloSubAcquirer {
  softDescriptor: string;
  terminalId: string;
  merchantCode: string;
  city: string;
  telephone: string;
  state: string;
  postalCode: string;
  address: string;
  identifier: string;
  merchantCategoryCode: string;
  countryCode: string;
  informationType: 'J' | 'F';
  document: string;
  businessName: string;
  ibgeCode: string;
}

export function useCielo() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const companyId = company?.id;

  // ─── CONFIG ──────────────────────────────────────
  const configQuery = useQuery({
    queryKey: ['cielo-config', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await (supabase as any)
        .from('cielo_config')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data as CieloConfig | null;
    },
    enabled: !!companyId,
  });

  const saveConfig = useMutation({
    mutationFn: async (config: Partial<CieloConfig>) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      const { data, error } = await (supabase as any)
        .from('cielo_config')
        .upsert({ company_id: companyId, ...config }, { onConflict: 'company_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cielo-config', companyId] });
      toast.success('Configurações Cielo salvas!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar config: ' + error.message);
    },
  });

  // ─── TRANSACTIONS ───────────────────────────────
  const transactionsQuery = useQuery({
    queryKey: ['cielo-transactions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from('cielo_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as CieloTransaction[];
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  // ─── EVENTS LOG ─────────────────────────────────
  const eventsQuery = useQuery({
    queryKey: ['cielo-events', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from('cielo_events')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as CieloEvent[];
    },
    enabled: !!companyId,
  });

  const getEvents = async (transactionId: string) => {
    const { data, error } = await (supabase as any)
      .from('cielo_events')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []) as CieloEvent[];
  };

  // ─── API ACTIONS ────────────────────────────────
  const testConnection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('cielo-api', {
        body: { action: 'test', company_id: companyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        toast.success('Conexão Cielo OK!');
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
      payment_code?: string;
      customer?: { name?: string; email?: string };
      items?: { name: string; quantity: number; sku: string; unitOfMeasure: string; unitPrice: number }[];
      installments?: number;
      order_id?: string;
      subAcquirer?: CieloSubAcquirer;
    }) => {
      const { data, error } = await supabase.functions.invoke('cielo-api', {
        body: { action: 'create_order', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cielo-transactions', companyId] });
      toast.success('Pedido Cielo criado!');
    },
    onError: (error: Error) => {
      toast.error('Erro no pedido: ' + error.message);
    },
  });

  const refundTransaction = useMutation({
    mutationFn: async (params: { transaction_id: string; amount_cents?: number }) => {
      const { data, error } = await supabase.functions.invoke('cielo-api', {
        body: { action: 'refund', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cielo-transactions', companyId] });
      toast.success('Estorno processado!');
    },
    onError: (error: Error) => {
      toast.error('Erro no estorno: ' + error.message);
    },
  });

  const refreshStatus = useMutation({
    mutationFn: async (transactionId: string) => {
      const { data, error } = await supabase.functions.invoke('cielo-api', {
        body: { action: 'get_status', company_id: companyId, transaction_id: transactionId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cielo-transactions', companyId] });
    },
  });

  const sendToTerminal = useMutation({
    mutationFn: async (params: {
      device_id?: string;
      amount_cents: number;
      payment_code?: string;
      order_id?: string;
      items?: any[];
      installments?: number;
      email?: string;
      subAcquirer?: CieloSubAcquirer;
    }) => {
      const { data, error } = await supabase.functions.invoke('cielo-api', {
        body: { action: 'send_to_terminal', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cielo-transactions', companyId] });
      toast.success('Payload gerado para terminal Cielo Smart!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao gerar payload: ' + error.message);
    },
  });

  const cancelOnTerminal = useMutation({
    mutationFn: async (params: {
      cielo_order_id: string;
      cielo_payment_id: string;
      amount_cents: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('cielo-api', {
        body: { action: 'cancel_on_terminal', company_id: companyId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cielo-transactions', companyId] });
      toast.success('Deep Link de cancelamento gerado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao gerar cancelamento: ' + error.message);
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
    createOrder,
    refundTransaction,
    refreshStatus,
    sendToTerminal,
    cancelOnTerminal,
  };
}

// ─── STATUS DISPLAY HELPERS ────────────────────
export const CIELO_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Criado',
  DRAFT: 'Rascunho',
  ENTERED: 'Registrado',
  RE_ENTERED: 'Re-registrado',
  PAID: 'Pago',
  CANCELED: 'Cancelado',
  CLOSED: 'Fechado',
  REFUNDED: 'Estornado',
  PARTIALLY_REFUNDED: 'Estorno Parcial',
  DECLINED: 'Recusado',
  ERROR: 'Erro',
  WAITING_TERMINAL: 'Aguardando Terminal',
  PIX_PENDING: 'PIX Pendente',
};

export const CIELO_STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-muted text-muted-foreground',
  DRAFT: 'bg-muted text-muted-foreground',
  ENTERED: 'bg-blue-500/10 text-blue-500',
  RE_ENTERED: 'bg-blue-500/10 text-blue-500',
  PAID: 'bg-emerald-500/10 text-emerald-500',
  CANCELED: 'bg-destructive/10 text-destructive',
  CLOSED: 'bg-muted text-muted-foreground',
  REFUNDED: 'bg-purple-500/10 text-purple-500',
  PARTIALLY_REFUNDED: 'bg-purple-500/10 text-purple-500',
  DECLINED: 'bg-destructive/10 text-destructive',
  ERROR: 'bg-destructive/10 text-destructive',
  WAITING_TERMINAL: 'bg-amber-500/10 text-amber-500',
  PIX_PENDING: 'bg-amber-500/10 text-amber-500',
};

// Complete payment codes from Cielo Smart documentation
export const CIELO_PAYMENT_CODE_LABELS: Record<string, string> = {
  // Crédito
  CREDITO_AVISTA: 'Crédito à Vista',
  CREDITO_PARCELADO_LOJA: 'Crédito Parc. Loja',
  CREDITO_PARCELADO_ADM: 'Crédito Parc. Adm.',
  CREDITO_PARCELADO_BNCO: 'Crédito Parc. Banco',
  CREDITO_CREDIARIO_CREDITO: 'Crediário no Crédito',
  // Débito
  DEBITO_AVISTA: 'Débito à Vista',
  DEBITO_PAGTO_FATURA_DEBITO: 'Débito Pag. Fatura',
  // PIX
  PIX: 'PIX',
  // Pré-autorização
  PRE_AUTORIZACAO: 'Pré-autorização',
  // Voucher
  VOUCHER_ALIMENTACAO: 'Vale Alimentação',
  VOUCHER_REFEICAO: 'Vale Refeição',
  VOUCHER_AUTO: 'Voucher Auto',
  VOUCHER_AUTOMOTIVO: 'Voucher Automotivo',
  VOUCHER_CULTURA: 'Voucher Cultura',
  VOUCHER_BENEFICIOS: 'Voucher Benefícios',
  VOUCHER_PEDAGIO: 'Voucher Pedágio',
  VOUCHER_VALE_PEDAGIO: 'Vale Pedágio',
  VOUCHER_CONSULTA_SALDO: 'Consulta Saldo',
  // Cartão Loja
  CARTAO_LOJA_AVISTA: 'Cartão Loja à Vista',
  CARTAO_LOJA_PARCELADO: 'Cartão Loja Parcelado',
  CARTAO_LOJA_PARCELADO_LOJA: 'Cartão Loja Parc. Loja',
  CARTAO_LOJA_PARCELADO_BANCO: 'Cartão Loja Parc. Banco',
  CARTAO_LOJA_PAGTO_FATURA_CHEQUE: 'Cartão Loja Fatura Cheque',
  CARTAO_LOJA_PAGTO_FATURA_DINHEIRO: 'Cartão Loja Fatura Dinheiro',
  // Crediário
  CREDIARIO_SIMULACAO: 'Crediário Simulação',
  CREDIARIO_VENDA: 'Crediário Venda',
  // Frotas
  FROTAS: 'Frotas',
};

// Cielo Deep Link error codes
export const CIELO_ERROR_CODES: Record<number, string> = {
  1: 'Cancelado pelo usuário',
  2: 'Erro genérico',
  3: 'Erro no pagamento',
  4: 'Erro de autenticação',
};

// Primary product codes from Cielo docs
export const CIELO_PRIMARY_PRODUCTS: Record<string, string> = {
  '1000': 'CREDITO',
  '2000': 'DEBITO',
  '3000': 'VOUCHER',
  '4': 'CREDITO',
};

// Card capture type codes
export const CIELO_CAPTURE_TYPES: Record<string, string> = {
  '0': 'EMV (Chip)',
  '1': 'Digitado',
  '2': 'Trilha Magnética',
  '3': 'Contactless (NFC)',
  '6': 'QR Code',
  '-1': 'Outro',
};
