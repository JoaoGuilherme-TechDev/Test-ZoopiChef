import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface LoyaltyRedemption {
  id: string;
  company_id: string;
  customer_id: string;
  reward_id: string;
  order_id: string | null;
  points_used: number;
  complementary_value_cents: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  cancelled_reason: string | null;
  redeemed_at: string;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    whatsapp: string;
  };
  reward?: {
    id: string;
    name: string;
    points_required: number;
  };
  order?: {
    id: string;
    order_number: number;
  };
}

export function useLoyaltyRedemptions() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['loyalty-redemptions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from('loyalty_redemptions')
        .select(`
          *,
          customer:customers(id, name, whatsapp),
          reward:loyalty_rewards(id, name, points_required),
          order:orders(id, order_number)
        `)
        .eq('company_id', company.id)
        .order('redeemed_at', { ascending: false });
      
      if (error) throw error;
      return data as LoyaltyRedemption[];
    },
    enabled: !!company?.id,
  });

  const create = useMutation({
    mutationFn: async (data: {
      customer_id: string;
      reward_id: string;
      order_id: string;
      points_used: number;
      complementary_value_cents?: number;
    }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      // Validar que tem pedido (regra anti-fraude)
      if (!data.order_id) {
        throw new Error('Resgate só é permitido com uma compra junto');
      }
      
      const { error } = await (supabase as any)
        .from('loyalty_redemptions')
        .insert({
          company_id: company.id,
          customer_id: data.customer_id,
          reward_id: data.reward_id,
          order_id: data.order_id,
          points_used: data.points_used,
          complementary_value_cents: data.complementary_value_cents || 0,
          status: 'confirmed',
        });
      
      if (error) throw error;
      
      // Deduzir pontos do cliente diretamente
      // Buscar saldo atual
      const { data: currentPoints } = await supabase
        .from('customer_loyalty_points')
        .select('current_points, total_redeemed')
        .eq('customer_id', data.customer_id)
        .eq('company_id', company.id)
        .maybeSingle();
      
      if (currentPoints) {
        await supabase
          .from('customer_loyalty_points')
          .update({
            current_points: Math.max(0, (currentPoints.current_points || 0) - data.points_used),
            total_redeemed: (currentPoints.total_redeemed || 0) + data.points_used,
          })
          .eq('customer_id', data.customer_id)
          .eq('company_id', company.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['customer-loyalty-points'] });
      toast.success('Resgate confirmado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao processar resgate');
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, cancelled_reason }: {
      id: string;
      status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
      cancelled_reason?: string;
    }) => {
      const updateData: any = { status };
      
      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }
      if (status === 'cancelled' && cancelled_reason) {
        updateData.cancelled_reason = cancelled_reason;
      }
      
      const { error } = await (supabase as any)
        .from('loyalty_redemptions')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-redemptions'] });
      toast.success('Status atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar status');
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    create,
    updateStatus,
  };
}
