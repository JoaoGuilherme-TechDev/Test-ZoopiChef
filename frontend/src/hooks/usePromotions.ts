import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface QuantityTier {
  quantity: number;
  price: number;
}

export interface Promotion {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  promotion_type: 'buy_x_pay_y' | 'buy_x_pay_quantity' | 'happy_hour' | 'quantity_tiers';
  is_active: boolean;
  buy_quantity: number | null;
  pay_quantity: number | null;
  discount_type: 'percentage' | 'fixed_value' | 'fixed_price' | null;
  discount_value: number | null;
  start_time: string | null;
  end_time: string | null;
  valid_days: number[] | null;
  quantity_tiers: QuantityTier[] | null;
  start_date: string | null;
  end_date: string | null;
  applies_to_delivery: boolean;
  applies_to_mesa: boolean;
  applies_to_totem: boolean;
  applies_to_tablet: boolean;
  applies_to_comanda: boolean;
  applies_to_online: boolean;
  applies_to_selfservice: boolean;
  applies_to_all_products: boolean;
  product_ids: string[] | null;
  category_ids: string[] | null;
  banner_image_url: string | null;
  highlight_color: string;
  show_on_tv: boolean;
  whatsapp_message: string | null;
  instagram_caption: string | null;
  instagram_hashtags: string[] | null;
  auto_post_instagram: boolean;
  auto_send_whatsapp: boolean;
  created_at: string;
  updated_at: string;
}

function parsePromotion(data: any): Promotion {
  return {
    ...data,
    quantity_tiers: data.quantity_tiers as QuantityTier[] | null,
    valid_days: data.valid_days as number[] | null,
  };
}

export function usePromotions() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['promotions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(parsePromotion);
    },
    enabled: !!company?.id,
  });
}

export function useActivePromotions(companyId?: string) {
  return useQuery({
    queryKey: ['active_promotions', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5);
      const dayOfWeek = now.getDay();

      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${today}`)
        .or(`end_date.is.null,end_date.gte.${today}`);

      if (error) throw error;

      const promos = (data || []).map(parsePromotion);
      
      // Filter by time and day for happy hour promotions
      return promos.filter(promo => {
        if (promo.promotion_type === 'happy_hour') {
          if (promo.valid_days && !promo.valid_days.includes(dayOfWeek)) {
            return false;
          }
          if (promo.start_time && promo.end_time) {
            return currentTime >= promo.start_time && currentTime <= promo.end_time;
          }
        }
        return true;
      });
    },
    enabled: !!companyId,
    staleTime: 60 * 1000,
  });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (promotion: Record<string, any>) => {
      if (!company?.id) throw new Error('Company not found');

      const { data, error } = await supabase
        .from('promotions')
        .insert({ ...promotion, company_id: company.id } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar promoção: ' + error.message);
    },
  });
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { data, error } = await supabase
        .from('promotions')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção atualizada!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar promoção: ' + error.message);
    },
  });
}

export function useDeletePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção excluída!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir promoção: ' + error.message);
    },
  });
}

export function useTogglePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success(is_active ? 'Promoção ativada!' : 'Promoção desativada!');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });
}
