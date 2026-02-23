import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import type { SaaSPlan } from '../types';

export function useSaaSPlans() {
  const plansQuery = useQuery({
    queryKey: ['saas-plans'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('saas_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      
      // Parse features JSON
      return (data as any[]).map(plan => ({
        ...plan,
        features: typeof plan.features === 'string' 
          ? JSON.parse(plan.features) 
          : plan.features || [],
      })) as SaaSPlan[];
    },
  });

  return {
    plans: plansQuery.data || [],
    isLoading: plansQuery.isLoading,
  };
}
