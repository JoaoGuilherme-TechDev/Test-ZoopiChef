import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { EmployeeCommission } from '../types';

export function useEmployeeCommissions() {
  const { data: company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const commissionsQuery = useQuery({
    queryKey: ['employee-commissions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('employee_commissions')
        .select('*, employee:employees(name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as EmployeeCommission[];
    },
    enabled: !!company?.id,
  });

  const calculateCommissions = useMutation({
    mutationFn: async ({ periodStart, periodEnd }: { periodStart: string; periodEnd: string }) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Get all active employees with commission
      const { data: employees, error: empError } = await (supabase as any)
        .from('employees')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .neq('commission_type', 'none');
      if (empError) throw empError;

      // Get sales in period grouped by employee
      const { data: sales, error: salesError } = await (supabase as any)
        .from('employee_sales')
        .select('employee_id, sale_amount_cents')
        .eq('company_id', company.id)
        .gte('sale_date', periodStart)
        .lte('sale_date', periodEnd);
      if (salesError) throw salesError;

      // Group sales by employee
      const salesByEmployee: Record<string, { total: number; count: number }> = {};
      for (const sale of sales || []) {
        if (!salesByEmployee[sale.employee_id]) {
          salesByEmployee[sale.employee_id] = { total: 0, count: 0 };
        }
        salesByEmployee[sale.employee_id].total += sale.sale_amount_cents;
        salesByEmployee[sale.employee_id].count += 1;
      }

      // Calculate commissions
      for (const emp of employees || []) {
        const empSales = salesByEmployee[emp.id] || { total: 0, count: 0 };
        let commission = 0;

        switch (emp.commission_type) {
          case 'fixed':
            commission = empSales.count * (emp.fixed_commission_cents || 0);
            break;
          case 'percent_sales':
            commission = Math.round(empSales.total * (emp.commission_percent || 0) / 100);
            break;
          case 'percent_orders':
            commission = Math.round(empSales.count * (emp.commission_percent || 0) * 100);
            break;
        }

        if (commission > 0 || empSales.total > 0) {
          await (supabase as any)
            .from('employee_commissions')
            .insert({
              company_id: company.id,
              employee_id: emp.id,
              period_start: periodStart,
              period_end: periodEnd,
              total_sales_cents: empSales.total,
              total_orders: empSales.count,
              commission_cents: commission,
              status: 'pending',
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-commissions'] });
      toast.success('Comissões calculadas com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao calcular comissões: ' + error.message);
    },
  });

  const payCommission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('employee_commissions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_by: user?.id,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-commissions'] });
      toast.success('Comissão marcada como paga');
    },
    onError: (error: any) => {
      toast.error('Erro ao pagar comissão: ' + error.message);
    },
  });

  return {
    commissions: commissionsQuery.data || [],
    isLoading: commissionsQuery.isLoading,
    calculateCommissions,
    payCommission,
  };
}
