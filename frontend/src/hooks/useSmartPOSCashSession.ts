/**
 * Hook for managing Smart POS Cash Sessions
 * Each Smart PDV device has its own cash session
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface PaymentsSummary {
  pix: { count: number; total: number };
  credit: { count: number; total: number };
  debit: { count: number; total: number };
  cash: { count: number; total: number };
  voucher: { count: number; total: number };
}

export interface SmartPOSCashSession {
  id: string;
  company_id: string;
  device_id: string;
  opened_by: string;
  opened_at: string;
  opening_balance: number;
  closed_at: string | null;
  closing_balance: number | null;
  expected_balance: number | null;
  difference: number | null;
  status: 'open' | 'closed';
  notes: string | null;
  total_transactions: number;
  total_revenue: number;
  payments_summary: PaymentsSummary | null;
}

export interface SmartPOSCashSummary {
  totalTransactions: number;
  totalRevenue: number;
  paymentsSummary: {
    pix: { count: number; total: number };
    credit: { count: number; total: number };
    debit: { count: number; total: number };
    cash: { count: number; total: number };
    voucher: { count: number; total: number };
  };
  expectedCash: number;
}

// Get open cash session for a device
export function useSmartPOSOpenSession(deviceId: string | null) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['smartpos-cash-session-open', deviceId],
    queryFn: async () => {
      if (!company?.id || !deviceId) return null;

      const { data, error } = await supabase
        .from('smartpos_cash_sessions')
        .select('*')
        .eq('company_id', company.id)
        .eq('device_id', deviceId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as SmartPOSCashSession | null;
    },
    enabled: !!company?.id && !!deviceId,
  });
}

// Get cash session summary (transactions in current session)
export function useSmartPOSCashSummary(sessionId: string | null, deviceId: string | null) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['smartpos-cash-summary', sessionId, deviceId],
    queryFn: async (): Promise<SmartPOSCashSummary | null> => {
      if (!company?.id || !sessionId || !deviceId) return null;

      // Get all transactions for this device in this session
      const { data: transactions, error } = await supabase
        .from('smartpos_pending_transactions')
        .select('*')
        .eq('company_id', company.id)
        .eq('device_id', deviceId)
        .eq('smartpos_cash_session_id', sessionId)
        .eq('status', 'approved');

      if (error) throw error;

      const summary: SmartPOSCashSummary = {
        totalTransactions: transactions?.length || 0,
        totalRevenue: 0,
        paymentsSummary: {
          pix: { count: 0, total: 0 },
          credit: { count: 0, total: 0 },
          debit: { count: 0, total: 0 },
          cash: { count: 0, total: 0 },
          voucher: { count: 0, total: 0 },
        },
        expectedCash: 0,
      };

      for (const tx of transactions || []) {
        const amount = tx.amount_cents / 100;
        summary.totalRevenue += amount;

        switch (tx.payment_method) {
          case 'pix':
            summary.paymentsSummary.pix.count++;
            summary.paymentsSummary.pix.total += amount;
            break;
          case 'credit':
            summary.paymentsSummary.credit.count++;
            summary.paymentsSummary.credit.total += amount;
            break;
          case 'debit':
            summary.paymentsSummary.debit.count++;
            summary.paymentsSummary.debit.total += amount;
            break;
          case 'cash':
          case 'dinheiro':
            summary.paymentsSummary.cash.count++;
            summary.paymentsSummary.cash.total += amount;
            summary.expectedCash += amount;
            break;
          case 'voucher':
            summary.paymentsSummary.voucher.count++;
            summary.paymentsSummary.voucher.total += amount;
            break;
        }
      }

      return summary;
    },
    enabled: !!company?.id && !!sessionId && !!deviceId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

// Open cash session
export function useOpenSmartPOSCash() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async ({
      deviceId,
      openingBalance,
      operatorName,
      notes,
    }: {
      deviceId: string;
      openingBalance: number;
      operatorName: string;
      notes?: string;
    }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      // Check if there's already an open session
      const { data: existing } = await supabase
        .from('smartpos_cash_sessions')
        .select('id')
        .eq('company_id', company.id)
        .eq('device_id', deviceId)
        .eq('status', 'open')
        .maybeSingle();

      if (existing) {
        throw new Error('Já existe um caixa aberto neste dispositivo');
      }

      const { data, error } = await supabase
        .from('smartpos_cash_sessions')
        .insert({
          company_id: company.id,
          device_id: deviceId,
          opened_by: operatorName,
          opening_balance: openingBalance,
          notes,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SmartPOSCashSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartpos-cash-session-open'] });
      toast.success('Caixa aberto com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao abrir caixa');
    },
  });
}

// Close cash session
export function useCloseSmartPOSCash() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async ({
      sessionId,
      closingBalance,
      summary,
      notes,
    }: {
      sessionId: string;
      closingBalance: number;
      summary: SmartPOSCashSummary;
      notes?: string;
    }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      // Get the current session
      const { data: session, error: sessionError } = await supabase
        .from('smartpos_cash_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      if (!session) throw new Error('Sessão não encontrada');

      const expectedBalance = session.opening_balance + summary.expectedCash;
      const difference = closingBalance - expectedBalance;

      const { data, error } = await supabase
        .from('smartpos_cash_sessions')
        .update({
          closed_at: new Date().toISOString(),
          closing_balance: closingBalance,
          expected_balance: expectedBalance,
          difference,
          status: 'closed',
          total_transactions: summary.totalTransactions,
          total_revenue: summary.totalRevenue,
          payments_summary: summary.paymentsSummary,
          notes,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SmartPOSCashSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['smartpos-cash-session-open'] });
      queryClient.invalidateQueries({ queryKey: ['smartpos-cash-summary'] });

      let message = 'Caixa fechado com sucesso!';
      if (data.difference && Math.abs(data.difference) > 0.01) {
        const tipo = data.difference > 0 ? 'Sobra' : 'Falta';
        message += ` ${tipo} de R$ ${Math.abs(data.difference).toFixed(2)} registrada.`;
      }
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao fechar caixa');
    },
  });
}

// Get session history for a device
export function useSmartPOSCashHistory(deviceId: string | null) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['smartpos-cash-history', deviceId],
    queryFn: async () => {
      if (!company?.id || !deviceId) return [];

      const { data, error } = await supabase
        .from('smartpos_cash_sessions')
        .select('*')
        .eq('company_id', company.id)
        .eq('device_id', deviceId)
        .order('opened_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as unknown as SmartPOSCashSession[];
    },
    enabled: !!company?.id && !!deviceId,
  });
}
