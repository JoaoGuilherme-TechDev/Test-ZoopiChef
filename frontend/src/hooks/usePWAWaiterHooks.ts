/**
 * PWA-specific hooks for waiter app
 * 
 * These hooks use WaiterSessionContext instead of Supabase Auth,
 * allowing the waiter PWA to work with PIN-based authentication.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useWaiterSession } from '@/contexts/WaiterSessionContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

// ============================================
// Tables Hook for PWA Waiter
// ============================================

export interface PWATable {
  id: string;
  company_id: string;
  number: number;
  name: string | null;
  active: boolean;
  status: 'available' | 'occupied' | 'reserved';
  capacity: number;
  created_at: string;
  updated_at: string;
}

export function usePWAWaiterTables() {
  const { companyId } = useWaiterSession();
  const queryClient = useQueryClient();

  const { data: tables = [], isLoading, error } = useQuery({
    queryKey: ['pwa-waiter-tables', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('company_id', companyId)
        .order('number', { ascending: true });

      if (error) throw error;
      return data as PWATable[];
    },
    enabled: !!companyId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('pwa-waiter-tables-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pwa-waiter-tables', companyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  return {
    tables,
    activeTables: tables.filter((t) => t.active),
    isLoading,
    error,
  };
}

// ============================================
// Table Sessions Hook for PWA Waiter
// ============================================

export interface PWATableSession {
  id: string;
  company_id: string;
  table_id: string;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'bill_requested' | 'idle_warning' | 'closed';
  total_amount_cents: number;
  people_count: number | null;
  last_activity_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  table?: {
    id: string;
    number: number;
    name: string | null;
  };
}

export function usePWAWaiterTableSessions() {
  const { companyId } = useWaiterSession();
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ['pwa-waiter-table-sessions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('table_sessions')
        .select('*, table:tables(id, number, name)')
        .eq('company_id', companyId)
        .neq('status', 'closed')
        .order('opened_at', { ascending: false });

      if (error) throw error;
      return data as PWATableSession[];
    },
    enabled: !!companyId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('pwa-waiter-sessions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_sessions',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pwa-waiter-table-sessions', companyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  // Open table mutation - uses the atomic RPC with table number
  const openTable = useMutation({
    mutationFn: async ({ tableId }: { tableId: string }) => {
      if (!companyId) throw new Error('No company');

      // First get the table number
      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('number')
        .eq('id', tableId)
        .single();

      if (tableError || !tableData) throw new Error('Mesa não encontrada');

      // Use atomic RPC to get or create session
      const { data: sessionId, error: rpcError } = await supabase.rpc('get_or_create_table_session', {
        p_company_id: companyId,
        p_table_number: tableData.number,
        p_user_id: null
      });

      if (rpcError) throw rpcError;
      
      // Fetch the created session
      const { data: session, error: fetchError } = await supabase
        .from('table_sessions')
        .select('*, table:tables(id, number, name)')
        .eq('id', sessionId)
        .single();
        
      if (fetchError) throw fetchError;
      return session as PWATableSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-table-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-tables'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao abrir mesa: ' + error.message);
    },
  });

  // Request bill mutation
  const requestBill = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('table_sessions')
        .update({ status: 'bill_requested' })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-table-sessions'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao solicitar conta: ' + error.message);
    },
  });

  // Update session status
  const updateSessionStatus = useMutation({
    mutationFn: async ({
      sessionId,
      status,
      peopleCount
    }: {
      sessionId: string;
      status: 'open' | 'bill_requested' | 'closed';
      peopleCount?: number;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'closed') {
        updates.closed_at = new Date().toISOString();
      }
      if (peopleCount !== undefined) {
        updates.people_count = peopleCount;
      }

      const { error } = await supabase
        .from('table_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-table-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-tables'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar sessão: ' + error.message);
    },
  });

  return {
    sessions,
    isLoading,
    error,
    openTable,
    requestBill,
    updateSessionStatus,
  };
}

// ============================================
// Comandas Hook for PWA Waiter
// ============================================

export type PWAComandaStatus = 'free' | 'open' | 'no_activity' | 'requested_bill' | 'closed';

export interface PWAComanda {
  id: string;
  company_id: string;
  command_number: number;
  name: string | null;
  status: PWAComandaStatus;
  opened_at: string;
  closed_at: string | null;
  total_amount: number;
}

export function usePWAWaiterComandas(statusFilter?: PWAComandaStatus[]) {
  const { companyId } = useWaiterSession();
  const queryClient = useQueryClient();

  const { data: comandas = [], isLoading, error } = useQuery({
    queryKey: ['pwa-waiter-comandas', companyId, statusFilter],
    queryFn: async (): Promise<PWAComanda[]> => {
      if (!companyId) return [];
      
      const statusList = statusFilter && statusFilter.length > 0 
        ? statusFilter 
        : ['free', 'open', 'no_activity', 'requested_bill'];
      
      const { data, error } = await supabase
        .from('comandas')
        .select('id, company_id, command_number, name, status, opened_at, closed_at, total_amount')
        .eq('company_id', companyId)
        .in('status', statusList)
        .order('command_number', { ascending: true });

      if (error) throw error;
      return (data || []) as PWAComanda[];
    },
    enabled: !!companyId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('pwa-waiter-comandas-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comandas',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pwa-waiter-comandas', companyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  // Create comanda mutation - uses RPC to get next number
  const createComanda = useMutation({
    mutationFn: async ({
      name,
      applyServiceFee,
      serviceFeePercent
    }: {
      name?: string;
      applyServiceFee?: boolean;
      serviceFeePercent?: number;
    }) => {
      if (!companyId) throw new Error('No company');

      // Get next command number
      const { data: nextNumber, error: numError } = await supabase
        .rpc('get_next_comanda_number', { p_company_id: companyId });

      if (numError) throw numError;

      const { data, error } = await supabase
        .from('comandas')
        .insert({
          company_id: companyId,
          command_number: nextNumber,
          name: name || null,
          apply_service_fee: applyServiceFee ?? false,
          service_fee_percent: serviceFeePercent ?? 10,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data as PWAComanda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-comandas'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar comanda: ' + error.message);
    },
  });

  return {
    comandas,
    isLoading,
    error,
    createComanda,
  };
}

// ============================================
// Waitlist Hook for PWA Waiter
// ============================================

export interface PWAWaitlistEntry {
  id: string;
  company_id: string;
  customer_name: string;
  customer_phone: string | null;
  party_size: number;
  requested_at: string;
  status: 'waiting' | 'notified' | 'seated' | 'cancelled' | 'no_show';
  special_requests: string | null;
  notified_at: string | null;
  priority_score: number;
}

export function usePWAWaiterWaitlist() {
  const { companyId } = useWaiterSession();
  const queryClient = useQueryClient();
  const { tables } = usePWAWaiterTables();
  const { sessions } = usePWAWaiterTableSessions();
  const { hasReservation } = usePWATableReservationsWithCompany(companyId);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['pwa-waiter-waitlist', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('smart_waitlist')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['waiting', 'notified'])
        .order('priority_score', { ascending: false })
        .order('requested_at', { ascending: true });

      if (error) throw error;
      return data as PWAWaitlistEntry[];
    },
    enabled: !!companyId,
    refetchInterval: 15000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('pwa-waiter-waitlist-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'smart_waitlist',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pwa-waiter-waitlist', companyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  // Available tables - excludes occupied AND reserved tables
  const availableTables = tables
    .filter((t) => t.active)
    .filter((t) => {
      // Exclude tables with active sessions
      const hasSession = sessions.some((s) => s.table_id === t.id);
      if (hasSession) return false;
      
      // Exclude tables with active reservations
      if (hasReservation(t.id)) return false;
      
      return true;
    })
    .map((t) => ({
      id: t.id,
      number: t.number,
      name: t.name,
      capacity: t.capacity || 4,
    }));

  // Add to waitlist
  const addToWaitlist = useMutation({
    mutationFn: async (entry: {
      customer_name: string;
      customer_phone?: string;
      party_size: number;
      special_requests?: string;
    }) => {
      if (!companyId) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('smart_waitlist')
        .insert({
          company_id: companyId,
          customer_name: entry.customer_name.trim(),
          customer_phone: entry.customer_phone?.trim() || null,
          party_size: entry.party_size,
          special_requests: entry.special_requests?.trim() || null,
          status: 'waiting',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-waitlist'] });
      toast.success('Cliente adicionado à fila');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });

  // Notify customer
  const notifyCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('smart_waitlist')
        .update({
          status: 'notified',
          notified_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-waitlist'] });
      toast.success('Cliente notificado');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });

  // Seat customer
  const seatCustomer = useMutation({
    mutationFn: async ({ waitlistId, tableId }: { waitlistId: string; tableId: string }) => {
      if (!companyId) throw new Error('No company');

      const { data, error } = await supabase.rpc('assign_table_to_waitlist', {
        p_waitlist_id: waitlistId,
        p_table_id: tableId,
        p_company_id: companyId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; table_number?: number; customer_name?: string; command_number?: number };
      if (!result.success) throw new Error(result.error || 'Falha ao atribuir mesa');
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-waitlist'] });
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-tables'] });
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-table-sessions'] });
      toast.success(`${result.customer_name || 'Cliente'} acomodado na mesa ${result.table_number}`);
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });

  // Cancel entry
  const cancelEntry = useMutation({
    mutationFn: async ({ id, noShow }: { id: string; noShow?: boolean }) => {
      const { error } = await supabase
        .from('smart_waitlist')
        .update({
          status: noShow ? 'no_show' : 'cancelled',
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-waitlist'] });
      toast.success(vars.noShow ? 'Marcado como não compareceu' : 'Entrada cancelada');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });

  return {
    entries,
    isLoading,
    availableTables,
    addToWaitlist,
    notifyCustomer,
    seatCustomer,
    cancelEntry,
  };
}

// ============================================
// HOOKS WITH EXPLICIT COMPANY ID
// These are for use with WaiterPWALayout, which provides companyId directly
// rather than through WaiterSessionContext
// ============================================

/**
 * Tables hook with explicit companyId - for use with WaiterPWALayout
 */
