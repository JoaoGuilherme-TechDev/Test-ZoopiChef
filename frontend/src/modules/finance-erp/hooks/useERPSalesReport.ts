import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import type { 
  SalesReportData, 
  SalesByOperator, 
  SalesByPaymentMethod,
  ERPFilters 
} from '../types';

export function useERPSalesReport(filters: ERPFilters) {
  const { data: company } = useCompany();

  // Vendas por período (dia a dia)
  const salesByPeriod = useQuery({
    queryKey: ['erp-sales-by-period', company?.id, filters],
    queryFn: async (): Promise<SalesReportData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, delivery_fee, created_at')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .is('cancelled_at', null);

      if (error) throw error;

      // Agrupar por data
      const byDate = new Map<string, SalesReportData>();
      
      orders?.forEach(order => {
        const date = order.created_at.split('T')[0];
        const existing = byDate.get(date) || {
          date,
          total_orders: 0,
          total_revenue: 0,
          avg_ticket: 0,
          delivery_fees: 0,
          discounts: 0,
        };

        existing.total_orders += 1;
        existing.total_revenue += order.total || 0;
        existing.delivery_fees += order.delivery_fee || 0;
        existing.discounts += 0; // Campo discount não existe na tabela orders

        byDate.set(date, existing);
      });

      // Calcular ticket médio
      const result = Array.from(byDate.values()).map(d => ({
        ...d,
        avg_ticket: d.total_orders > 0 ? d.total_revenue / d.total_orders : 0,
      }));

      return result.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!company?.id,
  });

  // Vendas por operador
  const salesByOperator = useQuery({
    queryKey: ['erp-sales-by-operator', company?.id, filters],
    queryFn: async (): Promise<SalesByOperator[]> => {
      if (!company?.id) return [];

      // Buscar pedidos
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total, cash_session_id, created_at')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .is('cancelled_at', null);

      if (ordersError) throw ordersError;

      // Buscar sessões de caixa para fallback de operador
      const sessionIds = [...new Set(orders?.map(o => o.cash_session_id).filter(Boolean))] as string[];
      
      let sessionsMap = new Map<string, string>();
      if (sessionIds.length > 0) {
        const { data: sessions } = await supabase
          .from('cash_sessions')
          .select('id, opened_by')
          .in('id', sessionIds);
        
        sessions?.forEach(s => sessionsMap.set(s.id, s.opened_by));
      }

      // Buscar nomes dos perfis
      const operatorIds = new Set<string>();
      orders?.forEach(o => {
        if (o.cash_session_id && sessionsMap.get(o.cash_session_id)) {
          operatorIds.add(sessionsMap.get(o.cash_session_id)!);
        }
      });

      let profilesMap = new Map<string, string>();
      if (operatorIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(operatorIds));
        
        profiles?.forEach(p => profilesMap.set(p.id, p.full_name));
      }

      // Agrupar por operador
      const byOperator = new Map<string, SalesByOperator>();

      orders?.forEach(order => {
        let operatorId: string | null = null;
        let operatorName = 'Não identificado';

        // Usar opened_by da sessão de caixa como operador
        if (order.cash_session_id) {
          const sessionOperator = sessionsMap.get(order.cash_session_id);
          if (sessionOperator) {
            operatorId = sessionOperator;
            operatorName = profilesMap.get(sessionOperator) || 'Usuário sem nome';
          }
        }

        const key = operatorId || 'unidentified';
        const existing = byOperator.get(key) || {
          operator_id: operatorId,
          operator_name: operatorName,
          total_orders: 0,
          total_revenue: 0,
          avg_ticket: 0,
        };

        existing.total_orders += 1;
        existing.total_revenue += order.total || 0;
        byOperator.set(key, existing);
      });

      return Array.from(byOperator.values()).map(o => ({
        ...o,
        avg_ticket: o.total_orders > 0 ? o.total_revenue / o.total_orders : 0,
      })).sort((a, b) => b.total_revenue - a.total_revenue);
    },
    enabled: !!company?.id,
  });

  // Vendas por forma de pagamento
  const salesByPaymentMethod = useQuery({
    queryKey: ['erp-sales-by-payment', company?.id, filters],
    queryFn: async (): Promise<SalesByPaymentMethod[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, payment_method')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .is('cancelled_at', null);

      if (error) throw error;

      const byPayment = new Map<string, { total_orders: number; total_revenue: number }>();
      let totalRevenue = 0;

      orders?.forEach(order => {
        const method = order.payment_method || 'Não informado';
        const existing = byPayment.get(method) || { total_orders: 0, total_revenue: 0 };
        existing.total_orders += 1;
        existing.total_revenue += order.total || 0;
        totalRevenue += order.total || 0;
        byPayment.set(method, existing);
      });

      return Array.from(byPayment.entries()).map(([method, data]) => ({
        payment_method: method,
        total_orders: data.total_orders,
        total_revenue: data.total_revenue,
        percentage: totalRevenue > 0 ? (data.total_revenue / totalRevenue) * 100 : 0,
      })).sort((a, b) => b.total_revenue - a.total_revenue);
    },
    enabled: !!company?.id,
  });

  // Totais gerais
  const totals = useQuery({
    queryKey: ['erp-sales-totals', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, delivery_fee, status')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .is('cancelled_at', null);

      if (error) throw error;

      // Cortesias (total = 0 mas não cancelado)
      const cortesias = orders?.filter(o => (o.total || 0) === 0) || [];
      const validOrders = orders?.filter(o => (o.total || 0) > 0) || [];

      return {
        total_orders: validOrders.length,
        total_revenue: validOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        total_delivery_fees: validOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0),
        total_discounts: 0, // Campo discount não existe
        avg_ticket: validOrders.length > 0 
          ? validOrders.reduce((sum, o) => sum + (o.total || 0), 0) / validOrders.length 
          : 0,
        cortesias_count: cortesias.length,
      };
    },
    enabled: !!company?.id,
  });

  return {
    salesByPeriod: salesByPeriod.data || [],
    salesByOperator: salesByOperator.data || [],
    salesByPaymentMethod: salesByPaymentMethod.data || [],
    totals: totals.data,
    isLoading: salesByPeriod.isLoading || salesByOperator.isLoading || 
               salesByPaymentMethod.isLoading || totals.isLoading,
  };
}
