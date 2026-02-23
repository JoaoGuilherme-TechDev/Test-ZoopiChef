import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface CustomerLevel {
  id: string;
  company_id: string;
  name: string;
  min_points: number;
  icon: string | null;
  color: string | null;
  benefits: unknown[];
  multiplier: number;
  display_order: number;
}

export interface Achievement {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  requirement_type: string;
  requirement_value: number;
  points_reward: number;
  is_hidden: boolean;
  is_active: boolean;
}

export interface Challenge {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  challenge_type: string;
  target_value: number;
  points_reward: number;
  credit_reward_cents: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export function useCustomerLevels() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['customer-levels', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('customer_levels')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('min_points', { ascending: true });

      if (error) throw error;
      return data as CustomerLevel[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useCreateLevel() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (level: { name: string; min_points: number; icon?: string; color?: string; multiplier?: number; display_order?: number }) => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase
        .from('customer_levels')
        .insert([{
          company_id: profile.company_id,
          name: level.name,
          min_points: level.min_points,
          icon: level.icon || null,
          color: level.color || null,
          multiplier: level.multiplier || 1.0,
          display_order: level.display_order || 0,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-levels'] });
      toast.success('Nível criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar nível:', error);
      toast.error('Erro ao criar nível');
    },
  });
}

export function useAchievements() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['achievements', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('requirement_value', { ascending: true });

      if (error) throw error;
      return data as Achievement[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useCreateAchievement() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (achievement: { name: string; requirement_type: string; requirement_value: number; description?: string; icon?: string; category?: string; points_reward?: number; is_hidden?: boolean }) => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase
        .from('achievements')
        .insert([{
          company_id: profile.company_id,
          name: achievement.name,
          requirement_type: achievement.requirement_type,
          requirement_value: achievement.requirement_value,
          description: achievement.description || null,
          icon: achievement.icon || null,
          category: achievement.category || null,
          points_reward: achievement.points_reward || 0,
          is_hidden: achievement.is_hidden || false,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      toast.success('Conquista criada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar conquista:', error);
      toast.error('Erro ao criar conquista');
    },
  });
}

export function useChallenges() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['challenges', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('end_date', { ascending: false });

      if (error) throw error;
      return data as Challenge[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (challenge: { title: string; challenge_type: string; target_value: number; start_date: string; end_date: string; description?: string; points_reward?: number; credit_reward_cents?: number }) => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase
        .from('challenges')
        .insert([{
          company_id: profile.company_id,
          title: challenge.title,
          challenge_type: challenge.challenge_type,
          target_value: challenge.target_value,
          start_date: challenge.start_date,
          end_date: challenge.end_date,
          description: challenge.description || null,
          points_reward: challenge.points_reward || 0,
          credit_reward_cents: challenge.credit_reward_cents || 0,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      toast.success('Desafio criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar desafio:', error);
      toast.error('Erro ao criar desafio');
    },
  });
}

export function useGamificationStats() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['gamification-stats', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      const [
        { count: totalCustomersGamified },
        { data: achievements },
        { data: challenges },
      ] = await Promise.all([
        supabase
          .from('customer_gamification')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', profile.company_id),
        supabase
          .from('customer_achievements')
          .select('id')
          .eq('company_id', profile.company_id),
        supabase
          .from('customer_challenges')
          .select('completed')
          .eq('company_id', profile.company_id),
      ]);

      return {
        totalCustomersGamified: totalCustomersGamified || 0,
        totalAchievementsUnlocked: achievements?.length || 0,
        totalChallengesCompleted: challenges?.filter(c => c.completed).length || 0,
        activeChallenges: challenges?.filter(c => !c.completed).length || 0,
      };
    },
    enabled: !!profile?.company_id,
  });
}