export function usePWAWaiterTablesWithCompany(companyId: string | null) {
  const queryClient = useQueryClient();

  const { data: tables = [], isLoading, error } = useQuery({
    queryKey: ['pwa-waiter-tables', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('company_id', companyId)
        .order('number', { ascending: true });

      if (error) throw error;
      return data as PWATable[];
    },
    enabled: !!companyId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('pwa-waiter-tables-realtime-' + companyId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pwa-waiter-tables', companyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  return {
    tables,
    activeTables: tables.filter((t) => t.active),
    isLoading,
    error,
  };
}

/**
 * Table sessions hook with explicit companyId - for use with WaiterPWALayout
 */
export function usePWAWaiterTableSessionsWithCompany(companyId: string | null) {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ['pwa-waiter-table-sessions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('table_sessions')
        .select('*, table:tables(id, number, name)')
        .eq('company_id', companyId)
        .neq('status', 'closed')
        .order('opened_at', { ascending: false });

      if (error) throw error;
      return data as PWATableSession[];
    },
    enabled: !!companyId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('pwa-waiter-sessions-realtime-' + companyId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_sessions',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pwa-waiter-table-sessions', companyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  // Open table mutation
  const openTable = useMutation({
    mutationFn: async ({ tableId }: { tableId: string }) => {
      if (!companyId) throw new Error('No company');

      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('number')
        .eq('id', tableId)
        .single();

      if (tableError || !tableData) throw new Error('Mesa não encontrada');

      const { data: sessionId, error: rpcError } = await supabase.rpc('get_or_create_table_session', {
        p_company_id: companyId,
        p_table_number: tableData.number,
        p_user_id: null
      });

      if (rpcError) throw rpcError;
      
      const { data: session, error: fetchError } = await supabase
        .from('table_sessions')
        .select('*, table:tables(id, number, name)')
        .eq('id', sessionId)
        .single();
        
      if (fetchError) throw fetchError;
      return session as PWATableSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-table-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-tables'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao abrir mesa: ' + error.message);
    },
  });

  // Request bill mutation
  const requestBill = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('table_sessions')
        .update({ status: 'bill_requested' })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-table-sessions'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao solicitar conta: ' + error.message);
    },
  });

  // Update session status
  const updateSessionStatus = useMutation({
    mutationFn: async ({
      sessionId,
      status,
      peopleCount
    }: {
      sessionId: string;
      status: 'open' | 'bill_requested' | 'closed';
      peopleCount?: number;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'closed') {
        updates.closed_at = new Date().toISOString();
      }
      if (peopleCount !== undefined) {
        updates.people_count = peopleCount;
      }

      const { error } = await supabase
        .from('table_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-table-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-tables'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar sessão: ' + error.message);
    },
  });

  return {
    sessions,
    isLoading,
    error,
    openTable,
    requestBill,
    updateSessionStatus,
  };
}

