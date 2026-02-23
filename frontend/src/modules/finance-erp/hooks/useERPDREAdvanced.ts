import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';

export interface DRECategoryBreakdown {
  category_id: string;
  category_name: string;
  category_code: string;
  type: 'expense' | 'income';
  amount: number;
  percent_of_total: number;
}

export interface DREAdvancedData {
  period: string;
  receita_bruta: number;
  descontos: number;
  taxas_delivery: number;
  receita_liquida: number;
  cmv: number;
  lucro_bruto: number;
  margem_bruta_percent: number;
  despesas_por_categoria: DRECategoryBreakdown[];
  total_despesas_operacionais: number;
  resultado_operacional: number;
  margem_operacional_percent: number;
  outras_receitas: number;
  outras_despesas: number;
  resultado_final: number;
  margem_liquida_percent: number;
}

export interface ERPDREFilters {
  startDate: string;
  endDate: string;
  compareWithPrevious?: boolean;
}

export function useERPDREAdvanced(filters: ERPDREFilters) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['erp-dre-advanced', company?.id, filters],
    queryFn: async (): Promise<{ current: DREAdvancedData; previous?: DREAdvancedData }> => {
      if (!company?.id) throw new Error('No company');

      const calculateDRE = async (start: string, end: string): Promise<DREAdvancedData> => {
        // 1. Buscar pedidos (receita bruta, taxas)
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, total, delivery_fee')
          .eq('company_id', company.id)
          .eq('status', 'entregue')
          .gte('created_at', `${start}T00:00:00`)
          .lte('created_at', `${end}T23:59:59`)
          .is('cancelled_at', null);

        if (ordersError) throw ordersError;

        const orderIds = orders?.map(o => o.id) || [];

        // 2. Calcular CMV
        let cmvTotal = 0;
        if (orderIds.length > 0) {
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
              cmvTotal += (cost.unit_cost_cents + cost.optional_cost_cents) * (item.quantity || 1);
            }
          });
        }

        // 3. Buscar despesas com categorias (plano de contas)
        const { data: payables } = await supabase
          .from('accounts_payable')
          .select(`
            amount_cents,
            category_id,
            chart_of_accounts:category_id (
              id,
              name,
              code,
              type
            )
          `)
          .eq('company_id', company.id)
          .eq('status', 'paid')
          .gte('paid_at', `${start}T00:00:00`)
          .lte('paid_at', `${end}T23:59:59`);

        const { data: installments } = await supabase
          .from('erp_payables_installments')
          .select(`
            amount_cents,
            category_id,
            chart_of_accounts:category_id (
              id,
              name,
              code,
              type
            )
          `)
          .eq('company_id', company.id)
          .eq('status', 'pago')
          .gte('paid_at', `${start}T00:00:00`)
          .lte('paid_at', `${end}T23:59:59`);

        // Agregar despesas por categoria
        const categoryMap = new Map<string, DRECategoryBreakdown>();

        const processExpense = (item: any) => {
          const categoryInfo = item.chart_of_accounts;
          const categoryId = categoryInfo?.id || 'uncategorized';
          const categoryName = categoryInfo?.name || 'Sem Categoria';
          const categoryCode = categoryInfo?.code || '0';
          const type = categoryInfo?.type || 'expense';

          const existing = categoryMap.get(categoryId) || {
            category_id: categoryId,
            category_name: categoryName,
            category_code: categoryCode,
            type: type as 'expense' | 'income',
            amount: 0,
            percent_of_total: 0,
          };

          existing.amount += item.amount_cents / 100;
          categoryMap.set(categoryId, existing);
        };

        payables?.forEach(processExpense);
        installments?.forEach(processExpense);

        // Cálculos
        const receitaBruta = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
        const descontos = 0;
        const taxasDelivery = orders?.reduce((sum, o) => sum + (o.delivery_fee || 0), 0) || 0;
        const receitaLiquida = receitaBruta - descontos;
        const cmv = cmvTotal / 100;
        const lucroBruto = receitaLiquida - cmv;

        const despesasPorCategoria = Array.from(categoryMap.values())
          .filter(c => c.type === 'expense')
          .sort((a, b) => b.amount - a.amount);

        const totalDespesasOperacionais = despesasPorCategoria.reduce((sum, c) => sum + c.amount, 0);

        // Calcular percentuais
        despesasPorCategoria.forEach(c => {
          c.percent_of_total = totalDespesasOperacionais > 0 
            ? (c.amount / totalDespesasOperacionais) * 100 
            : 0;
        });

        const resultadoOperacional = lucroBruto - totalDespesasOperacionais;
        const outrasReceitas = Array.from(categoryMap.values())
          .filter(c => c.type === 'income')
          .reduce((sum, c) => sum + c.amount, 0);
        const outrasDespesas = 0;
        const resultadoFinal = resultadoOperacional + outrasReceitas - outrasDespesas;

        return {
          period: `${start} a ${end}`,
          receita_bruta: receitaBruta,
          descontos,
          taxas_delivery: taxasDelivery,
          receita_liquida: receitaLiquida,
          cmv,
          lucro_bruto: lucroBruto,
          margem_bruta_percent: receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0,
          despesas_por_categoria: despesasPorCategoria,
          total_despesas_operacionais: totalDespesasOperacionais,
          resultado_operacional: resultadoOperacional,
          margem_operacional_percent: receitaLiquida > 0 ? (resultadoOperacional / receitaLiquida) * 100 : 0,
          outras_receitas: outrasReceitas,
          outras_despesas: outrasDespesas,
          resultado_final: resultadoFinal,
          margem_liquida_percent: receitaLiquida > 0 ? (resultadoFinal / receitaLiquida) * 100 : 0,
        };
      };

      const current = await calculateDRE(filters.startDate, filters.endDate);

      let previous: DREAdvancedData | undefined;
      if (filters.compareWithPrevious) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        const prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevStartDate.getDate() - daysDiff);

        previous = await calculateDRE(
          prevStartDate.toISOString().split('T')[0],
          prevEndDate.toISOString().split('T')[0]
        );
      }

      return { current, previous };
    },
    enabled: !!company?.id,
  });
}
