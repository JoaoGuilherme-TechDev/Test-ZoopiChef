import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export interface CustomerReward {
  id: string;
  company_id: string;
  customer_id: string;
  phone: string;
  reward_type: 'percentage' | 'fixed_value' | 'free_item';
  reward_value: number; // % or cents
  reward_scope: 'all' | 'category' | 'product';
  reward_scope_id?: string;
  status: 'pending' | 'applied' | 'expired';
  source: string;
  created_at: string;
  expires_at: string;
  applied_at?: string;
  applied_order_id?: string;
  prize_name?: string;
}

export function useCustomerRewards() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['customer-rewards', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('customer_rewards')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomerReward[];
    },
    enabled: !!company?.id,
  });

  const applyReward = useMutation({
    mutationFn: async ({ rewardId, orderId }: { rewardId: string; orderId: string }) => {
      const { error } = await supabase
        .from('customer_rewards')
        .update({ 
          status: 'applied', 
          applied_at: new Date().toISOString(),
          applied_order_id: orderId,
        })
        .eq('id', rewardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-rewards'] });
    },
  });

  return {
    rewards,
    isLoading,
    applyReward: applyReward.mutateAsync,
  };
}

// Hook to get pending rewards for a customer phone in a specific company
export function usePublicCustomerReward(companyId: string | undefined, phone: string | undefined) {
  const normalizedPhone = phone?.replace(/\D/g, '') || '';

  const { data: reward, isLoading, refetch } = useQuery({
    queryKey: ['public-customer-reward', companyId, normalizedPhone],
    queryFn: async () => {
      if (!companyId || !normalizedPhone) return null;

      const { data, error } = await supabase
        .from('customer_rewards')
        .select('*')
        .eq('company_id', companyId)
        .eq('phone', normalizedPhone)
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;
      return data as CustomerReward | null;
    },
    enabled: !!companyId && !!normalizedPhone,
  });

  return { reward, isLoading, refetch };
}

// Hook to apply a reward to an order
export function useApplyCustomerReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rewardId, orderId }: { rewardId: string; orderId: string }) => {
      const { error } = await supabase
        .from('customer_rewards')
        .update({ 
          status: 'applied', 
          applied_at: new Date().toISOString(),
          applied_order_id: orderId,
        })
        .eq('id', rewardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-customer-reward'] });
      queryClient.invalidateQueries({ queryKey: ['customer-rewards'] });
    },
  });
}
