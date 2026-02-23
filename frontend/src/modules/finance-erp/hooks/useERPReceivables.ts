import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ERPReceivable, ERPFilters } from '../types';

export function useERPReceivables(filters?: ERPFilters) {
  const { data: company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const receivables = useQuery({
    queryKey: ['erp-receivables', company?.id, filters],
    queryFn: async (): Promise<ERPReceivable[]> => {
      if (!company?.id) return [];

      let query = supabase
        .from('erp_receivables')
        .select(`
          *,
          customers:customer_id(name),
          chart_of_accounts:category_id(name),
          cost_centers:cost_center_id(name)
        `)
        .eq('company_id', company.id)
        .order('due_date', { ascending: true });

      if (filters?.startDate) {
        query = query.gte('due_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('due_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((r: any) => ({
        ...r,
        status: r.status as ERPReceivable['status'],
        origin: r.origin as ERPReceivable['origin'],
        customer_name: r.customers?.name,
        category_name: r.chart_of_accounts?.name,
        cost_center_name: r.cost_centers?.name,
      }));
    },
    enabled: !!company?.id,
  });

  const createReceivable = useMutation({
    mutationFn: async (data: Partial<ERPReceivable>) => {
      if (!company?.id || !user?.id) throw new Error('Sem empresa/usuário');

      const { data: created, error } = await supabase
        .from('erp_receivables')
        .insert({
          company_id: company.id,
          description: data.description || '',
          amount_cents: data.amount_cents || 0,
          due_date: data.due_date || new Date().toISOString().split('T')[0],
          customer_id: data.customer_id,
          order_id: data.order_id,
          category_id: data.category_id,
          cost_center_id: data.cost_center_id,
          origin: data.origin || 'manual',
          notes: data.notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('erp_payment_history').insert({
        company_id: company.id,
        reference_type: 'receivable',
        reference_id: created.id,
        action: 'criado',
        amount_cents: data.amount_cents || 0,
        new_status: 'aberto',
        origin: 'manual',
        performed_by: user.id,
      });

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-receivables'] });
      toast.success('Recebível criado!');
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const receivePayment = useMutation({
    mutationFn: async ({ 
      id, 
      amount_cents, 
      payment_method 
    }: { 
      id: string; 
      amount_cents: number; 
      payment_method?: string;
    }) => {
      if (!company?.id || !user?.id) throw new Error('Sem empresa/usuário');

      // Buscar recebível atual
      const { data: current, error: fetchError } = await supabase
        .from('erp_receivables')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newPaidAmount = (current.paid_amount_cents || 0) + amount_cents;
      const totalAmount = current.amount_cents;
      const newStatus = newPaidAmount >= totalAmount ? 'recebido' : 'parcial';

      const { error } = await supabase
        .from('erp_receivables')
        .update({
          paid_amount_cents: newPaidAmount,
          status: newStatus,
          payment_method: payment_method || current.payment_method,
          received_at: newStatus === 'recebido' ? new Date().toISOString() : null,
          received_by: newStatus === 'recebido' ? user.id : null,
        })
        .eq('id', id);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('erp_payment_history').insert({
        company_id: company.id,
        reference_type: 'receivable',
        reference_id: id,
        action: newStatus === 'recebido' ? 'recebido' : 'parcial',
        amount_cents,
        previous_status: current.status,
        new_status: newStatus,
        origin: 'manual',
        performed_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-receivables'] });
      toast.success('Recebimento registrado!');
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const cancelReceivable = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      if (!company?.id || !user?.id) throw new Error('Sem empresa/usuário');

      const { data: current } = await supabase
        .from('erp_receivables')
        .select('status')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('erp_receivables')
        .update({
          status: 'cancelado',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id,
          cancel_reason: reason,
        })
        .eq('id', id);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('erp_payment_history').insert({
        company_id: company.id,
        reference_type: 'receivable',
        reference_id: id,
        action: 'cancelado',
        amount_cents: 0,
        previous_status: current?.status,
        new_status: 'cancelado',
        origin: 'manual',
        performed_by: user.id,
        notes: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-receivables'] });
      toast.success('Recebível cancelado');
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  // Totais
  const totals = {
    total: receivables.data?.reduce((sum, r) => sum + r.amount_cents, 0) || 0,
    open: receivables.data
      ?.filter(r => r.status === 'aberto' || r.status === 'parcial')
      .reduce((sum, r) => sum + (r.amount_cents - r.paid_amount_cents), 0) || 0,
    received: receivables.data
      ?.filter(r => r.status === 'recebido')
      .reduce((sum, r) => sum + r.amount_cents, 0) || 0,
    overdue: receivables.data
      ?.filter(r => (r.status === 'aberto' || r.status === 'parcial') && 
                    new Date(r.due_date) < new Date())
      .reduce((sum, r) => sum + (r.amount_cents - r.paid_amount_cents), 0) || 0,
  };

  return {
    receivables: receivables.data || [],
    isLoading: receivables.isLoading,
    totals,
    createReceivable,
    receivePayment,
    cancelReceivable,
  };
}
