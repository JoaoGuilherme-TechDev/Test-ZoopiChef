import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface LoyaltyConfig {
  company_id: string;
  enabled: boolean;
  points_per_real: number;
  min_points_to_redeem: number;
  points_expiry_days: number;
  notify_expiring_days: number;
  notify_close_to_reward_percent: number;
  auto_notify_points_earned: boolean;
  auto_notify_expiring: boolean;
  auto_notify_close_to_reward: boolean;
  birthday_bonus_points: number;
  birthday_bonus_enabled: boolean;
  welcome_bonus_points: number;
  welcome_bonus_enabled: boolean;
  ai_personalize_messages: boolean;
  customer_portal_enabled: boolean;
  portal_token: string;
}

export interface LoyaltyLevel {
  id: string;
  company_id: string;
  name: string;
  min_points: number;
  color: string;
  icon: string;
  points_multiplier: number;
  benefits: string[];
  sort_order: number;
}

export interface LoyaltyReward {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  points_cost: number;
  reward_type: string;
  reward_value: number | null;
  active: boolean;
}

export interface CustomerLoyaltyPoints {
  id: string;
  company_id: string;
  customer_id: string;
  current_points: number;
  total_earned: number;
  total_redeemed: number;
  level_id: string | null;
  birthday: string | null;
  welcome_bonus_given: boolean;
  birthday_bonus_given_year: number | null;
  notification_preferences: Record<string, boolean> | null;
  customer?: {
    id: string;
    name: string;
    whatsapp: string;
  };
  level?: LoyaltyLevel;
}

export interface LoyaltyNotification {
  id: string;
  company_id: string;
  customer_id: string;
  notification_type: string;
  message: string;
  status: string;
  scheduled_for: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  customer?: {
    name: string;
    whatsapp: string;
  };
}

export function useLoyaltyConfig() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['loyalty-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      const { data, error } = await supabase
        .from('loyalty_config')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as LoyaltyConfig | null;
    },
    enabled: !!company?.id,
  });

  const upsertConfig = useMutation({
    mutationFn: async (updates: Partial<LoyaltyConfig>) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      const { error } = await supabase
        .from('loyalty_config')
        .upsert({ company_id: company.id, ...updates }, { onConflict: 'company_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-config'] });
      toast.success('Configurações salvas!');
    },
    onError: () => {
      toast.error('Erro ao salvar');
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    upsertConfig,
  };
}

export function useLoyaltyLevels() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['loyalty-levels', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('loyalty_levels')
        .select('*')
        .eq('company_id', company.id)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as LoyaltyLevel[];
    },
    enabled: !!company?.id,
  });

  const createLevel = useMutation({
    mutationFn: async (level: Omit<LoyaltyLevel, 'id' | 'company_id'>) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      const { error } = await supabase
        .from('loyalty_levels')
        .insert({ company_id: company.id, ...level });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-levels'] });
      toast.success('Nível criado!');
    },
  });

  const updateLevel = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LoyaltyLevel> & { id: string }) => {
      const { error } = await supabase
        .from('loyalty_levels')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-levels'] });
      toast.success('Nível atualizado!');
    },
  });

  const deleteLevel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('loyalty_levels')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-levels'] });
      toast.success('Nível removido!');
    },
  });

  return {
    levels: query.data || [],
    isLoading: query.isLoading,
    createLevel,
    updateLevel,
    deleteLevel,
  };
}

export function useLoyaltyRewards() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['loyalty-rewards', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('company_id', company.id)
        .order('points_cost', { ascending: true });
      
      if (error) throw error;
      return data as LoyaltyReward[];
    },
    enabled: !!company?.id,
  });

  const createReward = useMutation({
    mutationFn: async (reward: Omit<LoyaltyReward, 'id' | 'company_id'>) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      const { error } = await supabase
        .from('loyalty_rewards')
        .insert({ company_id: company.id, ...reward });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-rewards'] });
      toast.success('Recompensa criada!');
    },
  });

  const updateReward = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LoyaltyReward> & { id: string }) => {
      const { error } = await supabase
        .from('loyalty_rewards')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-rewards'] });
      toast.success('Recompensa atualizada!');
    },
  });

  const deleteReward = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('loyalty_rewards')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-rewards'] });
      toast.success('Recompensa removida!');
    },
  });

  return {
    rewards: query.data || [],
    isLoading: query.isLoading,
    createReward,
    updateReward,
    deleteReward,
  };
}

