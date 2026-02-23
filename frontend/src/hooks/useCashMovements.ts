import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useProfile } from './useProfile';
import { useCashSession } from './useCashSession';
import { toast } from 'sonner';

export interface CashMovement {
  id: string;
  company_id: string;
  cash_session_id: string;
  movement_type: 'supply' | 'withdrawal';
  amount: number;
  reason: string | null;
  created_by: string;
  created_at: string;
}

export function useCashMovements() {
  const { data: company } = useCompany();
  const { data: profile } = useProfile();
  const { openSession } = useCashSession();
  const queryClient = useQueryClient();

  // Buscar movimentações da sessão atual
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['cash-movements', openSession?.id],
    queryFn: async () => {
      if (!openSession?.id) return [];

      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('cash_session_id', openSession.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CashMovement[];
    },
    enabled: !!openSession?.id,
  });

  // Calcular totais
  const totals = movements.reduce(
    (acc, mov) => {
      if (mov.movement_type === 'supply') {
        acc.supplies += mov.amount;
      } else {
        acc.withdrawals += mov.amount;
      }
      return acc;
    },
    { supplies: 0, withdrawals: 0 }
  );

  // Adicionar suprimento
  const addSupply = useMutation({
    mutationFn: async ({ amount, reason }: { amount: number; reason?: string }) => {
      if (!company?.id || !profile?.id || !openSession?.id) {
        throw new Error('Caixa não está aberto');
      }

      const { data, error } = await supabase
        .from('cash_movements')
        .insert({
          company_id: company.id,
          cash_session_id: openSession.id,
          movement_type: 'supply',
          amount,
          reason,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] });
      queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
      toast.success('Suprimento registrado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao registrar suprimento');
    },
  });

  // Registrar sangria
  const addWithdrawal = useMutation({
    mutationFn: async ({ amount, reason }: { amount: number; reason: string }) => {
      if (!company?.id || !profile?.id || !openSession?.id) {
        throw new Error('Caixa não está aberto');
      }

      if (!reason.trim()) {
        throw new Error('Motivo obrigatório para sangria');
      }

      const { data, error } = await supabase
        .from('cash_movements')
        .insert({
          company_id: company.id,
          cash_session_id: openSession.id,
          movement_type: 'withdrawal',
          amount,
          reason,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] });
      queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
      toast.success('Sangria registrada');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao registrar sangria');
    },
  });

  return {
    movements,
    isLoading,
    totals,
    addSupply,
    addWithdrawal,
    hasOpenSession: !!openSession,
  };
}
