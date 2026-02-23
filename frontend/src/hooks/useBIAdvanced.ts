import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { format, subDays, eachDayOfInterval } from 'date-fns';

export interface BIMetric {
  id: string;
  company_id: string;
  metric_date: string;
  metric_type: string;
  metric_value: number;
  dimension_key: string | null;
  dimension_value: string | null;
}

export interface BIForecast {
  id: string;
  company_id: string;
  forecast_date: string;
  metric_type: string;
  predicted_value: number;
  confidence_lower: number | null;
  confidence_upper: number | null;
  model_type: string;
}

export function useBIMetricsHistory(metricType: string, days: number = 30) {
  const { data: company } = useCompany();
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['bi-metrics-history', company?.id, metricType, days],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('bi_metrics_history')
        .select('*')
        .eq('company_id', company.id)
        .eq('metric_type', metricType)
        .gte('metric_date', startDate)
        .order('metric_date');
      if (error) throw error;
      return data as BIMetric[];
    },
    enabled: !!company?.id,
  });
}

export function useBIForecasts(metricType: string) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['bi-forecasts', company?.id, metricType],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('bi_forecasts')
        .select('*')
        .eq('company_id', company.id)
        .eq('metric_type', metricType)
        .gte('forecast_date', format(new Date(), 'yyyy-MM-dd'))
        .order('forecast_date')
        .limit(30);
      if (error) throw error;
      return data as BIForecast[];
    },
    enabled: !!company?.id,
  });
}

// Calculate revenue trend and predictions
export function useRevenueTrend(days: number = 30) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['revenue-trend', company?.id, days],
    queryFn: async () => {
      if (!company?.id) return null;

      const startDate = subDays(new Date(), days);
      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, total, status')
        .eq('company_id', company.id)
        .gte('created_at', startDate.toISOString())
        .eq('status', 'entregue');

      if (error) throw error;

      // Group by day
      const dailyData = eachDayOfInterval({ start: startDate, end: new Date() }).map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOrders = orders?.filter(o => 
          format(new Date(o.created_at), 'yyyy-MM-dd') === dateStr
        ) || [];
        
        return {
          date: dateStr,
          revenue: dayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
          orders: dayOrders.length,
        };
      });

      // Calculate trend
      const revenueValues = dailyData.map(d => d.revenue);
      const avgRevenue = revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length;
      
      // Simple linear regression for trend
      const n = revenueValues.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      revenueValues.forEach((y, x) => {
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      });
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Predict next 7 days
      const predictions = [];
      for (let i = 1; i <= 7; i++) {
        const predictedValue = intercept + slope * (n + i - 1);
        predictions.push({
          date: format(subDays(new Date(), -i), 'yyyy-MM-dd'),
          predicted: Math.max(0, predictedValue),
          lower: Math.max(0, predictedValue * 0.8),
          upper: predictedValue * 1.2,
        });
      }

      return {
        historical: dailyData,
        predictions,
        avgRevenue,
        trend: slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable',
        trendPercent: avgRevenue > 0 ? ((slope * 7) / avgRevenue * 100) : 0,
      };
    },
    enabled: !!company?.id,
  });
}

// Sales by category analysis
export function useSalesByCategory(days: number = 30) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['sales-by-category', company?.id, days],
    queryFn: async () => {
      if (!company?.id) return [];

      const startDate = subDays(new Date(), days);
      const { data, error } = await (supabase
        .from('order_items') as any)
        .select(`
          quantity,
          unit_price,
          products!inner(
            id,
            name,
            category_id,
            categories(name)
          ),
          orders!inner(
            company_id,
            created_at,
            status
          )
        `)
        .eq('orders.company_id', company.id)
        .gte('orders.created_at', startDate.toISOString())
        .eq('orders.status', 'entregue');

      if (error) throw error;

      // Group by category
      const categoryMap = new Map<string, { name: string; revenue: number; quantity: number; products: Set<string> }>();
      
      data?.forEach(item => {
        const categoryName = (item.products as any)?.categories?.name || 'Sem Categoria';
        const existing = categoryMap.get(categoryName) || { name: categoryName, revenue: 0, quantity: 0, products: new Set() };
        existing.revenue += item.quantity * item.unit_price;
        existing.quantity += item.quantity;
        existing.products.add((item.products as any)?.name);
        categoryMap.set(categoryName, existing);
      });

      return Array.from(categoryMap.values())
        .map(c => ({ ...c, products: c.products.size }))
        .sort((a, b) => b.revenue - a.revenue);
    },
    enabled: !!company?.id,
  });
}

