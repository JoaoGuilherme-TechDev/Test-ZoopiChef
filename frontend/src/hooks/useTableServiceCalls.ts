import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';

export interface TableServiceCall {
  id: string;
  company_id: string;
  table_number: string;
  comanda_id: string | null;
  tablet_device_id: string | null;
  call_type: 'waiter' | 'bill' | 'help';
  status: 'pending' | 'acknowledged' | 'resolved';
  acknowledged_by: string | null;
  resolved_by: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

export function useTableServiceCalls(status?: string) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['table_service_calls', company?.id, status],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('table_service_calls')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TableServiceCall[];
    },
    enabled: !!company?.id,
    staleTime: 1000 * 15, // 15 segundos
    refetchInterval: 1000 * 30, // OTIMIZAÇÃO: 30 segundos (era 5s)
    refetchOnWindowFocus: false,
  });
}

export function useCreateServiceCall() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (data: {
      table_number: string;
      call_type: 'waiter' | 'bill' | 'help';
      comanda_id?: string;
      tablet_device_id?: string;
    }) => {
      if (!company?.id) throw new Error('Company not found');

      const { data: result, error } = await supabase
        .from('table_service_calls')
        .insert({
          company_id: company.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table_service_calls'] });
    },
  });
}

export function useUpdateServiceCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      acknowledged_by,
      resolved_by,
    }: {
      id: string;
      status: 'acknowledged' | 'resolved';
      acknowledged_by?: string;
      resolved_by?: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'acknowledged') {
        updates.acknowledged_at = new Date().toISOString();
        if (acknowledged_by) updates.acknowledged_by = acknowledged_by;
      }
      
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
        if (resolved_by) updates.resolved_by = resolved_by;
      }

      const { data, error } = await supabase
        .from('table_service_calls')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table_service_calls'] });
    },
  });
}
