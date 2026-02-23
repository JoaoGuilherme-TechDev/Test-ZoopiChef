import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import type { DREData, ERPFilters } from '../types';

export { useERPDREAdvanced } from './useERPDREAdvanced';

export function useERPDRE(filters: ERPFilters) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['erp-dre', company?.id, filters],
    queryFn: async (): Promise<DREData | null> => {
      if (!company?.id) return null;

      // 1. Buscar pedidos (receita bruta, taxas) - sem coluna discount
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total, delivery_fee')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .is('cancelled_at', null);

      if (ordersError) throw ordersError;

      const orderIds = orders?.map(o => o.id) || [];

      // 2. Buscar itens para calcular CMV
      let cmvTotal = 0;

      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .in('order_id', orderIds);

        // Buscar custos dos produtos
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

      // 3. Buscar despesas (contas a pagar pagas no período)
      const { data: payables } = await supabase
        .from('accounts_payable')
        .select('amount_cents')
        .eq('company_id', company.id)
        .eq('status', 'paid')
        .gte('paid_at', `${filters.startDate}T00:00:00`)
        .lte('paid_at', `${filters.endDate}T23:59:59`);

      const { data: installments } = await supabase
        .from('erp_payables_installments')
        .select('amount_cents')
        .eq('company_id', company.id)
        .eq('status', 'pago')
        .gte('paid_at', `${filters.startDate}T00:00:00`)
        .lte('paid_at', `${filters.endDate}T23:59:59`);

      // Cálculos
      const receitaBruta = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const descontos = 0; // Coluna discount não existe
      const taxasDelivery = orders?.reduce((sum, o) => sum + (o.delivery_fee || 0), 0) || 0;
      const receitaLiquida = receitaBruta - descontos;
      const cmv = cmvTotal / 100; // Converter de centavos
      const lucroBruto = receitaLiquida - cmv;
      
      const despesasPayables = (payables?.reduce((sum, p) => sum + p.amount_cents, 0) || 0) / 100;
      const despesasInstallments = (installments?.reduce((sum, i) => sum + i.amount_cents, 0) || 0) / 100;
      const despesasOperacionais = despesasPayables + despesasInstallments;
      
      const resultadoFinal = lucroBruto - despesasOperacionais;

      const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
      const margemLiquida = receitaLiquida > 0 ? (resultadoFinal / receitaLiquida) * 100 : 0;

      return {
        period: `${filters.startDate} a ${filters.endDate}`,
        receita_bruta: receitaBruta,
        descontos,
        taxas_delivery: taxasDelivery,
        receita_liquida: receitaLiquida,
        cmv,
        lucro_bruto: lucroBruto,
        despesas_operacionais: despesasOperacionais,
        resultado_final: resultadoFinal,
        margem_bruta_percent: margemBruta,
        margem_liquida_percent: margemLiquida,
      };
    },
    enabled: !!company?.id,
  });
}
