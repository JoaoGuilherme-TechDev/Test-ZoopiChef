import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface BankTransaction {
  id: string;
  company_id: string;
  bank_account_id: string;
  transaction_date: string;
  description: string;
  amount_cents: number;
  transaction_type: 'credit' | 'debit';
  category: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reconciled: boolean;
  reconciled_at: string | null;
  reconciled_by: string | null;
  notes: string | null;
  external_id: string | null;
  created_at: string;
  bank_account?: {
    id: string;
    name: string;
    bank_name: string | null;
  };
}

export interface CreateTransactionInput {
  bank_account_id: string;
  transaction_date: string;
  description: string;
  amount_cents: number;
  transaction_type: 'credit' | 'debit';
  category?: string;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  external_id?: string;
}

export function useBankTransactions(filters?: {
  bankAccountId?: string;
  startDate?: string;
  endDate?: string;
  reconciled?: boolean;
}) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ['bank-transactions', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('bank_transactions')
        .select(`
          *,
          bank_account:bank_accounts(id, name, bank_name)
        `)
        .eq('company_id', company.id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.bankAccountId) {
        query = query.eq('bank_account_id', filters.bankAccountId);
      }
      if (filters?.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }
      if (filters?.reconciled !== undefined) {
        query = query.eq('reconciled', filters.reconciled);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BankTransaction[];
    },
    enabled: !!company?.id,
  });

  const createTransaction = useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      if (!company?.id) throw new Error('No company');
      
      const { data, error } = await supabase
        .from('bank_transactions')
        .insert({
          ...input,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Transação criada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar transação: ' + error.message);
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BankTransaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Transação atualizada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Transação excluída');
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });

  const reconcileTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('bank_transactions')
        .update({
          reconciled: true,
          reconciled_at: new Date().toISOString(),
          reconciled_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success('Transação conciliada');
    },
    onError: (error) => {
      toast.error('Erro ao conciliar: ' + error.message);
    },
  });

  const bulkReconcile = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('bank_transactions')
        .update({
          reconciled: true,
          reconciled_at: new Date().toISOString(),
          reconciled_by: user?.id,
        })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success('Transações conciliadas');
    },
    onError: (error) => {
      toast.error('Erro ao conciliar: ' + error.message);
    },
  });

  return {
    transactions: transactionsQuery.data || [],
    isLoading: transactionsQuery.isLoading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    reconcileTransaction,
    bulkReconcile,
  };
}
