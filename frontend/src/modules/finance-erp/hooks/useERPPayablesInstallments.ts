import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ERPPayableInstallment, InstallmentConfig, ERPFilters } from '../types';
import { addDays, format } from 'date-fns';

export function useERPPayablesInstallments(filters?: ERPFilters) {
  const { data: company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const installments = useQuery({
    queryKey: ['erp-payables-installments', company?.id, filters],
    queryFn: async (): Promise<ERPPayableInstallment[]> => {
      if (!company?.id) return [];

      let query = supabase
        .from('erp_payables_installments')
        .select(`
          *,
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

      return (data || []).map((i: any) => ({
        ...i,
        status: i.status as ERPPayableInstallment['status'],
        category_name: i.chart_of_accounts?.name,
        cost_center_name: i.cost_centers?.name,
      }));
    },
    enabled: !!company?.id,
  });

  // Criar parcelas recorrentes
  const createInstallments = useMutation({
    mutationFn: async (config: InstallmentConfig) => {
      if (!company?.id || !user?.id) throw new Error('Sem empresa/usuário');

      const installmentsToCreate: Array<{
        company_id: string;
        description: string;
        amount_cents: number;
        due_date: string;
        installment_number: number;
        total_installments: number;
        category_id: string | null;
        cost_center_id: string | null;
        status: string;
        created_by: string;
      }> = [];
      const startDate = new Date(config.start_date);

      for (let i = 0; i < config.repeat_count; i++) {
        const dueDate = addDays(startDate, i * config.interval_days);
        installmentsToCreate.push({
          company_id: company.id,
          description: `${config.description} (${i + 1}/${config.repeat_count})`,
          amount_cents: config.amount_cents,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          installment_number: i + 1,
          total_installments: config.repeat_count,
          category_id: config.category_id || null,
          cost_center_id: config.cost_center_id || null,
          status: 'aberto',
          created_by: user.id,
        });
      }

      const { data, error } = await supabase
        .from('erp_payables_installments')
        .insert(installmentsToCreate)
        .select();

      if (error) throw error;

      // Registrar no histórico
      for (const inst of data || []) {
        await supabase.from('erp_payment_history').insert({
          company_id: company.id,
          reference_type: 'installment',
          reference_id: inst.id,
          action: 'criado',
          amount_cents: inst.amount_cents,
          new_status: 'aberto',
          origin: 'manual',
          performed_by: user.id,
        });
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['erp-payables-installments'] });
      toast.success(`${data?.length || 0} parcelas criadas!`);
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  // Pagar parcela
  const payInstallment = useMutation({
    mutationFn: async ({ 
      id, 
      payment_method 
    }: { 
      id: string; 
      payment_method?: string;
    }) => {
      if (!company?.id || !user?.id) throw new Error('Sem empresa/usuário');

      const { data: current } = await supabase
        .from('erp_payables_installments')
        .select('status, amount_cents')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('erp_payables_installments')
        .update({
          status: 'pago',
          paid_at: new Date().toISOString(),
          paid_by: user.id,
          payment_method,
        })
        .eq('id', id);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('erp_payment_history').insert({
        company_id: company.id,
        reference_type: 'installment',
        reference_id: id,
        action: 'pago',
        amount_cents: current?.amount_cents || 0,
        previous_status: current?.status,
        new_status: 'pago',
        origin: 'manual',
        performed_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-payables-installments'] });
      toast.success('Parcela paga!');
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  // Estornar pagamento
  const unpayInstallment = useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id || !user?.id) throw new Error('Sem empresa/usuário');

      const { data: current } = await supabase
        .from('erp_payables_installments')
        .select('status, amount_cents')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('erp_payables_installments')
        .update({
          status: 'aberto',
          paid_at: null,
          paid_by: null,
          payment_method: null,
        })
        .eq('id', id);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('erp_payment_history').insert({
        company_id: company.id,
        reference_type: 'installment',
        reference_id: id,
        action: 'estornado',
        amount_cents: current?.amount_cents || 0,
        previous_status: current?.status,
        new_status: 'aberto',
        origin: 'manual',
        performed_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-payables-installments'] });
      toast.success('Pagamento estornado');
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  // Totais
  const totals = {
    total: installments.data?.reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    open: installments.data
      ?.filter(i => i.status === 'aberto' || i.status === 'atrasado')
      .reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    paid: installments.data
      ?.filter(i => i.status === 'pago')
      .reduce((sum, i) => sum + i.amount_cents, 0) || 0,
    overdue: installments.data
      ?.filter(i => i.status !== 'pago' && i.status !== 'cancelado' && 
                    new Date(i.due_date) < new Date())
      .reduce((sum, i) => sum + i.amount_cents, 0) || 0,
  };

  return {
    installments: installments.data || [],
    isLoading: installments.isLoading,
    totals,
    createInstallments,
    payInstallment,
    unpayInstallment,
  };
}