// Peak hours analysis
export function usePeakHoursAnalysis(days: number = 30) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['peak-hours', company?.id, days],
    queryFn: async () => {
      if (!company?.id) return [];

      const startDate = subDays(new Date(), days);
      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total')
        .eq('company_id', company.id)
        .gte('created_at', startDate.toISOString())
        .eq('status', 'entregue');

      if (error) throw error;

      // Group by hour
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        label: `${i.toString().padStart(2, '0')}:00`,
        orders: 0,
        revenue: 0,
      }));

      data?.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        hourlyData[hour].orders++;
        hourlyData[hour].revenue += order.total || 0;
      });

      // Find peak hours
      const maxOrders = Math.max(...hourlyData.map(h => h.orders));
      const peakHours = hourlyData.filter(h => h.orders >= maxOrders * 0.8);

      return {
        hourlyData,
        peakHours: peakHours.map(h => h.hour),
        busiest: hourlyData.reduce((max, h) => h.orders > max.orders ? h : max, hourlyData[0]),
      };
    },
    enabled: !!company?.id,
  });
}

// Customer retention analysis
export function useCustomerRetention(days: number = 90) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['customer-retention', company?.id, days],
    queryFn: async () => {
      if (!company?.id) return null;

      const startDate = subDays(new Date(), days);
      const midDate = subDays(new Date(), days / 2);

      // Get customers who ordered in first half
      const { data: firstHalfOrders } = await supabase
        .from('orders')
        .select('customer_id')
        .eq('company_id', company.id)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', midDate.toISOString())
        .not('customer_id', 'is', null);

      const firstHalfCustomers = new Set(firstHalfOrders?.map(o => o.customer_id) || []);

      // Get customers who ordered in second half
      const { data: secondHalfOrders } = await supabase
        .from('orders')
        .select('customer_id')
        .eq('company_id', company.id)
        .gte('created_at', midDate.toISOString())
        .not('customer_id', 'is', null);

      const secondHalfCustomers = new Set(secondHalfOrders?.map(o => o.customer_id) || []);

      // Calculate retention
      const retained = Array.from(firstHalfCustomers).filter(c => secondHalfCustomers.has(c)).length;
      const retentionRate = firstHalfCustomers.size > 0 ? (retained / firstHalfCustomers.size * 100) : 0;

      // New customers
      const newCustomers = Array.from(secondHalfCustomers).filter(c => !firstHalfCustomers.has(c)).length;

      return {
        firstPeriodCustomers: firstHalfCustomers.size,
        secondPeriodCustomers: secondHalfCustomers.size,
        retainedCustomers: retained,
        retentionRate,
        newCustomers,
        churnedCustomers: firstHalfCustomers.size - retained,
        churnRate: firstHalfCustomers.size > 0 ? ((firstHalfCustomers.size - retained) / firstHalfCustomers.size * 100) : 0,
      };
    },
    enabled: !!company?.id,
  });
}

// Cohort analysis
export function useCohortAnalysis() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['cohort-analysis', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      // Get all customers with their first order date
      const { data: customers } = await supabase
        .from('customers')
        .select('id, created_at')
        .eq('company_id', company.id)
        .order('created_at');

      if (!customers?.length) return [];

      // Get all orders
      const { data: orders } = await supabase
        .from('orders')
        .select('customer_id, created_at, total')
        .eq('company_id', company.id)
        .not('customer_id', 'is', null)
        .eq('status', 'entregue');

      // Group customers by cohort (month of first order)
      const cohorts = new Map<string, { customers: Set<string>; monthlyRevenue: Map<number, number> }>();

      customers.forEach(customer => {
        const cohortMonth = format(new Date(customer.created_at), 'yyyy-MM');
        if (!cohorts.has(cohortMonth)) {
          cohorts.set(cohortMonth, { customers: new Set(), monthlyRevenue: new Map() });
        }
        cohorts.get(cohortMonth)!.customers.add(customer.id);
      });

      // Calculate revenue per cohort per month
      orders?.forEach(order => {
        const customerCohort = Array.from(cohorts.entries()).find(([_, data]) => 
          data.customers.has(order.customer_id!)
        );
        
        if (customerCohort) {
          const [cohortMonth, data] = customerCohort;
          const orderMonth = format(new Date(order.created_at), 'yyyy-MM');
          const monthsDiff = Math.floor(
            (new Date(orderMonth + '-01').getTime() - new Date(cohortMonth + '-01').getTime()) / 
            (30 * 24 * 60 * 60 * 1000)
          );
          
          if (monthsDiff >= 0) {
            data.monthlyRevenue.set(monthsDiff, (data.monthlyRevenue.get(monthsDiff) || 0) + (order.total || 0));
          }
        }
      });

      return Array.from(cohorts.entries()).map(([month, data]) => ({
        cohort: month,
        customers: data.customers.size,
        revenue: Object.fromEntries(data.monthlyRevenue),
      })).slice(-6); // Last 6 months
    },
    enabled: !!company?.id,
  });
}
