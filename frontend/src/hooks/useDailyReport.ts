import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface DailyReport {
  id: string;
  company_id: string;
  report_date: string;
  total_orders: number;
  total_revenue_cents: number;
  avg_preparation_time_minutes: number | null;
  avg_delivery_time_minutes: number | null;
  on_time_rate: number | null;
  delayed_orders_count: number;
  top_products: Array<{ name: string; count: number; revenue: number }> | null;
  peak_hours: Array<{ hour: number; orders: number }> | null;
  recommendations: string[] | null;
  sent_at: string | null;
  created_at: string;
}

export function useDailyReport() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Fetch recent reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ['daily-reports', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('daily_performance_reports')
        .select('*')
        .eq('company_id', company.id)
        .order('report_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      
      // Parse JSON fields properly
      return (data || []).map(row => ({
        ...row,
        top_products: Array.isArray(row.top_products) ? row.top_products : [],
        peak_hours: Array.isArray(row.peak_hours) ? row.peak_hours : [],
        recommendations: Array.isArray(row.recommendations) ? row.recommendations : [],
      })) as DailyReport[];
    },
    enabled: !!company?.id,
  });

  // Generate report
  const generateReport = useMutation({
    mutationFn: async (params?: { send_whatsapp?: boolean; manager_phone?: string }) => {
      if (!company?.id) throw new Error('No company');

      const { data, error } = await supabase.functions.invoke('daily-report', {
        body: { 
          company_id: company.id,
          send_whatsapp: params?.send_whatsapp,
          manager_phone: params?.manager_phone,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
      toast.success(data.sent ? 'Relatório gerado e enviado!' : 'Relatório gerado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao gerar relatório: ' + error.message);
    },
  });

  // Get today's report
  const todayReport = reports?.find(r => 
    r.report_date === new Date().toISOString().split('T')[0]
  );

  return {
    reports: reports ?? [],
    todayReport,
    isLoading,
    generateReport,
  };
}
