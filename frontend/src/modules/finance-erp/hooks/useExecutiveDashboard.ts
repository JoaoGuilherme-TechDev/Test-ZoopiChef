import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface ExecutiveMetrics {
  // Receitas
  receita_mes_atual: number;
  receita_mes_anterior: number;
  receita_variacao_percent: number;
  
  // Despesas
  despesas_mes_atual: number;
  despesas_mes_anterior: number;
  despesas_variacao_percent: number;
  
  // Lucro
  lucro_mes_atual: number;
  lucro_mes_anterior: number;
  lucro_variacao_percent: number;
  
  // Margem
  margem_atual: number;
  margem_anterior: number;
  
  // Contas
  contas_receber: number;
  contas_pagar: number;
  saldo_liquido: number;
  
  // Caixa e Bancos
  saldo_caixa: number;
  saldo_bancos: number;
  total_disponivel: number;
  
  // Indicadores
  ticket_medio: number;
  total_pedidos: number;
  cmv_percent: number;
  
  // Top despesas
  top_despesas: Array<{
    categoria: string;
    valor: number;
    percent: number;
  }>;
  
  // Receita por dia (últimos 30 dias)
  receita_diaria: Array<{
    date: string;
    value: number;
  }>;
}

export function useExecutiveDashboard() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['executive-dashboard', company?.id],
    queryFn: async (): Promise<ExecutiveMetrics> => {
      if (!company?.id) throw new Error('No company');

      const hoje = new Date();
      const inicioMesAtual = format(startOfMonth(hoje), 'yyyy-MM-dd');
      const fimMesAtual = format(endOfMonth(hoje), 'yyyy-MM-dd');
      const inicioMesAnterior = format(startOfMonth(subMonths(hoje, 1)), 'yyyy-MM-dd');
      const fimMesAnterior = format(endOfMonth(subMonths(hoje, 1)), 'yyyy-MM-dd');

      // Receita mês atual
      const { data: pedidosMesAtual } = await supabase
        .from('orders')
        .select('total, delivery_fee')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${inicioMesAtual}T00:00:00`)
        .lte('created_at', `${fimMesAtual}T23:59:59`)
        .is('cancelled_at', null);

      // Receita mês anterior
      const { data: pedidosMesAnterior } = await supabase
        .from('orders')
        .select('total')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${inicioMesAnterior}T00:00:00`)
        .lte('created_at', `${fimMesAnterior}T23:59:59`)
        .is('cancelled_at', null);

      const receitaMesAtual = pedidosMesAtual?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;
      const receitaMesAnterior = pedidosMesAnterior?.reduce((sum, p) => sum + (p.total || 0), 0) || 0;
      const totalPedidos = pedidosMesAtual?.length || 0;

      // Despesas mês atual e anterior
      const { data: despesasMesAtualData } = await supabase
        .from('accounts_payable')
        .select('amount_cents, category')
        .eq('company_id', company.id)
        .eq('status', 'paid')
        .gte('paid_at', `${inicioMesAtual}T00:00:00`)
        .lte('paid_at', `${fimMesAtual}T23:59:59`);

      const { data: despesasMesAnteriorData } = await supabase
        .from('accounts_payable')
        .select('amount_cents')
        .eq('company_id', company.id)
        .eq('status', 'paid')
        .gte('paid_at', `${inicioMesAnterior}T00:00:00`)
        .lte('paid_at', `${fimMesAnterior}T23:59:59`);

      const despesasMesAtual = (despesasMesAtualData?.reduce((sum, d) => sum + d.amount_cents, 0) || 0) / 100;
      const despesasMesAnterior = (despesasMesAnteriorData?.reduce((sum, d) => sum + d.amount_cents, 0) || 0) / 100;

      // Top despesas por categoria
      const despesasPorCategoria = new Map<string, number>();
      despesasMesAtualData?.forEach(d => {
        const cat = d.category || 'Sem Categoria';
        despesasPorCategoria.set(cat, (despesasPorCategoria.get(cat) || 0) + d.amount_cents / 100);
      });

      const topDespesas = Array.from(despesasPorCategoria.entries())
        .map(([categoria, valor]) => ({
          categoria,
          valor,
          percent: despesasMesAtual > 0 ? (valor / despesasMesAtual) * 100 : 0,
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

      // Contas a receber e pagar
      const { data: contasReceber } = await supabase
        .from('erp_receivables')
        .select('amount_cents')
        .eq('company_id', company.id)
        .in('status', ['aberto', 'parcial']);

      const { data: contasPagar } = await supabase
        .from('accounts_payable')
        .select('amount_cents')
        .eq('company_id', company.id)
        .eq('status', 'pending');

      const totalContasReceber = (contasReceber?.reduce((sum, c) => sum + c.amount_cents, 0) || 0) / 100;
      const totalContasPagar = (contasPagar?.reduce((sum, c) => sum + c.amount_cents, 0) || 0) / 100;

      // Saldo em caixa
      const { data: caixaAberto } = await supabase
        .from('cash_sessions')
        .select('opening_balance, total_revenue')
        .eq('company_id', company.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const saldoCaixa = (caixaAberto?.opening_balance || 0) + (caixaAberto?.total_revenue || 0);

      // Saldo em bancos
      const { data: bancos } = await supabase
        .from('bank_accounts')
        .select('current_balance_cents')
        .eq('company_id', company.id)
        .eq('is_active', true);

      const saldoBancos = (bancos?.reduce((sum, b) => sum + (b.current_balance_cents || 0), 0) || 0) / 100;

      // Receita diária (últimos 30 dias)
      const { data: receitaDiaria } = await supabase
        .from('orders')
        .select('created_at, total')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', format(subMonths(hoje, 1), 'yyyy-MM-dd'))
        .is('cancelled_at', null);

      const receitaPorDia = new Map<string, number>();
      receitaDiaria?.forEach(o => {
        const day = o.created_at.split('T')[0];
        receitaPorDia.set(day, (receitaPorDia.get(day) || 0) + (o.total || 0));
      });

      const receitaDiariaArray = Array.from(receitaPorDia.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Cálculos
      const lucroMesAtual = receitaMesAtual - despesasMesAtual;
      const lucroMesAnterior = receitaMesAnterior - despesasMesAnterior;
      const margemAtual = receitaMesAtual > 0 ? (lucroMesAtual / receitaMesAtual) * 100 : 0;
      const margemAnterior = receitaMesAnterior > 0 ? (lucroMesAnterior / receitaMesAnterior) * 100 : 0;

      const calcVariacao = (atual: number, anterior: number) =>
        anterior > 0 ? ((atual - anterior) / anterior) * 100 : 0;

      return {
        receita_mes_atual: receitaMesAtual,
        receita_mes_anterior: receitaMesAnterior,
        receita_variacao_percent: calcVariacao(receitaMesAtual, receitaMesAnterior),
        despesas_mes_atual: despesasMesAtual,
        despesas_mes_anterior: despesasMesAnterior,
        despesas_variacao_percent: calcVariacao(despesasMesAtual, despesasMesAnterior),
        lucro_mes_atual: lucroMesAtual,
        lucro_mes_anterior: lucroMesAnterior,
        lucro_variacao_percent: calcVariacao(lucroMesAtual, lucroMesAnterior),
        margem_atual: margemAtual,
        margem_anterior: margemAnterior,
        contas_receber: totalContasReceber,
        contas_pagar: totalContasPagar,
        saldo_liquido: totalContasReceber - totalContasPagar,
        saldo_caixa: saldoCaixa,
        saldo_bancos: saldoBancos,
        total_disponivel: saldoCaixa + saldoBancos,
        ticket_medio: totalPedidos > 0 ? receitaMesAtual / totalPedidos : 0,
        total_pedidos: totalPedidos,
        cmv_percent: 0, // Pode ser calculado se necessário
        top_despesas: topDespesas,
        receita_diaria: receitaDiariaArray,
      };
    },
    enabled: !!company?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
