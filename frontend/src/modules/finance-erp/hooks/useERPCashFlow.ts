import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import type { CashFlowProjection } from '../types';
import { addDays, format } from 'date-fns';

export function useERPCashFlow(days = 30) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['erp-cashflow', company?.id, days],
    queryFn: async (): Promise<CashFlowProjection[]> => {
      if (!company?.id) return [];

      const today = new Date();
      const endDate = addDays(today, days);
      const startDate = format(today, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Buscar recebíveis futuros
      const { data: receivables } = await supabase
        .from('erp_receivables')
        .select('due_date, amount_cents, paid_amount_cents')
        .eq('company_id', company.id)
        .in('status', ['aberto', 'parcial'])
        .gte('due_date', startDate)
        .lte('due_date', endDateStr);

      // Buscar contas a pagar futuras (tabela original)
      const { data: payables } = await supabase
        .from('accounts_payable')
        .select('due_date, amount_cents')
        .eq('company_id', company.id)
        .eq('status', 'pending')
        .gte('due_date', startDate)
        .lte('due_date', endDateStr);

      // Buscar parcelas futuras
      const { data: installments } = await supabase
        .from('erp_payables_installments')
        .select('due_date, amount_cents')
        .eq('company_id', company.id)
        .in('status', ['aberto', 'atrasado'])
        .gte('due_date', startDate)
        .lte('due_date', endDateStr);

      // Agrupar por data
      const byDate = new Map<string, { receivables: number; payables: number }>();

      // Inicializar todos os dias
      for (let i = 0; i <= days; i++) {
        const date = format(addDays(today, i), 'yyyy-MM-dd');
        byDate.set(date, { receivables: 0, payables: 0 });
      }

      // Somar recebíveis
      receivables?.forEach(r => {
        const date = r.due_date;
        const remaining = (r.amount_cents - (r.paid_amount_cents || 0)) / 100;
        const existing = byDate.get(date);
        if (existing) {
          existing.receivables += remaining;
        }
      });

      // Somar contas a pagar
      payables?.forEach(p => {
        if (p.due_date) {
          const existing = byDate.get(p.due_date);
          if (existing) {
            existing.payables += p.amount_cents / 100;
          }
        }
      });

      // Somar parcelas
      installments?.forEach(i => {
        const existing = byDate.get(i.due_date);
        if (existing) {
          existing.payables += i.amount_cents / 100;
        }
      });

      // Calcular fluxo acumulado
      let cumulative = 0;
      const result: CashFlowProjection[] = [];

      Array.from(byDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([date, data]) => {
          const netFlow = data.receivables - data.payables;
          cumulative += netFlow;
          result.push({
            date,
            receivables: data.receivables,
            payables: data.payables,
            net_flow: netFlow,
            cumulative_balance: cumulative,
          });
        });

      return result;
    },
    enabled: !!company?.id,
  });
}
