import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';

export interface CashClosing {
  id: string;
  company_id: string;
  closed_at: string;
  total_orders: number;
  total_revenue: number;
  notes: string | null;
  created_at: string;
}

export function useCashClosing() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const { data: closings = [], isLoading } = useQuery({
    queryKey: ['cash_closings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_closings')
        .select('*')
        .order('closed_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as CashClosing[];
    },
    enabled: !!profile?.company_id,
  });

  const closeCash = useMutation({
    mutationFn: async ({ totalOrders, totalRevenue, notes }: { 
      totalOrders: number; 
      totalRevenue: number; 
      notes?: string;
    }) => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');
      
      const { error } = await supabase
        .from('cash_closings')
        .insert({
          company_id: profile.company_id,
          total_orders: totalOrders,
          total_revenue: totalRevenue,
          notes,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash_closings'] });
    },
  });

  const getLastClosing = () => closings[0] || null;

  return {
    closings,
    isLoading,
    closeCash,
    getLastClosing,
  };
}