export function useLoyaltyCustomers() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['loyalty-customers', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('customer_loyalty_points')
        .select(`
          *,
          customer:customers(id, name, whatsapp),
          level:loyalty_levels(*)
        `)
        .eq('company_id', company.id)
        .order('current_points', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as CustomerLoyaltyPoints[];
    },
    enabled: !!company?.id,
  });

  const adjustPoints = useMutation({
    mutationFn: async ({ customerId, points, description }: { customerId: string; points: number; description: string }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      // Get current points
      const { data: current } = await supabase
        .from('customer_loyalty_points')
        .select('current_points, total_earned, total_redeemed')
        .eq('customer_id', customerId)
        .eq('company_id', company.id)
        .single();
      
      const newPoints = (current?.current_points || 0) + points;
      
      // Update points
      const { error: updateError } = await supabase
        .from('customer_loyalty_points')
        .upsert({
          company_id: company.id,
          customer_id: customerId,
          current_points: Math.max(0, newPoints),
          total_earned: points > 0 ? (current?.total_earned || 0) + points : current?.total_earned || 0,
          total_redeemed: points < 0 ? (current?.total_redeemed || 0) + Math.abs(points) : current?.total_redeemed || 0,
        }, { onConflict: 'company_id,customer_id' });
      
      if (updateError) throw updateError;
      
      // Create transaction
      await supabase.from('loyalty_transactions').insert({
        company_id: company.id,
        customer_id: customerId,
        points: Math.abs(points),
        transaction_type: points > 0 ? 'earn' : 'redeem',
        description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-customers'] });
      toast.success('Pontos ajustados!');
    },
  });

  return {
    customers: query.data || [],
    isLoading: query.isLoading,
    adjustPoints,
  };
}

export function useLoyaltyNotifications() {
  const { data: company } = useCompany();

  const query = useQuery({
    queryKey: ['loyalty-notifications', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('loyalty_notifications')
        .select(`
          *,
          customer:customers(name, whatsapp)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as LoyaltyNotification[];
    },
    enabled: !!company?.id,
  });

  const stats = {
    total: query.data?.length || 0,
    sent: query.data?.filter(n => n.status === 'sent').length || 0,
    pending: query.data?.filter(n => n.status === 'pending').length || 0,
    failed: query.data?.filter(n => n.status === 'failed').length || 0,
  };

  return {
    notifications: query.data || [],
    isLoading: query.isLoading,
    stats,
  };
}

export function useLoyaltyStats() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['loyalty-stats', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      // Get customer points stats
      const { data: pointsData } = await supabase
        .from('customer_loyalty_points')
        .select('current_points, total_earned, total_redeemed')
        .eq('company_id', company.id);
      
      // Get rewards count
      const { count: rewardsCount } = await supabase
        .from('loyalty_rewards')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('active', true);

      // Get pending notifications count
      const { count: pendingNotifications } = await supabase
        .from('loyalty_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('status', 'pending');

      // Get expiring points
      const { data: expiringData } = await supabase
        .from('loyalty_points_expiry')
        .select('points')
        .eq('company_id', company.id)
        .eq('expired', false)
        .gt('expires_at', new Date().toISOString())
        .lt('expires_at', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
      
      const customers = pointsData || [];
      const totalPoints = customers.reduce((sum, c) => sum + (c.current_points || 0), 0);
      const expiringPoints = (expiringData || []).reduce((sum, e) => sum + (e.points || 0), 0);
      
      return {
        totalCustomers: customers.length,
        totalPointsCirculating: totalPoints,
        activeRewards: rewardsCount || 0,
        pendingNotifications: pendingNotifications || 0,
        expiringPoints,
      };
    },
    enabled: !!company?.id,
  });
}

// Unified hook that combines all loyalty functionality
export function useLoyalty() {
  const configHook = useLoyaltyConfig();
  const levelsHook = useLoyaltyLevels();
  const rewardsHook = useLoyaltyRewards();
  const customersHook = useLoyaltyCustomers();
  const notificationsHook = useLoyaltyNotifications();
  const statsQuery = useLoyaltyStats();

  const isLoading = configHook.isLoading || levelsHook.isLoading || 
                    rewardsHook.isLoading || customersHook.isLoading;

  return {
    // Config
    config: configHook.config,
    updateConfig: configHook.upsertConfig,
    
    // Levels
    levels: levelsHook.levels,
    createLevel: levelsHook.createLevel,
    updateLevel: levelsHook.updateLevel,
    deleteLevel: levelsHook.deleteLevel,
    
    // Rewards
    rewards: rewardsHook.rewards,
    createReward: rewardsHook.createReward,
    updateReward: rewardsHook.updateReward,
    deleteReward: rewardsHook.deleteReward,
    
    // Customers
    customers: customersHook.customers,
    adjustPoints: customersHook.adjustPoints,
    
    // Notifications
    notifications: notificationsHook.notifications,
    notificationStats: notificationsHook.stats,
    
    // Stats
    stats: statsQuery.data || {
      totalCustomers: 0,
      totalPointsCirculating: 0,
      activeRewards: 0,
      pendingNotifications: 0,
      expiringPoints: 0,
    },
    
    isLoading,
  };
}
