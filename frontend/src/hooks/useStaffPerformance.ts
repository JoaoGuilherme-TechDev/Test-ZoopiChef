import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface StaffPerformanceSettings {
  company_id: string;
  enabled: boolean;
  track_sales_per_hour: boolean;
  track_avg_ticket: boolean;
  track_upsell_rate: boolean;
  track_table_turnover: boolean;
  track_customer_ratings: boolean;
  gamification_enabled: boolean;
  show_leaderboard: boolean;
  daily_goals_enabled: boolean;
}

export interface StaffMetrics {
  id: string;
  company_id: string;
  user_id: string;
  metric_date: string;
  orders_completed: number;
  total_sales_cents: number;
  avg_ticket_cents: number;
  upsells_attempted: number;
  upsells_converted: number;
  tables_served: number;
  avg_table_time_minutes: number | null;
  customer_ratings_sum: number;
  customer_ratings_count: number;
  tips_received_cents: number;
}

export interface StaffGoal {
  id: string;
  company_id: string;
  user_id: string | null;
  goal_type: string;
  target_value: number;
  period: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export function useStaffPerformanceSettings() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['staff-performance-settings', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      const { data, error } = await supabase
        .from('staff_performance_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();
      if (error) throw error;
      return data as StaffPerformanceSettings | null;
    },
    enabled: !!profile?.company_id
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<StaffPerformanceSettings>) => {
      if (!profile?.company_id) throw new Error('No company');
      const { error } = await supabase
        .from('staff_performance_settings')
        .upsert({ company_id: profile.company_id, ...updates, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-performance-settings'] });
      toast.success('Configurações salvas');
    },
    onError: () => toast.error('Erro ao salvar')
  });

  return { settings, isLoading, updateSettings };
}

export function useStaffMetrics(days: number = 7) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['staff-metrics', profile?.company_id, days],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('staff_performance_metrics')
        .select('*')
        .eq('company_id', profile.company_id)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: false });
      if (error) throw error;
      return data as StaffMetrics[];
    },
    enabled: !!profile?.company_id
  });
}

export function useStaffLeaderboard() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['staff-leaderboard', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: metrics, error } = await supabase
        .from('staff_performance_metrics')
        .select('user_id, total_sales_cents, orders_completed, upsells_converted')
        .eq('company_id', profile.company_id)
        .gte('metric_date', weekAgo.toISOString().split('T')[0]);
      
      if (error) throw error;
      
      // Aggregate by user
      const userMetrics = (metrics as StaffMetrics[]).reduce((acc, m) => {
        if (!acc[m.user_id]) {
          acc[m.user_id] = { 
            user_id: m.user_id, 
            total_sales: 0, 
            orders: 0, 
            upsells: 0 
          };
        }
        acc[m.user_id].total_sales += m.total_sales_cents;
        acc[m.user_id].orders += m.orders_completed;
        acc[m.user_id].upsells += m.upsells_converted;
        return acc;
      }, {} as Record<string, { user_id: string; total_sales: number; orders: number; upsells: number }>);
      
      // Get user names
      const userIds = Object.keys(userMetrics);
      if (userIds.length === 0) return [];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      const profileMap = (profilesData || []).reduce((acc, p) => {
        acc[p.id] = p.full_name || 'Desconhecido';
        return acc;
      }, {} as Record<string, string>);
      
      return Object.values(userMetrics)
        .map(m => ({
          ...m,
          name: profileMap[m.user_id] || 'Desconhecido'
        }))
        .sort((a, b) => b.total_sales - a.total_sales);
    },
    enabled: !!profile?.company_id
  });
}

export function useStaffGoals() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: goals, isLoading } = useQuery({
    queryKey: ['staff-goals', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from('staff_goals')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('is_active', true);
      if (error) throw error;
      return data as StaffGoal[];
    },
    enabled: !!profile?.company_id
  });

  const createGoal = useMutation({
    mutationFn: async (goal: { goal_type: string; target_value: number; user_id?: string; period?: string; start_date?: string; end_date?: string }) => {
      if (!profile?.company_id) throw new Error('No company');
      const { error } = await supabase
        .from('staff_goals')
        .insert({ 
          company_id: profile.company_id, 
          goal_type: goal.goal_type,
          target_value: goal.target_value,
          user_id: goal.user_id,
          period: goal.period,
          start_date: goal.start_date,
          end_date: goal.end_date
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-goals'] });
      toast.success('Meta criada');
    }
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff_goals')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-goals'] });
      toast.success('Meta removida');
    }
  });

  return { goals, isLoading, createGoal, deleteGoal };
}
