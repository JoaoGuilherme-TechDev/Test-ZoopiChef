import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, subWeeks, format, getWeek, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface WeeklyComparisonReport {
  id: string;
  company_id: string;
  report_date: string;
  week_number: number;
  year: number;
  current_total_orders: number;
  current_total_revenue_cents: number;
  current_avg_ticket_cents: number;
  current_total_customers: number;
  current_new_customers: number;
  previous_total_orders: number;
  previous_total_revenue_cents: number;
  previous_avg_ticket_cents: number;
  previous_total_customers: number;
  previous_new_customers: number;
  same_week_last_month_orders: number;
  same_week_last_month_revenue_cents: number;
  same_week_last_month_avg_ticket_cents: number;
  orders_variation_percent: number | null;
  revenue_variation_percent: number | null;
  customers_variation_percent: number | null;
  top_products: any[] | null;
  peak_days: any[] | null;
  insights: string[] | null;
  created_at: string;
}

export interface WeeklyMetrics {
  totalOrders: number;
  totalRevenueCents: number;
  avgTicketCents: number;
  totalCustomers: number;
  newCustomers: number;
}

async function fetchWeekMetrics(companyId: string, weekStart: Date, weekEnd: Date): Promise<WeeklyMetrics> {
  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endStr = format(weekEnd, 'yyyy-MM-dd');

  // Fetch orders for the week
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total, customer_id, created_at')
    .eq('company_id', companyId)
    .gte('created_at', `${startStr}T00:00:00`)
    .lte('created_at', `${endStr}T23:59:59`)
    .is('cancelled_at', null);

  if (error) throw error;

  const ordersList = orders || [];
  const totalOrders = ordersList.length;
  const totalRevenueCents = ordersList.reduce((sum, o) => sum + Math.round((o.total || 0) * 100), 0);
  const avgTicketCents = totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;
  
  // Unique customers
  const customerIds = new Set(ordersList.filter(o => o.customer_id).map(o => o.customer_id));
  const totalCustomers = customerIds.size;

  // For new customers, we'd need to check first order date - simplified here
  const newCustomers = 0; // Would require more complex query

  return {
    totalOrders,
    totalRevenueCents,
    avgTicketCents,
    totalCustomers,
    newCustomers,
  };
}

export function useWeeklyComparison() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['weekly-comparison', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('weekly_comparison_reports')
        .select('*')
        .eq('company_id', company.id)
        .order('report_date', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data as WeeklyComparisonReport[];
    },
    enabled: !!company?.id,
  });

  const generateReport = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const today = new Date();
      const currentWeekStart = startOfWeek(today, { locale: ptBR });
      const currentWeekEnd = endOfWeek(today, { locale: ptBR });
      
      const previousWeekStart = subWeeks(currentWeekStart, 1);
      const previousWeekEnd = subWeeks(currentWeekEnd, 1);
      
      const sameWeekLastMonthStart = subWeeks(currentWeekStart, 4);
      const sameWeekLastMonthEnd = subWeeks(currentWeekEnd, 4);

      // Fetch metrics for all periods
      const [currentMetrics, previousMetrics, lastMonthMetrics] = await Promise.all([
        fetchWeekMetrics(company.id, currentWeekStart, currentWeekEnd),
        fetchWeekMetrics(company.id, previousWeekStart, previousWeekEnd),
        fetchWeekMetrics(company.id, sameWeekLastMonthStart, sameWeekLastMonthEnd),
      ]);

      // Calculate variations
      const ordersVariation = previousMetrics.totalOrders > 0
        ? ((currentMetrics.totalOrders - previousMetrics.totalOrders) / previousMetrics.totalOrders) * 100
        : null;
      
      const revenueVariation = previousMetrics.totalRevenueCents > 0
        ? ((currentMetrics.totalRevenueCents - previousMetrics.totalRevenueCents) / previousMetrics.totalRevenueCents) * 100
        : null;

      const customersVariation = previousMetrics.totalCustomers > 0
        ? ((currentMetrics.totalCustomers - previousMetrics.totalCustomers) / previousMetrics.totalCustomers) * 100
        : null;

      // Generate insights
      const insights: string[] = [];
      if (ordersVariation !== null) {
        if (ordersVariation > 10) insights.push(`Pedidos aumentaram ${ordersVariation.toFixed(1)}% em relação à semana anterior`);
        else if (ordersVariation < -10) insights.push(`Pedidos diminuíram ${Math.abs(ordersVariation).toFixed(1)}% em relação à semana anterior`);
      }
      if (revenueVariation !== null && revenueVariation > 0) {
        insights.push(`Faturamento cresceu ${revenueVariation.toFixed(1)}%`);
      }

      // Upsert report
      const { data, error } = await supabase
        .from('weekly_comparison_reports')
        .upsert({
          company_id: company.id,
          report_date: format(today, 'yyyy-MM-dd'),
          week_number: getWeek(today, { locale: ptBR }),
          year: getYear(today),
          current_total_orders: currentMetrics.totalOrders,
          current_total_revenue_cents: currentMetrics.totalRevenueCents,
          current_avg_ticket_cents: currentMetrics.avgTicketCents,
          current_total_customers: currentMetrics.totalCustomers,
          current_new_customers: currentMetrics.newCustomers,
          previous_total_orders: previousMetrics.totalOrders,
          previous_total_revenue_cents: previousMetrics.totalRevenueCents,
          previous_avg_ticket_cents: previousMetrics.avgTicketCents,
          previous_total_customers: previousMetrics.totalCustomers,
          previous_new_customers: previousMetrics.newCustomers,
          same_week_last_month_orders: lastMonthMetrics.totalOrders,
          same_week_last_month_revenue_cents: lastMonthMetrics.totalRevenueCents,
          same_week_last_month_avg_ticket_cents: lastMonthMetrics.avgTicketCents,
          orders_variation_percent: ordersVariation,
          revenue_variation_percent: revenueVariation,
          customers_variation_percent: customersVariation,
          insights,
        }, { onConflict: 'company_id,report_date' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-comparison'] });
      toast.success('Relatório semanal gerado!');
    },
    onError: (error) => {
      toast.error('Erro ao gerar relatório: ' + error.message);
    },
  });

  const latestReport = reports[0] || null;

  return {
    reports,
    latestReport,
    isLoading,
    generateReport,
  };
}