/**
 * Comandas hook with explicit companyId - for use with WaiterPWALayout
 */
/**
 * Comanda settings hook with explicit companyId - for use with WaiterPWALayout
 */
export interface PWAComandaSettings {
  company_id: string;
  no_activity_minutes: number;
  default_service_fee_percent: number;
  allow_close_with_balance: boolean;
}

export function usePWAComandaSettingsWithCompany(companyId: string | null) {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['pwa-comanda-settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('comanda_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      
      // Return defaults if not found
      if (!data) {
        return {
          company_id: companyId,
          no_activity_minutes: 30,
          default_service_fee_percent: 10,
          allow_close_with_balance: false,
        } as PWAComandaSettings;
      }

      return data as PWAComandaSettings;
    },
    enabled: !!companyId,
  });

  return { settings, isLoading };
}

export function usePWAWaiterComandasWithCompany(companyId: string | null, statusFilter?: PWAComandaStatus[]) {
  const queryClient = useQueryClient();

  const { data: comandas = [], isLoading, error } = useQuery({
    queryKey: ['pwa-waiter-comandas', companyId, statusFilter],
    queryFn: async (): Promise<PWAComanda[]> => {
      if (!companyId) return [];
      
      const statusList = statusFilter && statusFilter.length > 0 
        ? statusFilter 
        : ['free', 'open', 'no_activity', 'requested_bill'];
      
      const { data, error } = await supabase
        .from('comandas')
        .select('id, company_id, command_number, name, status, opened_at, closed_at, total_amount')
        .eq('company_id', companyId)
        .in('status', statusList)
        .order('command_number', { ascending: true });

      if (error) throw error;
      return (data || []) as PWAComanda[];
    },
    enabled: !!companyId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('pwa-waiter-comandas-realtime-' + companyId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comandas',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pwa-waiter-comandas', companyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  // Create comanda mutation
  const createComanda = useMutation({
    mutationFn: async ({
      name,
      applyServiceFee,
      serviceFeePercent
    }: {
      name?: string;
      applyServiceFee?: boolean;
      serviceFeePercent?: number;
    }) => {
      if (!companyId) throw new Error('No company');

      const { data: nextNumber, error: numError } = await supabase
        .rpc('get_next_comanda_number', { p_company_id: companyId });

      if (numError) throw numError;

      const { data, error } = await supabase
        .from('comandas')
        .insert({
          company_id: companyId,
          command_number: nextNumber,
          name: name || null,
          apply_service_fee: applyServiceFee ?? false,
          service_fee_percent: serviceFeePercent ?? 10,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data as PWAComanda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-comandas'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar comanda: ' + error.message);
    },
  });

  return {
    comandas,
    isLoading,
    error,
    createComanda,
  };
}

/**
 * Waitlist hook with explicit companyId - for use with WaiterPWALayout
 */
export function usePWAWaiterWaitlistWithCompany(companyId: string | null) {
  const queryClient = useQueryClient();
  const { tables } = usePWAWaiterTablesWithCompany(companyId);
  const { sessions } = usePWAWaiterTableSessionsWithCompany(companyId);
  const { hasReservation } = usePWATableReservationsWithCompany(companyId);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['pwa-waiter-waitlist', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('smart_waitlist')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['waiting', 'notified'])
        .order('priority_score', { ascending: false })
        .order('requested_at', { ascending: true });

      if (error) throw error;
      return data as PWAWaitlistEntry[];
    },
    enabled: !!companyId,
    refetchInterval: 15000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('pwa-waiter-waitlist-realtime-' + companyId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'smart_waitlist',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pwa-waiter-waitlist', companyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  // Available tables - excludes occupied AND reserved tables
  const availableTables = tables
    .filter((t) => t.active)
    .filter((t) => {
      // Exclude tables with active sessions
      const hasSession = sessions.some((s) => s.table_id === t.id);
      if (hasSession) return false;
      
      // Exclude tables with active reservations
      if (hasReservation(t.id)) return false;
      
      return true;
    })
    .map((t) => ({
      id: t.id,
      number: t.number,
      name: t.name,
      capacity: t.capacity || 4,
    }));

  // Add to waitlist
  const addToWaitlist = useMutation({
    mutationFn: async (entry: {
      customer_name: string;
      customer_phone?: string;
      party_size: number;
      special_requests?: string;
    }) => {
      if (!companyId) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('smart_waitlist')
        .insert({
          company_id: companyId,
          customer_name: entry.customer_name.trim(),
          customer_phone: entry.customer_phone?.trim() || null,
          party_size: entry.party_size,
          special_requests: entry.special_requests?.trim() || null,
          status: 'waiting',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-waitlist'] });
      toast.success('Cliente adicionado à fila');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });

  // Notify customer
  const notifyCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('smart_waitlist')
        .update({
          status: 'notified',
          notified_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-waitlist'] });
      toast.success('Cliente notificado');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });

  // Seat customer
  const seatCustomer = useMutation({
    mutationFn: async ({ waitlistId, tableId }: { waitlistId: string; tableId: string }) => {
      if (!companyId) throw new Error('No company');

      const { data, error } = await supabase.rpc('assign_table_to_waitlist', {
        p_waitlist_id: waitlistId,
        p_table_id: tableId,
        p_company_id: companyId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; table_number?: number; customer_name?: string; command_number?: number };
      if (!result.success) throw new Error(result.error || 'Falha ao atribuir mesa');
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-waitlist'] });
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-tables'] });
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-table-sessions'] });
      toast.success(`${result.customer_name || 'Cliente'} acomodado na mesa ${result.table_number}`);
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });

  // Cancel entry
  const cancelEntry = useMutation({
    mutationFn: async ({ id, noShow }: { id: string; noShow?: boolean }) => {
      const { error } = await supabase
        .from('smart_waitlist')
        .update({
          status: noShow ? 'no_show' : 'cancelled',
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['pwa-waiter-waitlist'] });
      toast.success(vars.noShow ? 'Marcado como não compareceu' : 'Entrada cancelada');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });

  return {
    entries,
    isLoading,
    availableTables,
    addToWaitlist,
    notifyCustomer,
    seatCustomer,
    cancelEntry,
  };
}

// ============================================
// Table Reservations Hook for PWA Waiter
// ============================================

export interface PWATableReservation {
  id: string;
  company_id: string;
  table_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_cpf: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  reservation_reason: string | null;
  notes: string | null;
  special_requests: string | null;
  table?: { id: string; number: number; name: string | null };
}

/**
 * Today's table reservations hook with explicit companyId - for use with WaiterPWALayout
 */
export function usePWATableReservationsWithCompany(companyId: string | null) {
  const queryClient = useQueryClient();
  
  // Get today's date in yyyy-MM-dd format
  const today = new Date().toISOString().split('T')[0];

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['pwa-table-reservations', companyId, today],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          company_id,
          table_id,
          customer_name,
          customer_phone,
          customer_email,
          customer_cpf,
          party_size,
          reservation_date,
          reservation_time,
          duration_minutes,
          status,
          reservation_reason,
          notes,
          special_requests,
          table:tables(id, number, name)
        `)
        .eq('company_id', companyId)
        .eq('reservation_date', today)
        .in('status', ['pending', 'confirmed'])
        .order('reservation_time', { ascending: true });

      if (error) throw error;
      return (data || []) as PWATableReservation[];
    },
    enabled: !!companyId,
    staleTime: 1000 * 20,
    refetchInterval: 1000 * 60,
  });

  // Realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('pwa-table-reservations-realtime-' + companyId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pwa-table-reservations', companyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  // Get reservations grouped by table_id
  const reservationsByTable = reservations.reduce((acc, res) => {
    if (res.table_id) {
      if (!acc[res.table_id]) {
        acc[res.table_id] = [];
      }
      acc[res.table_id].push(res);
    }
    return acc;
  }, {} as Record<string, PWATableReservation[]>);

  // Get the active/next reservation for a table
  const getActiveReservation = (tableId: string): PWATableReservation | null => {
    const tableReservations = reservationsByTable[tableId] || [];
    if (tableReservations.length === 0) return null;

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeMinutes = currentHours * 60 + currentMinutes;

    // Find a reservation that is currently active or upcoming within 30 minutes
    for (const res of tableReservations) {
      const [hours, minutes] = res.reservation_time.slice(0, 5).split(':').map(Number);
      const resTimeMinutes = hours * 60 + minutes;
      const endTimeMinutes = resTimeMinutes + (res.duration_minutes || 120);
      const startWindowMinutes = resTimeMinutes - 30;

      // Reservation is active if current time is within the reservation window
      // Or if it's upcoming within 30 minutes
      if (currentTimeMinutes >= startWindowMinutes && currentTimeMinutes < endTimeMinutes) {
        return res;
      }
    }

    // If no active reservation, return the next one
    return tableReservations[0] || null;
  };

  // Check if a table has a reservation
  const hasReservation = (tableId: string): boolean => {
    return (reservationsByTable[tableId]?.length || 0) > 0;
  };

  return {
    reservations,
    reservationsByTable,
    getActiveReservation,
    hasReservation,
    isLoading,
  };
}
