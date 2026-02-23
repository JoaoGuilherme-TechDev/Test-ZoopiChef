import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';

interface DateFilters {
  startDate: string;
  endDate: string;
}

// Análise de pagamentos efetuados
export interface PaymentAnalysisData {
  payment_method: string;
  total_orders: number;
  total_revenue: number;
  percentage: number;
  avg_ticket: number;
}

// Análise de bairros
export interface NeighborhoodAnalysisData {
  neighborhood: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
}

// Pedidos cancelados
export interface CancelledOrderData {
  id: string;
  order_number: number;
  cancelled_at: string;
  cancel_reason: string;
  total: number;
  customer_name: string;
}

// Descontos concedidos
export interface DiscountData {
  id: string;
  order_number: number;
  discount_value: number;
  discount_percent: number;
  created_at: string;
  customer_name: string;
}

// Pedidos por mesa
export interface OrdersByTableData {
  table_number: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
}

// Pedidos por origem
export interface OrdersByOriginData {
  origin: string;
  total_orders: number;
  total_revenue: number;
  percentage: number;
}

// Vendas por usuário
export interface SalesByUserData {
  user_id: string;
  user_name: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
}

// Análise de pedidos
export interface OrderAnalysisData {
  id: string;
  order_number: number;
  status: string;
  order_type: string;
  total: number;
  created_at: string;
  customer_name: string;
}

// Hook: Análise de pagamentos efetuados
export function usePaymentAnalysisReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-payment-analysis', company?.id, filters],
    queryFn: async (): Promise<PaymentAnalysisData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, payment_method, total')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (error) throw error;

      const grouped = (orders || []).reduce((acc, order) => {
        const method = order.payment_method || 'Não informado';
        if (!acc[method]) {
          acc[method] = { orders: 0, revenue: 0 };
        }
        acc[method].orders += 1;
        acc[method].revenue += Number(order.total || 0);
        return acc;
      }, {} as Record<string, { orders: number; revenue: number }>);

      const totalRevenue = Object.values(grouped).reduce((sum, g) => sum + g.revenue, 0);

      return Object.entries(grouped).map(([method, data]) => ({
        payment_method: method,
        total_orders: data.orders,
        total_revenue: data.revenue,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        avg_ticket: data.orders > 0 ? data.revenue / data.orders : 0,
      })).sort((a, b) => b.total_revenue - a.total_revenue);
    },
    enabled: !!company?.id,
  });
}

// Hook: Análise de bairros
export function useNeighborhoodAnalysisReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-neighborhood-analysis', company?.id, filters],
    queryFn: async (): Promise<NeighborhoodAnalysisData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, destination_address, total')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto'])
        .not('destination_address', 'is', null);

      if (error) throw error;

      const grouped = (orders || []).reduce((acc, order) => {
        const address = order.destination_address as any;
        const neighborhood = address?.neighborhood || address?.bairro || 'Não informado';
        if (!acc[neighborhood]) {
          acc[neighborhood] = { orders: 0, revenue: 0 };
        }
        acc[neighborhood].orders += 1;
        acc[neighborhood].revenue += Number(order.total || 0);
        return acc;
      }, {} as Record<string, { orders: number; revenue: number }>);

      return Object.entries(grouped).map(([neighborhood, data]) => ({
        neighborhood,
        total_orders: data.orders,
        total_revenue: data.revenue,
        avg_ticket: data.orders > 0 ? data.revenue / data.orders : 0,
      })).sort((a, b) => b.total_orders - a.total_orders);
    },
    enabled: !!company?.id,
  });
}

// Hook: Pedidos cancelados
export function useCancelledOrdersReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-cancelled-orders', company?.id, filters],
    queryFn: async (): Promise<CancelledOrderData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, cancelled_at, cancel_reason, total, customer_name')
        .eq('company_id', company.id)
        .not('cancelled_at', 'is', null)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .order('cancelled_at', { ascending: false });

      if (error) throw error;

      return (orders || []).map(order => ({
        id: order.id,
        order_number: order.order_number,
        cancelled_at: order.cancelled_at || '',
        cancel_reason: order.cancel_reason || 'Não informado',
        total: Number(order.total || 0),
        customer_name: order.customer_name || 'Cliente não identificado',
      }));
    },
    enabled: !!company?.id,
  });
}

// Hook: Descontos concedidos
export function useDiscountsReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-discounts', company?.id, filters],
    queryFn: async (): Promise<DiscountData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, discount_amount, total, created_at, customer_name')
        .eq('company_id', company.id)
        .gt('discount_amount', 0)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (orders || []).map(order => ({
        id: order.id,
        order_number: order.order_number,
        discount_value: Number(order.discount_amount || 0),
        discount_percent: order.total ? (Number(order.discount_amount || 0) / Number(order.total)) * 100 : 0,
        created_at: order.created_at,
        customer_name: order.customer_name || 'Cliente não identificado',
      }));
    },
    enabled: !!company?.id,
  });
}

