import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { format, parseISO } from 'date-fns';

interface DateFilters {
  startDate: string;
  endDate: string;
}

export interface OrderListData {
  id: string;
  order_number: number;
  created_at: string;
  customer_name: string;
  order_type: string;
  status: string;
  payment_method: string;
  total: number;
}

export interface MonthlyBillingData {
  month: string;
  month_label: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
}

export interface BranchBillingData {
  store_id: string;
  store_name: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
}

export interface ProductBySellerData {
  product_id: string;
  product_name: string;
  seller_name: string;
  quantity_sold: number;
  total_revenue: number;
}

export interface CategoryBySellerData {
  category_name: string;
  seller_name: string;
  quantity_sold: number;
  total_revenue: number;
}

export interface CategoryByCustomerData {
  category_name: string;
  customer_name: string;
  quantity_sold: number;
  total_revenue: number;
}

export interface OptionalGroupSalesData {
  group_name: string;
  option_name: string;
  quantity_sold: number;
  total_revenue: number;
}

export function useOrderListReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-order-list', company?.id, filters],
    queryFn: async (): Promise<OrderListData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, created_at, customer_name, order_type, status, payment_method, total')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      return (orders || []).map(order => ({
        id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        customer_name: order.customer_name || 'Cliente não identificado',
        order_type: order.order_type || 'counter',
        status: order.status,
        payment_method: order.payment_method || '',
        total: Number(order.total || 0),
      }));
    },
    enabled: !!company?.id,
  });
}

export function useMonthlyBillingReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-monthly-billing', company?.id, filters],
    queryFn: async (): Promise<MonthlyBillingData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, created_at, total')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (error) throw error;

      const monthlyData: Record<string, { orders: number; revenue: number }> = {};

      (orders || []).forEach(order => {
        const date = parseISO(order.created_at);
        const monthKey = format(date, 'yyyy-MM');

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { orders: 0, revenue: 0 };
        }

        monthlyData[monthKey].orders += 1;
        monthlyData[monthKey].revenue += Number(order.total || 0);
      });

      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

      return Object.entries(monthlyData).map(([month, data]) => {
        const [year, monthNum] = month.split('-');
        return {
          month,
          month_label: `${months[parseInt(monthNum) - 1]} ${year}`,
          total_orders: data.orders,
          total_revenue: data.revenue,
          avg_ticket: data.orders > 0 ? data.revenue / data.orders : 0,
        };
      }).sort((a, b) => b.month.localeCompare(a.month));
    },
    enabled: !!company?.id,
  });
}

export function useBranchBillingReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-branch-billing', company?.id, filters],
    queryFn: async (): Promise<BranchBillingData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (error) throw error;

      const totalOrders = orders?.length || 0;
      const totalRevenue = (orders || []).reduce((sum, o) => sum + Number(o.total || 0), 0);

      return [{
        store_id: 'main',
        store_name: 'Matriz',
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        avg_ticket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      }];
    },
    enabled: !!company?.id,
  });
}

export function useProductBySellerReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-product-seller', company?.id, filters],
    queryFn: async (): Promise<ProductBySellerData[]> => {
      if (!company?.id) return [];
      return [];
    },
    enabled: !!company?.id,
  });
}

export function useCategoryBySellerReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-category-seller', company?.id, filters],
    queryFn: async (): Promise<CategoryBySellerData[]> => {
      if (!company?.id) return [];
      return [];
    },
    enabled: !!company?.id,
  });
}

export function useCategoryByCustomerReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-category-customer', company?.id, filters],
    queryFn: async (): Promise<CategoryByCustomerData[]> => {
      if (!company?.id) return [];
      return [];
    },
    enabled: !!company?.id,
  });
}

export function useOptionalGroupSalesReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-optional-group-sales', company?.id, filters],
    queryFn: async (): Promise<OptionalGroupSalesData[]> => {
      if (!company?.id) return [];
      return [];
    },
    enabled: !!company?.id,
  });
}
