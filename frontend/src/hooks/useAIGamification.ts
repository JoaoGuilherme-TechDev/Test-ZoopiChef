import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

export function useAutoSetupGamification() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-gamification', {
        body: {
          company_id: profile.company_id,
          action: 'auto_setup',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-levels'] });
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      toast.success(data?.message || 'Gamificação configurada automaticamente!');
    },
    onError: (error) => {
      console.error('Erro ao configurar gamificação:', error);
      toast.error('Erro ao configurar gamificação automática');
    },
  });
}

export function useCheckAchievements() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-gamification', {
        body: {
          company_id: profile.company_id,
          action: 'check_achievements',
          customer_id: customerId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-achievements'] });
      if (data?.new_achievements?.length > 0) {
        toast.success(data.message);
      }
    },
  });
}

export function useCalculatePoints() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, orderId }: { customerId: string; orderId: string }) => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-gamification', {
        body: {
          company_id: profile.company_id,
          action: 'calculate_points',
          customer_id: customerId,
          order_id: orderId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-gamification'] });
      if (data?.points_earned > 0) {
        toast.success(data.message);
      }
    },
  });
}
