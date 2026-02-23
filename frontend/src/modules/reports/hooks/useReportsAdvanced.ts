import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { format, parseISO, differenceInMinutes } from 'date-fns';

interface DateFilters {
  startDate: string;
  endDate: string;
}

export interface DelayReportData {
  id: string;
  order_number: number;
  created_at: string;
  delay_minutes: number;
  customer_name: string;
  total: number;
}

export interface CustomerTypeByDayData {
  day_of_week: string;
  day_number: number;
  new_customers: number;
  returning_customers: number;
  total_orders: number;
  total_revenue: number;
}

export interface FlavorSoldData {
  flavor_id: string;
  flavor_name: string;
  product_name: string;
  quantity_sold: number;
  total_revenue: number;
}

export interface FreightAnalysisData {
  freight_type: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
  percentage: number;
}

export interface SalesByHourDetailedData {
  hour: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
  avg_time_minutes: number;
}

export interface KDSTimeAnalysisData {
  sector_name: string;
  total_orders: number;
  avg_time_minutes: number;
  min_time_minutes: number;
  max_time_minutes: number;
}

export interface KDSTimeByDayData {
  date: string;
  total_orders: number;
  avg_time_minutes: number;
  delayed_orders: number;
}

export interface PurchaseRecurrenceData {
  customer_id: string;
  customer_name: string;
  phone: string;
  total_orders: number;
  first_order_date: string;
  last_order_date: string;
  avg_days_between: number;
  total_spent: number;
}

export function useDelayReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-delay', company?.id, filters],
    queryFn: async (): Promise<DelayReportData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, created_at, ready_at, delivered_at, customer_name, total')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (orders || []).map(order => {
        const createdAt = parseISO(order.created_at);
        const readyAt = order.ready_at ? parseISO(order.ready_at) : null;
        const deliveredAt = order.delivered_at ? parseISO(order.delivered_at) : null;
        
        const delay = deliveredAt 
          ? differenceInMinutes(deliveredAt, createdAt)
          : readyAt 
            ? differenceInMinutes(readyAt, createdAt)
            : 0;

        return {
          id: order.id,
          order_number: order.order_number,
          created_at: order.created_at,
          delay_minutes: delay,
          customer_name: order.customer_name || 'Cliente não identificado',
          total: Number(order.total || 0),
        };
      }).filter(o => o.delay_minutes > 30).sort((a, b) => b.delay_minutes - a.delay_minutes);
    },
    enabled: !!company?.id,
  });
}

export function useCustomerTypeByDayReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-customer-type-day', company?.id, filters],
    queryFn: async (): Promise<CustomerTypeByDayData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, created_at, customer_id, total')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (error) throw error;

      const customerFirstOrder: Record<string, string> = {};
      (orders || []).forEach(order => {
        if (order.customer_id) {
          if (!customerFirstOrder[order.customer_id] || order.created_at < customerFirstOrder[order.customer_id]) {
            customerFirstOrder[order.customer_id] = order.created_at;
          }
        }
      });

      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const grouped: Record<number, { new: number; returning: number; orders: number; revenue: number }> = {};

      (orders || []).forEach(order => {
        const date = parseISO(order.created_at);
        const dayOfWeek = date.getDay();
        
        if (!grouped[dayOfWeek]) {
          grouped[dayOfWeek] = { new: 0, returning: 0, orders: 0, revenue: 0 };
        }

        grouped[dayOfWeek].orders += 1;
        grouped[dayOfWeek].revenue += Number(order.total || 0);

        if (order.customer_id) {
          const firstOrder = customerFirstOrder[order.customer_id];
          if (firstOrder === order.created_at) {
            grouped[dayOfWeek].new += 1;
          } else {
            grouped[dayOfWeek].returning += 1;
          }
        }
      });

      return Object.entries(grouped).map(([day, data]) => ({
        day_of_week: dayNames[Number(day)],
        day_number: Number(day),
        new_customers: data.new,
        returning_customers: data.returning,
        total_orders: data.orders,
        total_revenue: data.revenue,
      })).sort((a, b) => a.day_number - b.day_number);
    },
    enabled: !!company?.id,
  });
}

export function useFlavorsSoldReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-flavors-sold', company?.id, filters],
    queryFn: async (): Promise<FlavorSoldData[]> => {
      if (!company?.id) return [];
      // Retornar vazio - tabela não existe no schema
      return [];
    },
    enabled: !!company?.id,
  });
}

export function useFreightAnalysisReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-freight-analysis', company?.id, filters],
    queryFn: async (): Promise<FreightAnalysisData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_type, delivery_fee, total')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (error) throw error;

      const freightLabels: Record<string, string> = {
        'delivery': 'Delivery',
        'takeaway': 'Retirada',
        'table': 'Mesa',
        'counter': 'Balcão',
      };

      const grouped: Record<string, { orders: number; revenue: number }> = {};

      (orders || []).forEach(order => {
        const freightType = freightLabels[order.order_type || ''] || order.order_type || 'Outros';
        if (!grouped[freightType]) {
          grouped[freightType] = { orders: 0, revenue: 0 };
        }
        grouped[freightType].orders += 1;
        grouped[freightType].revenue += Number(order.total || 0);
      });

      const totalOrders = Object.values(grouped).reduce((sum, g) => sum + g.orders, 0);

      return Object.entries(grouped).map(([type, data]) => ({
        freight_type: type,
        total_orders: data.orders,
        total_revenue: data.revenue,
        avg_ticket: data.orders > 0 ? data.revenue / data.orders : 0,
        percentage: totalOrders > 0 ? (data.orders / totalOrders) * 100 : 0,
      })).sort((a, b) => b.total_orders - a.total_orders);
    },
    enabled: !!company?.id,
  });
}

