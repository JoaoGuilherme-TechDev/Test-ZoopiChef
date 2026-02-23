import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';

export interface BillingReportFilters {
  startDate: string;
  endDate: string;
}

export interface BillingSummaryData {
  total_revenue: number;
  total_orders: number;
  avg_ticket: number;
  total_delivery_fee: number;
  total_discount: number;
}

export interface BillingByPaymentData {
  payment_method: string;
  total_orders: number;
  total_revenue: number;
  percentage: number;
}

export interface BillingByOperatorData {
  operator_id: string;
  operator_name: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
}

export function useBillingReport(filters: BillingReportFilters) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['reports-billing-summary', company?.id, filters],
    queryFn: async (): Promise<BillingSummaryData | null> => {
      if (!company?.id) return null;

      const { data: orders, error } = await (supabase as any)
        .from('orders')
        .select('id, total, delivery_fee')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`);

      if (error) throw error;

      const totalRevenue = (orders || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0);
      const totalOrders = orders?.length || 0;
      const totalDeliveryFee = (orders || []).reduce((sum: number, o: any) => sum + (o.delivery_fee || 0), 0);

      return {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        avg_ticket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        total_delivery_fee: totalDeliveryFee,
        total_discount: 0,
      };
    },
    enabled: !!company?.id,
  });
}

export function useBillingByPaymentReport(filters: BillingReportFilters) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['reports-billing-by-payment', company?.id, filters],
    queryFn: async (): Promise<BillingByPaymentData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, payment_method')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`);

      if (error) throw error;

      // Agrupar por método de pagamento
      const paymentMap = new Map<string, { orders: number; revenue: number }>();

      for (const order of orders || []) {
        const method = order.payment_method || 'Não informado';
        const existing = paymentMap.get(method) || { orders: 0, revenue: 0 };
        existing.orders += 1;
        existing.revenue += order.total || 0;
        paymentMap.set(method, existing);
      }

      const totalRevenue = Array.from(paymentMap.values()).reduce((sum, p) => sum + p.revenue, 0);

      return Array.from(paymentMap.entries())
        .map(([method, data]) => ({
          payment_method: method,
          total_orders: data.orders,
          total_revenue: data.revenue,
          percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue);
    },
    enabled: !!company?.id,
  });
}

export function useBillingByOperatorReport(filters: BillingReportFilters) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['reports-billing-by-operator', company?.id, filters],
    queryFn: async (): Promise<BillingByOperatorData[]> => {
      if (!company?.id) return [];

      // Buscar pedidos com sessão de caixa
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, cash_session_id')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`);

      if (error) throw error;

      // Buscar sessões de caixa
      const ordersList = orders as any[] || [];
      const sessionIds: string[] = [...new Set(ordersList.map((o: any) => o.cash_session_id).filter(Boolean))] as string[];
      
      if (sessionIds.length === 0) return [];

      const { data: sessions } = await (supabase as any)
        .from('cash_sessions')
        .select('id, operator_id')
        .in('id', sessionIds);

      // Buscar perfis dos operadores
      const operatorIds: string[] = [...new Set((sessions || []).map((s: any) => s.operator_id).filter(Boolean))] as string[];
      
      if (operatorIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', operatorIds as string[]);

      // Mapear sessões para operadores
      const sessionToOperator = new Map<string, string>();
      for (const session of sessions || []) {
        sessionToOperator.set(session.id, session.operator_id);
      }

      // Mapear perfis
      const operatorNames = new Map<string, string>();
      for (const profile of profiles || []) {
        operatorNames.set(profile.id, profile.full_name || 'Operador');
      }

      // Agrupar por operador
      const operatorMap = new Map<string, { orders: number; revenue: number }>();

      for (const order of orders || []) {
        const operatorId = sessionToOperator.get(order.cash_session_id);
        if (!operatorId) continue;

        const existing = operatorMap.get(operatorId) || { orders: 0, revenue: 0 };
        existing.orders += 1;
        existing.revenue += order.total || 0;
        operatorMap.set(operatorId, existing);
      }

      return Array.from(operatorMap.entries())
        .map(([operatorId, data]) => ({
          operator_id: operatorId,
          operator_name: operatorNames.get(operatorId) || 'Operador',
          total_orders: data.orders,
          total_revenue: data.revenue,
          avg_ticket: data.orders > 0 ? data.revenue / data.orders : 0,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue);
    },
    enabled: !!company?.id,
  });
}
