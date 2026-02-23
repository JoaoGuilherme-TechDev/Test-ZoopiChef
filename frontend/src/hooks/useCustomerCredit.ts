import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface CreditTransaction {
  id: string;
  company_id: string;
  customer_id: string;
  order_id: string | null;
  transaction_type: 'debit' | 'payment';
  amount: number;
  balance_after: number;
  payment_method: string | null;
  operator_id: string | null;
  notes: string | null;
  created_at: string;
}

export function useCustomerCredit(customerId?: string) {
  const { data: company } = useCompany();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  // Buscar transações do cliente
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['customer-credit-transactions', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('customer_credit_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CreditTransaction[];
    },
    enabled: !!customerId,
  });

  // Buscar saldo do cliente
  const { data: customerBalance } = useQuery({
    queryKey: ['customer-balance', customerId],
    queryFn: async () => {
      if (!customerId) return 0;

      const { data, error } = await supabase
        .from('customers')
        .select('credit_balance')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      return Number(data?.credit_balance) || 0;
    },
    enabled: !!customerId,
  });

  // Adicionar débito (quando pedido é fiado)
  const addDebit = useMutation({
    mutationFn: async ({ 
      customerId, 
      orderId, 
      amount,
      notes,
    }: { 
      customerId: string; 
      orderId: string;
      amount: number;
      notes?: string;
    }) => {
      if (!company?.id || !profile?.id) throw new Error('Dados não disponíveis');

      // Buscar saldo atual
      const { data: customer } = await supabase
        .from('customers')
        .select('credit_balance')
        .eq('id', customerId)
        .single();

      const currentBalance = Number(customer?.credit_balance) || 0;
      const newBalance = currentBalance + amount;

      // Inserir transação
      const { error: txError } = await supabase
        .from('customer_credit_transactions')
        .insert({
          company_id: company.id,
          customer_id: customerId,
          order_id: orderId,
          transaction_type: 'debit',
          amount,
          balance_after: newBalance,
          operator_id: profile.id,
          notes,
        });

      if (txError) throw txError;

      // Atualizar saldo do cliente
      const { error: updateError } = await supabase
        .from('customers')
        .update({ credit_balance: newBalance })
        .eq('id', customerId);

      if (updateError) throw updateError;

      return { newBalance };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-credit-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['customer-balance'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  // Receber pagamento de fiado
  const receivePayment = useMutation({
    mutationFn: async ({ 
      customerId, 
      amount,
      paymentMethod,
      notes,
    }: { 
      customerId: string; 
      amount: number;
      paymentMethod: string;
      notes?: string;
    }) => {
      if (!company?.id || !profile?.id) throw new Error('Dados não disponíveis');

      // Buscar saldo atual
      const { data: customer } = await supabase
        .from('customers')
        .select('credit_balance')
        .eq('id', customerId)
        .single();

      const currentBalance = Number(customer?.credit_balance) || 0;
      
      if (amount > currentBalance) {
        throw new Error('Valor maior que o saldo devedor');
      }

      const newBalance = currentBalance - amount;

      // Inserir transação
      const { error: txError } = await supabase
        .from('customer_credit_transactions')
        .insert({
          company_id: company.id,
          customer_id: customerId,
          transaction_type: 'payment',
          amount,
          balance_after: newBalance,
          payment_method: paymentMethod,
          operator_id: profile.id,
          notes,
        });

      if (txError) throw txError;

      // Atualizar saldo do cliente
      const { error: updateError } = await supabase
        .from('customers')
        .update({ credit_balance: newBalance })
        .eq('id', customerId);

      if (updateError) throw updateError;

      return { newBalance };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-credit-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['customer-balance'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Pagamento registrado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao registrar pagamento');
    },
  });

  return {
    transactions,
    isLoading,
    customerBalance: customerBalance || 0,
    addDebit,
    receivePayment,
  };
}

// Hook para listar todos os clientes com fiado pendente
export function useCustomersWithCredit() {
  const { data: company } = useCompany();

  const { data: customersWithCredit = [], isLoading } = useQuery({
    queryKey: ['customers-with-credit', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('id, name, whatsapp, credit_balance')
        .eq('company_id', company.id)
        .gt('credit_balance', 0)
        .order('credit_balance', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  return { customersWithCredit, isLoading };
}