// Hook: Pedidos por mesa
export function useOrdersByTableReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-orders-by-table', company?.id, filters],
    queryFn: async (): Promise<OrdersByTableData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, table_number, total')
        .eq('company_id', company.id)
        .not('table_number', 'is', null)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (error) throw error;

      const grouped = (orders || []).reduce((acc, order) => {
        const tableNumber = order.table_number || 'N/A';
        if (!acc[tableNumber]) {
          acc[tableNumber] = { orders: 0, revenue: 0 };
        }
        acc[tableNumber].orders += 1;
        acc[tableNumber].revenue += Number(order.total || 0);
        return acc;
      }, {} as Record<string, { orders: number; revenue: number }>);

      return Object.entries(grouped).map(([tableNumber, data]) => ({
        table_number: tableNumber,
        total_orders: data.orders,
        total_revenue: data.revenue,
        avg_ticket: data.orders > 0 ? data.revenue / data.orders : 0,
      })).sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true }));
    },
    enabled: !!company?.id,
  });
}

// Hook: Pedidos por origem
export function useOrdersByOriginReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-orders-by-origin', company?.id, filters],
    queryFn: async (): Promise<OrdersByOriginData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_type, source, total')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (error) throw error;

      const originLabels: Record<string, string> = {
        'delivery': 'Delivery',
        'table': 'Mesa',
        'counter': 'Balcão',
        'takeaway': 'Para Viagem',
        'ifood': 'iFood',
        'whatsapp': 'WhatsApp',
        'online': 'Online',
        'pdv': 'PDV',
      };

      const grouped = (orders || []).reduce((acc, order) => {
        const origin = originLabels[order.source || order.order_type || ''] || order.source || order.order_type || 'Outros';
        if (!acc[origin]) {
          acc[origin] = { orders: 0, revenue: 0 };
        }
        acc[origin].orders += 1;
        acc[origin].revenue += Number(order.total || 0);
        return acc;
      }, {} as Record<string, { orders: number; revenue: number }>);

      const totalOrders = Object.values(grouped).reduce((sum, g) => sum + g.orders, 0);

      return Object.entries(grouped).map(([origin, data]) => ({
        origin,
        total_orders: data.orders,
        total_revenue: data.revenue,
        percentage: totalOrders > 0 ? (data.orders / totalOrders) * 100 : 0,
      })).sort((a, b) => b.total_orders - a.total_orders);
    },
    enabled: !!company?.id,
  });
}

// Hook: Vendas por usuário/operador
export function useSalesByUserReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-sales-by-user', company?.id, filters],
    queryFn: async (): Promise<SalesByUserData[]> => {
      if (!company?.id) return [];

      // Buscar pedidos com sessão de caixa
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, cash_session_id, total')
        .eq('company_id', company.id)
        .not('cash_session_id', 'is', null)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (error) throw error;

      // Buscar sessões de caixa para mapear operadores
      const sessionIds = [...new Set((orders || []).map(o => o.cash_session_id).filter(Boolean))];
      
      if (sessionIds.length === 0) return [];

      const { data: sessions } = await supabase
        .from('cash_sessions')
        .select('id, opened_by')
        .in('id', sessionIds as string[]);

      // Mapear sessões para user_id (opened_by)
      const sessionToUser = (sessions || []).reduce((acc, s) => {
        acc[s.id] = s.opened_by || 'unknown';
        return acc;
      }, {} as Record<string, string>);

      // Agrupar por usuário
      const grouped = (orders || []).reduce((acc, order) => {
        const userId = sessionToUser[order.cash_session_id!] || 'unknown';
        if (!acc[userId]) {
          acc[userId] = { orders: 0, revenue: 0 };
        }
        acc[userId].orders += 1;
        acc[userId].revenue += Number(order.total || 0);
        return acc;
      }, {} as Record<string, { orders: number; revenue: number }>);

      return Object.entries(grouped).map(([userId, data]) => ({
        user_id: userId,
        user_name: userId === 'unknown' ? 'Usuário não identificado' : `Operador`,
        total_orders: data.orders,
        total_revenue: data.revenue,
        avg_ticket: data.orders > 0 ? data.revenue / data.orders : 0,
      })).sort((a, b) => b.total_revenue - a.total_revenue);
    },
    enabled: !!company?.id,
  });
}

// Hook: Análise detalhada de pedidos
export function useOrderAnalysisReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-order-analysis', company?.id, filters],
    queryFn: async (): Promise<OrderAnalysisData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, status, order_type, total, created_at, customer_name')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const statusLabels: Record<string, string> = {
        'novo': 'Novo',
        'preparo': 'Em Preparo',
        'pronto': 'Pronto',
        'em_rota': 'Em Rota',
        'entregue': 'Entregue',
      };

      return (orders || []).map(order => ({
        id: order.id,
        order_number: order.order_number,
        status: statusLabels[order.status] || order.status,
        order_type: order.order_type || 'Não informado',
        total: Number(order.total || 0),
        created_at: order.created_at,
        customer_name: order.customer_name || 'Cliente não identificado',
      }));
    },
    enabled: !!company?.id,
  });
}
