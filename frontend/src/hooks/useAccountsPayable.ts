import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useProfile } from './useProfile';
import { useCashSession } from './useCashSession';
import { toast } from 'sonner';

export interface AccountPayable {
  id: string;
  company_id: string;
  description: string;
  amount_cents: number;
  category: string | null;
  category_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  due_date: string | null;
  paid_at: string | null;
  paid_by: string | null;
  payment_method: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string;
  category_code?: string;
}

export interface AccountsPayableFilters {
  status?: 'all' | 'pending' | 'paid' | 'cancelled';
  category?: string;
  category_id?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export function useAccountsPayable(filters?: AccountsPayableFilters) {
  const { data: company } = useCompany();
  const { data: profile } = useProfile();
  const { openSession } = useCashSession();
  const queryClient = useQueryClient();

  // Buscar contas a pagar com join no plano de contas
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts-payable', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('accounts_payable')
        .select(`
          *,
          chart_account:chart_of_accounts(id, name, code)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      // Filtro de status
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Filtro de categoria (legacy - texto)
      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      // Filtro de categoria_id (novo - FK)
      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      // Filtro de data
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate + 'T23:59:59');
      }

      // Filtro de busca
      if (filters?.search) {
        query = query.ilike('description', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Map joined data
      return (data || []).map((item: any) => ({
        ...item,
        category_name: item.chart_account?.name || null,
        category_code: item.chart_account?.code || null,
      })) as AccountPayable[];
    },
    enabled: !!company?.id,
  });

  // Dar baixa em conta - agora registra quem pagou e método
  const payAccount = useMutation({
    mutationFn: async ({ accountId, paymentMethod }: { accountId: string; paymentMethod?: string }) => {
      if (!profile?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('accounts_payable')
        .update({ 
          paid_at: new Date().toISOString(),
          paid_by: profile.id,
          payment_method: paymentMethod || 'dinheiro',
          status: 'paid',
        })
        .eq('id', accountId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
      toast.success('Conta paga com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao dar baixa na conta');
    },
  });

  // Estornar pagamento
  const unpayAccount = useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase
        .from('accounts_payable')
        .update({ 
          paid_at: null, 
          paid_by: null, 
          payment_method: null,
          status: 'pending',
        })
        .eq('id', accountId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      toast.success('Pagamento estornado!');
    },
    onError: () => {
      toast.error('Erro ao estornar pagamento');
    },
  });

  // Criar conta a pagar - agora aceita category_id
  const createAccount = useMutation({
    mutationFn: async (data: {
      description: string;
      amount_cents: number;
      category?: string;
      category_id?: string;
      due_date?: string;
      notes?: string;
      reference_type?: string;
      reference_id?: string;
    }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const { data: account, error } = await supabase
        .from('accounts_payable')
        .insert({
          ...data,
          company_id: company.id,
          created_by: profile?.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      toast.success('Conta criada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar conta');
    },
  });

  // Deletar conta
  const deleteAccount = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('accounts_payable')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      toast.success('Conta removida!');
    },
    onError: () => {
      toast.error('Erro ao remover conta');
    },
  });

  // Calcular totais
  const totals = {
    total: accounts.reduce((sum, a) => sum + a.amount_cents, 0) / 100,
    open: accounts.filter(a => !a.paid_at).reduce((sum, a) => sum + a.amount_cents, 0) / 100,
    paid: accounts.filter(a => a.paid_at).reduce((sum, a) => sum + a.amount_cents, 0) / 100,
  };

  return {
    accounts,
    isLoading,
    totals,
    payAccount,
    unpayAccount,
    createAccount,
    deleteAccount,
  };
}
