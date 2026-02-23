import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface CashSessionHistory {
  id: string;
  company_id: string;
  opened_by: string;
  opened_at: string;
  opening_balance: number;
  closed_by: string | null;
  closed_at: string | null;
  closing_balance: number | null;
  expected_balance: number | null;
  difference: number | null;
  difference_reason: string | null;
  notes: string | null;
  status: 'open' | 'closed';
  review_status: 'pending' | 'approved' | 'rejected' | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  total_orders: number | null;
  total_revenue: number | null;
  avg_ticket: number | null;
  payments_summary: Record<string, { count: number; total: number }> | null;
  cancel_count: number | null;
  cancel_total: number | null;
  delivery_fee_total: number | null;
  change_given_total: number | null;
  business_date: string; // Data de negócio - sempre a data de ABERTURA do caixa
  // Joined data
  opened_by_profile?: { full_name: string } | null;
  closed_by_profile?: { full_name: string } | null;
}

export interface CashHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  operatorId?: string;
  status?: 'open' | 'closed' | 'all';
  reviewStatus?: 'pending' | 'approved' | 'rejected' | 'all';
}

export function useCashHistory(filters?: CashHistoryFilters) {
  const { data: company } = useCompany();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  // Fetch sessions with filters
  const {
    data: sessions = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    // IMPORTANT: do NOT pass the whole `filters` object directly in queryKey,
    // otherwise a new object each render can cause infinite refetch loops.
    queryKey: [
      'cash-history',
      company?.id,
      filters?.status ?? 'all',
      filters?.reviewStatus ?? 'all',
      filters?.operatorId ?? 'all',
      filters?.startDate ? filters.startDate.toISOString() : null,
      filters?.endDate ? filters.endDate.toISOString() : null,
    ],
    queryFn: async () => {
      if (!company?.id) return [];

      // Keep the list query LIGHT (this page is used a lot)
      let query = supabase
        .from('cash_sessions')
        .select(`
          id,
          company_id,
          opened_by,
          opened_at,
          opening_balance,
          closed_by,
          closed_at,
          closing_balance,
          expected_balance,
          difference,
          difference_reason,
          status,
          review_status,
          reviewed_by,
          reviewed_at,
          review_notes,
          total_orders,
          total_revenue,
          avg_ticket,
          payments_summary,
          cancel_count,
          cancel_total,
          delivery_fee_total,
          change_given_total,
          business_date,
          opened_by_profile:profiles!cash_sessions_opened_by_fkey(full_name),
          closed_by_profile:profiles!cash_sessions_closed_by_fkey(full_name)
        `)
        .eq('company_id', company.id)
        .order('business_date', { ascending: false })
        .order('opened_at', { ascending: false });

      // Apply date filters - agora usando business_date
      if (filters?.startDate) {
        const startStr = filters.startDate.toISOString().split('T')[0];
        query = query.gte('business_date', startStr);
      }
      if (filters?.endDate) {
        const endStr = filters.endDate.toISOString().split('T')[0];
        query = query.lte('business_date', endStr);
      }

      // Apply status filter
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply review status filter
      if (filters?.reviewStatus && filters.reviewStatus !== 'all') {
        query = query.eq('review_status', filters.reviewStatus);
      }

      // Apply operator filter
      if (filters?.operatorId) {
        query = query.or(`opened_by.eq.${filters.operatorId},closed_by.eq.${filters.operatorId}`);
      }

      const { data, error } = await query.limit(30);

      if (error) throw error;
      return data as unknown as CashSessionHistory[];
    },
    enabled: !!company?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Get session details by ID
  const getSessionDetails = async (sessionId: string): Promise<CashSessionHistory | null> => {
    const { data, error } = await supabase
      .from('cash_sessions')
      .select(`
        *,
        opened_by_profile:profiles!cash_sessions_opened_by_fkey(full_name),
        closed_by_profile:profiles!cash_sessions_closed_by_fkey(full_name)
      `)
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Error fetching session details:', error);
      return null;
    }
    return data as unknown as CashSessionHistory;
  };

  // Review session (approve/reject)
  const reviewSession = useMutation({
    mutationFn: async ({
      sessionId,
      reviewStatus,
      reviewNotes,
    }: {
      sessionId: string;
      reviewStatus: 'approved' | 'rejected';
      reviewNotes?: string;
    }) => {
      if (!profile?.id || !company?.id) {
        throw new Error('Usuário não autenticado');
      }

      // Update session
      const { error: updateError } = await supabase
        .from('cash_sessions')
        .update({
          review_status: reviewStatus,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Create audit log
      const { error: auditError } = await supabase
        .from('cash_session_audit_logs')
        .insert({
          company_id: company.id,
          cash_session_id: sessionId,
          action: `review_${reviewStatus}`,
          performed_by: profile.id,
          details: { review_notes: reviewNotes },
        });

      if (auditError) console.error('Failed to create audit log:', auditError);

      return { sessionId, reviewStatus };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cash-history'] });
      toast.success(
        data.reviewStatus === 'approved'
          ? 'Caixa conferido e aprovado'
          : 'Caixa marcado como não conferido'
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao conferir caixa');
    },
  });

  // Log reprint action
  const logReprint = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!profile?.id || !company?.id) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('cash_session_audit_logs')
        .insert({
          company_id: company.id,
          cash_session_id: sessionId,
          action: 'reprint_closing',
          performed_by: profile.id,
        });

      if (error) console.error('Failed to log reprint:', error);
      return sessionId;
    },
  });

  // Create adjustment for surplus/shortage
  const createDifferenceAdjustment = useMutation({
    mutationFn: async ({
      sessionId,
      difference,
      chartAccountId,
    }: {
      sessionId: string;
      difference: number;
      chartAccountId: string;
    }) => {
      if (!profile?.id || !company?.id) {
        throw new Error('Usuário não autenticado');
      }

      const adjustmentType = difference > 0 ? 'sobra' : 'falta';

      const { data, error } = await supabase
        .from('cash_adjustments')
        .insert({
          company_id: company.id,
          cash_session_id: sessionId,
          adjustment_type: adjustmentType,
          amount: Math.abs(difference),
          reason: `${adjustmentType === 'sobra' ? 'Sobra' : 'Falta'} de caixa no fechamento`,
          created_by: profile.id,
          chart_account_id: chartAccountId,
        })
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await supabase
        .from('cash_session_audit_logs')
        .insert({
          company_id: company.id,
          cash_session_id: sessionId,
          action: 'adjustment_created',
          performed_by: profile.id,
          details: { adjustment_type: adjustmentType, amount: Math.abs(difference) },
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-history'] });
      queryClient.invalidateQueries({ queryKey: ['cash-adjustments'] });
      toast.success('Lançamento de ajuste criado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar ajuste');
    },
  });

  // Get or create chart accounts for surplus/shortage
  const getOrCreateChartAccounts = async () => {
    if (!company?.id) return { sobraId: null, faltaId: null };

    // Try to find existing accounts
    const { data: existingAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id, name, code')
      .eq('company_id', company.id)
      .in('code', ['4.1.1.1', '4.1.1.2']);

    let sobraId = existingAccounts?.find(a => a.code === '4.1.1.1')?.id;
    let faltaId = existingAccounts?.find(a => a.code === '4.1.1.2')?.id;

    // If not found, check for parent structure and create
    if (!sobraId || !faltaId) {
      // Get or create parent accounts
      // Level 1: Outras Receitas/Despesas
      let { data: level1 } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', company.id)
        .eq('code', '4')
        .maybeSingle();

      if (!level1) {
        const { data: newL1 } = await supabase
          .from('chart_of_accounts')
          .insert({
            company_id: company.id,
            code: '4',
            name: 'Outras Receitas e Despesas',
            level: 1,
            account_type: 'other',
          })
          .select()
          .single();
        level1 = newL1;
      }

      // Level 2: Ajustes de Caixa
      let { data: level2 } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', company.id)
        .eq('code', '4.1')
        .maybeSingle();

      if (!level2 && level1) {
        const { data: newL2 } = await supabase
          .from('chart_of_accounts')
          .insert({
            company_id: company.id,
            code: '4.1',
            name: 'Ajustes de Caixa',
            level: 2,
            account_type: 'adjustment',
            parent_id: level1.id,
          })
          .select()
          .single();
        level2 = newL2;
      }

      // Level 3: Diferenças de Caixa
      let { data: level3 } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', company.id)
        .eq('code', '4.1.1')
        .maybeSingle();

      if (!level3 && level2) {
        const { data: newL3 } = await supabase
          .from('chart_of_accounts')
          .insert({
            company_id: company.id,
            code: '4.1.1',
            name: 'Diferenças de Caixa',
            level: 3,
            account_type: 'adjustment',
            parent_id: level2.id,
          })
          .select()
          .single();
        level3 = newL3;
      }

      // Level 4: Sobra de Caixa
      if (!sobraId && level3) {
        const { data: newSobra } = await supabase
          .from('chart_of_accounts')
          .insert({
            company_id: company.id,
            code: '4.1.1.1',
            name: 'Sobra de Caixa',
            level: 4,
            account_type: 'income',
            parent_id: level3.id,
          })
          .select()
          .single();
        sobraId = newSobra?.id;
      }

      // Level 4: Falta de Caixa
      if (!faltaId && level3) {
        const { data: newFalta } = await supabase
          .from('chart_of_accounts')
          .insert({
            company_id: company.id,
            code: '4.1.1.2',
            name: 'Falta de Caixa',
            level: 4,
            account_type: 'expense',
            parent_id: level3.id,
          })
          .select()
          .single();
        faltaId = newFalta?.id;
      }
    }

    return { sobraId, faltaId };
  };

  return {
    sessions,
    isLoading,
    isFetching,
    error,
    refetch,
    getSessionDetails,
    reviewSession,
    logReprint,
    createDifferenceAdjustment,
    getOrCreateChartAccounts,
  };
}

export function useCashSessionDetail(sessionId: string | null) {
  const { data: company } = useCompany();

  const { data: session, isLoading, refetch } = useQuery({
    queryKey: ['cash-session-detail', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      const { data, error } = await supabase
        .from('cash_sessions')
        .select(`
        *,
        opened_by_profile:profiles!cash_sessions_opened_by_fkey(full_name),
        closed_by_profile:profiles!cash_sessions_closed_by_fkey(full_name)
      `)
      .eq('id', sessionId)
      .single();

      if (error) throw error;
      return data as unknown as CashSessionHistory;
    },
    enabled: !!sessionId,
  });

  // Get orders for this session
  const { data: orders = [] } = useQuery({
    queryKey: ['cash-session-orders', sessionId],
    queryFn: async () => {
      if (!sessionId || !company?.id) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, total, payment_method, status, created_at, cancelled_at, delivery_fee,
          items:order_items(product_name, quantity, unit_price),
          deliverer:deliverers(name)
        `)
        .eq('cash_session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId && !!company?.id,
  });

  // Get adjustments for this session
  const { data: adjustments = [] } = useQuery({
    queryKey: ['cash-session-adjustments', sessionId],
    queryFn: async () => {
      if (!sessionId || !company?.id) return [];

      const { data, error } = await supabase
        .from('cash_adjustments')
        .select('*')
        .eq('cash_session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId && !!company?.id,
  });

  // Get audit logs for this session
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['cash-session-audit', sessionId],
    queryFn: async () => {
      if (!sessionId || !company?.id) return [];

      const { data, error } = await supabase
        .from('cash_session_audit_logs')
        .select('*')
        .eq('cash_session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId && !!company?.id,
  });

  return {
    session,
    orders,
    adjustments,
    auditLogs,
    isLoading,
    refetch,
  };
}
