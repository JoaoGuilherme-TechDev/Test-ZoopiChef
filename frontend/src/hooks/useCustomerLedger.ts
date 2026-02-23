import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useProfile } from './useProfile';
import { useCashSession } from './useCashSession';
import { toast } from 'sonner';

export interface LedgerEntry {
  id: string;
  company_id: string;
  customer_id: string;
  order_id: string | null;
  cash_session_id: string | null;
  transaction_type: 'debit' | 'credit';
  amount: number;
  balance_after: number;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export function useCustomerLedger(customerId?: string) {
  const { data: company } = useCompany();
  const { data: profile } = useProfile();
  const { openSession } = useCashSession();
  const queryClient = useQueryClient();

  // Buscar extrato do cliente
  const { data: ledger = [], isLoading } = useQuery({
    queryKey: ['customer-ledger', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('customer_ledger')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LedgerEntry[];
    },
    enabled: !!customerId,
  });

  // Buscar saldo atual do cliente
  const { data: currentBalance = 0 } = useQuery({
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

  // Adicionar débito (pedido fiado)
  const addDebit = useMutation({
    mutationFn: async ({
      customerId,
      orderId,
      amount,
      description,
    }: {
      customerId: string;
      orderId?: string;
      amount: number;
      description?: string;
    }) => {
      if (!company?.id || !profile?.id) throw new Error('Dados não disponíveis');

      // Buscar saldo atual
      const { data: customer } = await supabase
        .from('customers')
        .select('credit_balance, credit_limit, allow_credit, is_blocked')
        .eq('id', customerId)
        .single();

      if (!customer) throw new Error('Cliente não encontrado');
      if (customer.is_blocked) throw new Error('Cliente bloqueado');
      if (!customer.allow_credit) throw new Error('Cliente não permite fiado');

      const currentBal = Number(customer.credit_balance) || 0;
      const limit = Number(customer.credit_limit) || 0;
      const newBalance = currentBal + amount;

      if (limit > 0 && newBalance > limit) {
        throw new Error(`Limite de fiado excedido. Limite: R$ ${limit.toFixed(2)}, Saldo atual: R$ ${currentBal.toFixed(2)}`);
      }

      const { data, error } = await supabase
        .from('customer_ledger')
        .insert({
          company_id: company.id,
          customer_id: customerId,
          order_id: orderId || null,
          cash_session_id: openSession?.id || null,
          transaction_type: 'debit',
          amount,
          balance_after: newBalance,
          description: description || 'Pedido em fiado',
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['customer-balance'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Receber pagamento (crédito)
  const receivePayment = useMutation({
    mutationFn: async ({
      customerId,
      amount,
      description,
    }: {
      customerId: string;
      amount: number;
      description?: string;
    }) => {
      if (!company?.id || !profile?.id) throw new Error('Dados não disponíveis');
      if (!openSession) throw new Error('Caixa precisa estar aberto para receber pagamento');

      // Buscar saldo atual
      const { data: customer } = await supabase
        .from('customers')
        .select('credit_balance')
        .eq('id', customerId)
        .single();

      const currentBal = Number(customer?.credit_balance) || 0;

      if (amount > currentBal) {
        throw new Error('Valor maior que o saldo devedor');
      }

      const newBalance = currentBal - amount;

      const { data, error } = await supabase
        .from('customer_ledger')
        .insert({
          company_id: company.id,
          customer_id: customerId,
          cash_session_id: openSession.id,
          transaction_type: 'credit',
          amount,
          balance_after: newBalance,
          description: description || 'Pagamento de fiado',
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['customer-balance'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
      toast.success('Pagamento registrado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    ledger,
    isLoading,
    currentBalance,
    addDebit,
    receivePayment,
  };
}

// Hook para listar todos os clientes com fiado
export function useCustomersWithFiado() {
  const { data: company } = useCompany();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers-with-fiado', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('id, name, whatsapp, credit_balance, credit_limit, allow_credit, is_blocked')
        .eq('company_id', company.id)
        .gt('credit_balance', 0)
        .order('credit_balance', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const totalFiado = customers.reduce((sum, c) => sum + (Number(c.credit_balance) || 0), 0);

  return { customers, isLoading, totalFiado };
}