export function useSalesByHourDetailedReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-sales-hour-detailed', company?.id, filters],
    queryFn: async (): Promise<SalesByHourDetailedData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, created_at, ready_at, total')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (error) throw error;

      const hourlyData: Record<string, { orders: number; revenue: number; totalTime: number; count: number }> = {};

      (orders || []).forEach(order => {
        const date = parseISO(order.created_at);
        const hour = format(date, 'HH:00');
        
        if (!hourlyData[hour]) {
          hourlyData[hour] = { orders: 0, revenue: 0, totalTime: 0, count: 0 };
        }

        hourlyData[hour].orders += 1;
        hourlyData[hour].revenue += Number(order.total || 0);

        if (order.ready_at) {
          const readyAt = parseISO(order.ready_at);
          const timeMinutes = differenceInMinutes(readyAt, date);
          hourlyData[hour].totalTime += timeMinutes;
          hourlyData[hour].count += 1;
        }
      });

      return Object.entries(hourlyData).map(([hour, data]) => ({
        hour,
        total_orders: data.orders,
        total_revenue: data.revenue,
        avg_ticket: data.orders > 0 ? data.revenue / data.orders : 0,
        avg_time_minutes: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
      })).sort((a, b) => a.hour.localeCompare(b.hour));
    },
    enabled: !!company?.id,
  });
}

export function useKDSTimeAnalysisReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-kds-time', company?.id, filters],
    queryFn: async (): Promise<KDSTimeAnalysisData[]> => {
      if (!company?.id) return [];

      const { data: sectors } = await supabase
        .from('print_sectors')
        .select('id, name')
        .eq('company_id', company.id);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, created_at, ready_at')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto'])
        .not('ready_at', 'is', null);

      if (error) throw error;

      const times = (orders || []).map(order => {
        const created = parseISO(order.created_at);
        const ready = parseISO(order.ready_at!);
        return differenceInMinutes(ready, created);
      }).filter(t => t > 0 && t < 180);

      const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      const minTime = times.length > 0 ? Math.min(...times) : 0;
      const maxTime = times.length > 0 ? Math.max(...times) : 0;

      return (sectors || [{ id: 'geral', name: 'Produção Geral' }]).map(sector => ({
        sector_name: sector.name,
        total_orders: orders?.length || 0,
        avg_time_minutes: Math.round(avgTime),
        min_time_minutes: minTime,
        max_time_minutes: maxTime,
      }));
    },
    enabled: !!company?.id,
  });
}

export function useKDSTimeByDayReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-kds-day', company?.id, filters],
    queryFn: async (): Promise<KDSTimeByDayData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, created_at, ready_at')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto'])
        .not('ready_at', 'is', null);

      if (error) throw error;

      const dailyData: Record<string, { orders: number; totalTime: number; delayed: number }> = {};

      (orders || []).forEach(order => {
        const date = format(parseISO(order.created_at), 'yyyy-MM-dd');
        const created = parseISO(order.created_at);
        const ready = parseISO(order.ready_at!);
        const timeMinutes = differenceInMinutes(ready, created);
        
        if (!dailyData[date]) {
          dailyData[date] = { orders: 0, totalTime: 0, delayed: 0 };
        }

        dailyData[date].orders += 1;
        dailyData[date].totalTime += timeMinutes;
        if (timeMinutes > 30) {
          dailyData[date].delayed += 1;
        }
      });

      return Object.entries(dailyData).map(([date, data]) => ({
        date,
        total_orders: data.orders,
        avg_time_minutes: data.orders > 0 ? Math.round(data.totalTime / data.orders) : 0,
        delayed_orders: data.delayed,
      })).sort((a, b) => b.date.localeCompare(a.date));
    },
    enabled: !!company?.id,
  });
}

export function usePurchaseRecurrenceReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-purchase-recurrence', company?.id, filters],
    queryFn: async (): Promise<PurchaseRecurrenceData[]> => {
      if (!company?.id) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, created_at, customer_id, customer_name, customer_phone, total')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto'])
        .not('customer_id', 'is', null);

      if (error) throw error;

      const customerData: Record<string, {
        name: string;
        phone: string;
        orders: { date: string; total: number }[];
      }> = {};

      (orders || []).forEach(order => {
        const customerId = order.customer_id!;
        if (!customerData[customerId]) {
          customerData[customerId] = {
            name: order.customer_name || 'Cliente',
            phone: order.customer_phone || '',
            orders: [],
          };
        }
        customerData[customerId].orders.push({
          date: order.created_at,
          total: Number(order.total || 0),
        });
      });

      return Object.entries(customerData)
        .filter(([_, data]) => data.orders.length >= 2)
        .map(([customerId, data]) => {
          const sortedOrders = data.orders.sort((a, b) => a.date.localeCompare(b.date));
          const firstOrder = sortedOrders[0];
          const lastOrder = sortedOrders[sortedOrders.length - 1];
          const totalSpent = sortedOrders.reduce((sum, o) => sum + o.total, 0);
          
          let totalDays = 0;
          for (let i = 1; i < sortedOrders.length; i++) {
            const d1 = parseISO(sortedOrders[i - 1].date);
            const d2 = parseISO(sortedOrders[i].date);
            totalDays += Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
          }
          const avgDays = sortedOrders.length > 1 ? Math.round(totalDays / (sortedOrders.length - 1)) : 0;

          return {
            customer_id: customerId,
            customer_name: data.name,
            phone: data.phone,
            total_orders: sortedOrders.length,
            first_order_date: firstOrder.date,
            last_order_date: lastOrder.date,
            avg_days_between: avgDays,
            total_spent: totalSpent,
          };
        })
        .sort((a, b) => b.total_orders - a.total_orders);
    },
    enabled: !!company?.id,
  });
}
