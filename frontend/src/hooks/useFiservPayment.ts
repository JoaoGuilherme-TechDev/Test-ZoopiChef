import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export interface FiservCustomer {
  name: string;
  email: string;
  document: string;
  phone?: string;
}

export interface FiservCard {
  number?: string;
  expiry_month?: string;
  expiry_year?: string;
  cvv?: string;
  holder_name?: string;
  token?: string;
}

export interface FiservPaymentParams {
  amount_cents: number;
  order_id: string;
  customer: FiservCustomer;
  card?: FiservCard;
  installments?: number;
  description?: string;
}

export interface FiservPixParams {
  amount_cents: number;
  order_id: string;
  customer: FiservCustomer;
  expiration_minutes?: number;
}

export interface FiservBoletoParams {
  amount_cents: number;
  order_id: string;
  customer: FiservCustomer;
  due_days?: number;
  description?: string;
}

export interface FiservPaymentResult {
  success: boolean;
  data?: {
    ipgTransactionId?: string;
    orderId?: string;
    transactionStatus?: string;
    transactionType?: string;
    approvalCode?: string;
    processor?: {
      responseCode?: string;
      responseMessage?: string;
    };
    paymentMethodDetails?: {
      paymentCard?: {
        brand?: string;
        last4?: string;
      };
      paymentMethodType?: string;
    };
    // PIX specific
    pixPaymentDetails?: {
      qrCode?: string;
      qrCodeUrl?: string;
      copyPaste?: string;
      expirationDate?: string;
    };
    // Boleto specific
    boletoPaymentDetails?: {
      barcodeNumber?: string;
      digitableLine?: string;
      boletoUrl?: string;
      dueDate?: string;
    };
    // Token specific
    paymentToken?: {
      value?: string;
      reusable?: boolean;
      lastFour?: string;
      brand?: string;
    };
  };
  error?: string;
}

async function invokeFiservFunction(payload: Record<string, unknown>): Promise<FiservPaymentResult> {
  const { data, error } = await supabase.functions.invoke('fiserv-payment', {
    body: payload,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function useFiservPayment() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Create card payment
  const createCardPayment = useMutation({
    mutationFn: async (params: FiservPaymentParams) => {
      return invokeFiservFunction({
        action: 'create_payment',
        amount_cents: params.amount_cents,
        order_id: params.order_id,
        customer: params.customer,
        card: params.card,
        installments: params.installments,
        description: params.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiserv-transactions'] });
    },
  });

  // Create PIX payment
  const createPixPayment = useMutation({
    mutationFn: async (params: FiservPixParams) => {
      return invokeFiservFunction({
        action: 'create_pix',
        amount_cents: params.amount_cents,
        order_id: params.order_id,
        customer: params.customer,
        pix_expiration_minutes: params.expiration_minutes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiserv-transactions'] });
    },
  });

  // Create Boleto payment
  const createBoletoPayment = useMutation({
    mutationFn: async (params: FiservBoletoParams) => {
      return invokeFiservFunction({
        action: 'create_boleto',
        amount_cents: params.amount_cents,
        order_id: params.order_id,
        customer: params.customer,
        boleto_due_days: params.due_days,
        description: params.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiserv-transactions'] });
    },
  });

  // Check payment status
  const checkPaymentStatus = useMutation({
    mutationFn: async (transactionId: string) => {
      return invokeFiservFunction({
        action: 'check_status',
        transaction_id: transactionId,
      });
    },
  });

  // Refund payment
  const refundPayment = useMutation({
    mutationFn: async ({ transactionId, amountCents }: { transactionId: string; amountCents?: number }) => {
      return invokeFiservFunction({
        action: 'refund',
        transaction_id: transactionId,
        amount_cents: amountCents,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiserv-transactions'] });
    },
  });

  // Tokenize card
  const tokenizeCard = useMutation({
    mutationFn: async ({ card, customer }: { card: FiservCard; customer: FiservCustomer }) => {
      return invokeFiservFunction({
        action: 'tokenize_card',
        card,
        customer,
      });
    },
  });

  return {
    createCardPayment,
    createPixPayment,
    createBoletoPayment,
    checkPaymentStatus,
    refundPayment,
    tokenizeCard,
  };
}

// Hook to fetch Fiserv transactions
export function useFiservTransactions() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['fiserv-transactions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      // First get the Fiserv integration ID
      const { data: integration } = await supabase
        .from('tef_integrations')
        .select('id')
        .eq('company_id', company.id)
        .eq('provider', 'fiserv')
        .maybeSingle();

      if (!integration) return [];

      const { data, error } = await supabase
        .from('tef_transactions')
        .select('*')
        .eq('company_id', company.id)
        .eq('integration_id', integration.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}
