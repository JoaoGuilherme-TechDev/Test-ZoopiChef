import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import type { ERPDashboardData } from '../types';
import { startOfMonth, endOfMonth, format, addDays } from 'date-fns';

export function useERPDashboard() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['erp-dashboard', company?.id],
    queryFn: async (): Promise<ERPDashboardData | null> => {
      if (!company?.id) return null;

      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
      const next7Days = format(addDays(today, 7), 'yyyy-MM-dd');

      // Receita hoje
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${todayStr}T00:00:00`)
        .lte('created_at', `${todayStr}T23:59:59`)
        .is('cancelled_at', null);

      const receitaHoje = todayOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      // Receita mês
      const { data: monthOrders } = await supabase
        .from('orders')
        .select('id, total')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${monthStart}T00:00:00`)
        .lte('created_at', `${monthEnd}T23:59:59`)
        .is('cancelled_at', null);

      const receitaMes = monthOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      // CMV mês (simplificado - requer custos cadastrados)
      let cmvMes = 0;
      if (monthOrders?.length) {
        const orderIds = monthOrders.map(o => o.id);
        const { data: items } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .in('order_id', orderIds);

        const { data: costs } = await supabase
          .from('erp_product_costs')
          .select('product_id, unit_cost_cents, optional_cost_cents')
          .eq('company_id', company.id)
          .is('effective_to', null);

        const costsMap = new Map(costs?.map(c => [c.product_id, c]) || []);

        items?.forEach(item => {
          const cost = costsMap.get(item.product_id);
          if (cost) {
            cmvMes += ((cost.unit_cost_cents + cost.optional_cost_cents) / 100) * (item.quantity || 1);
          }
        });
      }

      // Lucro mês (simplificado: receita - CMV)
      const lucroMes = receitaMes - cmvMes;

      // Contas a pagar abertas
      const { data: payables } = await supabase
        .from('accounts_payable')
        .select('amount_cents')
        .eq('company_id', company.id)
        .eq('status', 'pending');

      const { data: installments } = await supabase
        .from('erp_payables_installments')
        .select('amount_cents')
        .eq('company_id', company.id)
        .eq('status', 'aberto');

      const contasPagarAbertas = 
        ((payables?.reduce((sum, p) => sum + p.amount_cents, 0) || 0) / 100) +
        ((installments?.reduce((sum, i) => sum + i.amount_cents, 0) || 0) / 100);

      // Contas a receber abertas
      const { data: receivables } = await supabase
        .from('erp_receivables')
        .select('amount_cents, paid_amount_cents')
        .eq('company_id', company.id)
        .eq('status', 'aberto');

      const contasReceberAbertas = 
        (receivables?.reduce((sum, r) => sum + (r.amount_cents - (r.paid_amount_cents || 0)), 0) || 0) / 100;

      // Caixa atual (última sessão aberta)
      const { data: session } = await supabase
        .from('cash_sessions')
        .select('opening_balance, total_revenue')
        .eq('company_id', company.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const caixaAtual = session 
        ? (session.opening_balance || 0) + (session.total_revenue || 0)
        : 0;

      // Fluxo projetado 7 dias
      const { data: recebiveisProx } = await supabase
        .from('erp_receivables')
        .select('amount_cents, paid_amount_cents')
        .eq('company_id', company.id)
        .eq('status', 'aberto')
        .gte('due_date', todayStr)
        .lte('due_date', next7Days);

      const { data: pagaveisProx } = await supabase
        .from('accounts_payable')
        .select('amount_cents')
        .eq('company_id', company.id)
        .eq('status', 'pending')
        .gte('due_date', todayStr)
        .lte('due_date', next7Days);

      const { data: parcelasProx } = await supabase
        .from('erp_payables_installments')
        .select('amount_cents')
        .eq('company_id', company.id)
        .eq('status', 'aberto')
        .gte('due_date', todayStr)
        .lte('due_date', next7Days);

      const entradas7d = (recebiveisProx?.reduce((sum, r) => 
        sum + (r.amount_cents - (r.paid_amount_cents || 0)), 0) || 0) / 100;
      const saidas7d = 
        ((pagaveisProx?.reduce((sum, p) => sum + p.amount_cents, 0) || 0) / 100) +
        ((parcelasProx?.reduce((sum, i) => sum + i.amount_cents, 0) || 0) / 100);

      const fluxoProjetado7d = entradas7d - saidas7d;

      return {
        receita_hoje: receitaHoje,
        receita_mes: receitaMes,
        lucro_mes: lucroMes,
        cmv_mes: cmvMes,
        contas_pagar_abertas: contasPagarAbertas,
        contas_receber_abertas: contasReceberAbertas,
        caixa_atual: caixaAtual,
        fluxo_projetado_7d: fluxoProjetado7d,
      };
    },
    enabled: !!company?.id,
  });
}
