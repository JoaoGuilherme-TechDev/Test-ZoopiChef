import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface PaymentTransaction {
  id: string;
  company_id: string;
  order_id?: string;
  customer_id?: string;
  amount_cents: number;
  status: 'pending' | 'processing' | 'approved' | 'declined' | 'refunded' | 'cancelled';
  payment_method: 'pix' | 'credit_card' | 'debit_card' | 'boleto';
  gateway: 'mercadopago' | 'pagseguro' | 'stripe' | 'asaas' | 'manual';
  external_id?: string;
  pix_code?: string;
  pix_qrcode_url?: string;
  boleto_url?: string;
  boleto_barcode?: string;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
  paid_at?: string;
  expires_at?: string;
}

export interface CreatePaymentParams {
  orderId?: string;
  customerId?: string;
  amountCents: number;
  paymentMethod: 'pix' | 'credit_card' | 'debit_card' | 'boleto';
  customerEmail?: string;
  customerPhone?: string;
  customerDocument?: string;
  description?: string;
}

export interface PaymentConfig {
  gateway: 'mercadopago' | 'pagseguro' | 'stripe' | 'asaas';
  isActive: boolean;
  publicKey?: string;
  pixEnabled: boolean;
  creditCardEnabled: boolean;
  boletoEnabled: boolean;
}

export function usePaymentIntegration() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Payment config - simplified for now
  const configQuery = useQuery({
    queryKey: ['payment-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      return { isActive: false } as PaymentConfig | null;
    },
    enabled: !!company?.id,
  });

  // Fetch recent transactions from orders
  const transactionsQuery = useQuery({
    queryKey: ['payment-transactions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, payment_method, status, created_at, customer_id')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      return (data || []).map(order => ({
        id: order.id,
        company_id: company.id!,
        order_id: order.id,
        customer_id: order.customer_id,
        amount_cents: Math.round((order.total || 0) * 100),
        status: order.status === 'entregue' ? 'approved' : 'pending' as const,
        payment_method: (order.payment_method || 'manual') as 'pix',
        gateway: 'manual' as const,
        created_at: order.created_at,
      })) as PaymentTransaction[];
    },
    enabled: !!company?.id,
  });

  // Create PIX payment
  const createPixPayment = useMutation({
    mutationFn: async (params: CreatePaymentParams) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: {
          companyId: company.id,
          ...params,
        },
      });

      if (error) throw error;
      return data as { 
        transactionId: string; 
        pixCode: string; 
        qrcodeUrl: string;
        expiresAt: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-transactions'] });
      toast.success('PIX gerado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao gerar PIX: ' + error.message);
    },
  });

  // Create credit card payment
  const createCardPayment = useMutation({
    mutationFn: async (params: CreatePaymentParams & { 
      cardToken: string;
      installments?: number;
    }) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase.functions.invoke('create-card-payment', {
        body: {
          companyId: company.id,
          ...params,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-transactions'] });
      toast.success('Pagamento processado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro no pagamento: ' + error.message);
    },
  });

  // Create boleto
  const createBoleto = useMutation({
    mutationFn: async (params: CreatePaymentParams) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase.functions.invoke('create-boleto', {
        body: {
          companyId: company.id,
          ...params,
        },
      });

      if (error) throw error;
      return data as {
        transactionId: string;
        boletoUrl: string;
        barcode: string;
        dueDate: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-transactions'] });
      toast.success('Boleto gerado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao gerar boleto: ' + error.message);
    },
  });

  // Refund payment
  const refundPayment = useMutation({
    mutationFn: async ({ transactionId, amountCents }: { transactionId: string; amountCents?: number }) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase.functions.invoke('refund-payment', {
        body: {
          companyId: company.id,
          transactionId,
          amountCents,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-transactions'] });
      toast.success('Reembolso processado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro no reembolso: ' + error.message);
    },
  });

  // Check payment status
  const checkPaymentStatus = useMutation({
    mutationFn: async (transactionId: string) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: {
          companyId: company.id,
          transactionId,
        },
      });

      if (error) throw error;
      return data;
    },
  });

  const isConfigured = !!configQuery.data?.isActive;

  return {
    config: configQuery.data,
    transactions: transactionsQuery.data || [],
    isLoading: configQuery.isLoading || transactionsQuery.isLoading,
    isConfigured,
    createPixPayment,
    createCardPayment,
    createBoleto,
    refundPayment,
    checkPaymentStatus,
  };
}
