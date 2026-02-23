import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface ChartAccount {
  id: string;
  company_id: string;
  code: string;
  name: string;
  account_type: 'expense' | 'income' | 'asset' | 'liability';
  parent_id: string | null;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useChartOfAccounts() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chart-of-accounts', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', company.id)
        .order('code', { ascending: true });

      if (error) throw error;
      return data as ChartAccount[];
    },
    enabled: !!company?.id,
  });

  const createAccount = useMutation({
    mutationFn: async (data: {
      code: string;
      name: string;
      account_type: string;
      parent_id?: string | null;
      level?: number;
    }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const { data: account, error } = await supabase
        .from('chart_of_accounts')
        .insert({
          ...data,
          company_id: company.id,
          level: data.level ?? 1,
        })
        .select()
        .single();

      if (error) throw error;
      return account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Conta criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar conta: ${error.message}`);
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ChartAccount> & { id: string }) => {
      const { data: account, error } = await supabase
        .from('chart_of_accounts')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Conta atualizada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('chart_of_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Conta removida!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('chart_of_accounts')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Status atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  // Organizar contas em hierarquia
  const buildTree = (accounts: ChartAccount[]): (ChartAccount & { children: ChartAccount[] })[] => {
    const map = new Map<string, ChartAccount & { children: ChartAccount[] }>();
    const roots: (ChartAccount & { children: ChartAccount[] })[] = [];

    accounts.forEach(acc => {
      map.set(acc.id, { ...acc, children: [] });
    });

    accounts.forEach(acc => {
      const node = map.get(acc.id)!;
      if (acc.parent_id && map.has(acc.parent_id)) {
        map.get(acc.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const expenseAccounts = accounts.filter(a => a.account_type === 'expense' && a.is_active);
  const incomeAccounts = accounts.filter(a => a.account_type === 'income' && a.is_active);

  return {
    accounts,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    toggleActive,
    buildTree,
    expenseAccounts,
    incomeAccounts,
  };
}
