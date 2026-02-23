import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface BankAccount {
  id: string;
  company_id: string;
  name: string;
  bank_name: string | null;
  agency: string | null;
  account_number: string | null;
  account_type: string;
  is_active: boolean;
  notes: string | null;
  current_balance_cents?: number;
  last_reconciled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export function useBankAccounts() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['bank-accounts', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!company?.id,
  });

  const createAccount = useMutation({
    mutationFn: async (data: Omit<BankAccount, 'id' | 'company_id' | 'created_at' | 'updated_at'> & { name: string }) => {
      if (!company?.id) throw new Error('No company');
      
      const { data: result, error } = await supabase
        .from('bank_accounts')
        .insert([{ ...data, company_id: company.id }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Conta bancária criada');
    },
    onError: (error) => {
      toast.error('Erro ao criar conta: ' + error.message);
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...data }: Partial<BankAccount> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('bank_accounts')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Conta bancária atualizada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar conta: ' + error.message);
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Conta bancária removida');
    },
    onError: (error) => {
      toast.error('Erro ao remover conta: ' + error.message);
    },
  });

  return {
    accounts,
    activeAccounts: accounts.filter(a => a.is_active),
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}
