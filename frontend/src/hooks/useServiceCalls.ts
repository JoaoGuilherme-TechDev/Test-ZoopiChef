import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export interface ServiceCall {
  id: string;
  company_id: string;
  qr_session_id: string;
  call_type: 'waiter' | 'bill';
  table_number: number | null;
  comanda_number: number | null;
  customer_name: string;
  status: 'pending' | 'acknowledged' | 'completed';
  payment_preference: 'pix' | 'other' | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  completed_at: string | null;
  created_at: string;
}

export function useServiceCalls(statusFilter: ('pending' | 'acknowledged')[] = ['pending']) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: calls = [], isLoading, error } = useQuery({
    queryKey: ['service-calls', company?.id, statusFilter],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('service_calls')
        .select('*')
        .eq('company_id', company.id)
        .in('status', statusFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ServiceCall[];
    },
    enabled: !!company?.id,
    refetchInterval: 10000, // Refetch a cada 10 segundos
  });

  // Real-time subscription
  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel('service-calls-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_calls',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['service-calls', company.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, queryClient]);

  // Acknowledger uma chamada
  const acknowledgeCall = async (callId: string) => {
    const { error } = await supabase
      .from('service_calls')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', callId);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['service-calls'] });
  };

  // Completar uma chamada
  const completeCall = async (callId: string) => {
    const { error } = await supabase
      .from('service_calls')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', callId);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['service-calls'] });
  };

  // Contagem de chamadas pendentes
  const pendingCount = calls.filter(c => c.status === 'pending').length;
  const waiterCalls = calls.filter(c => c.call_type === 'waiter');
  const billCalls = calls.filter(c => c.call_type === 'bill');

  return {
    calls,
    isLoading,
    error,
    pendingCount,
    waiterCalls,
    billCalls,
    acknowledgeCall,
    completeCall,
  };
}
