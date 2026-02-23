import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface Coupon {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed' | 'free_delivery';
  discount_value: number;
  min_order_value: number;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  per_customer_limit: number;
  valid_from: string;
  valid_until: string | null;
  first_order_only: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  customer_id: string | null;
  order_id: string | null;
  discount_applied: number;
  used_at: string;
}

export function useCoupons() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['coupons', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!company?.id,
  });

  const createCoupon = useMutation({
    mutationFn: async (coupon: Omit<Partial<Coupon>, 'id' | 'company_id' | 'created_at' | 'usage_count'> & { code: string; name: string; discount_type: 'percentage' | 'fixed' | 'free_delivery' }) => {
      const { error } = await supabase
        .from('coupons')
        .insert({
          code: coupon.code.toUpperCase(),
          name: coupon.name,
          description: coupon.description,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value || 0,
          min_order_value: coupon.min_order_value || 0,
          max_discount: coupon.max_discount,
          usage_limit: coupon.usage_limit,
          per_customer_limit: coupon.per_customer_limit || 1,
          valid_from: coupon.valid_from || new Date().toISOString(),
          valid_until: coupon.valid_until,
          first_order_only: coupon.first_order_only || false,
          is_active: coupon.is_active ?? true,
          company_id: company!.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom criado!');
    },
    onError: (e: any) => {
      if (e.code === '23505') {
        toast.error('Código de cupom já existe');
      } else {
        toast.error('Erro ao criar cupom');
      }
    },
  });

  const updateCoupon = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Coupon> & { id: string }) => {
      const { error } = await supabase
        .from('coupons')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar cupom'),
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      // Hard delete: remove permanently from database
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom excluído!');
    },
    onError: () => toast.error('Erro ao excluir cupom'),
  });

  return {
    coupons,
    activeCoupons: coupons.filter(c => c.is_active),
    isLoading,
    createCoupon: createCoupon.mutate,
    updateCoupon: updateCoupon.mutate,
    deleteCoupon: deleteCoupon.mutate,
    isCreating: createCoupon.isPending,
  };
}

// Hook para validar cupom no cardápio público
export function useValidateCoupon() {
  return useMutation({
    mutationFn: async ({ code, companyId, orderTotal, customerId }: {
      code: string;
      companyId: string;
      orderTotal: number;
      customerId?: string;
    }) => {
      // Buscar cupom
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('company_id', companyId)
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching coupon:', error);
        throw new Error('Erro ao buscar cupom');
      }
      
      if (!coupon) {
        throw new Error('Cupom inválido ou não encontrado');
      }

      // Verificar validade
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        throw new Error('Cupom ainda não está válido');
      }
      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        throw new Error('Cupom expirado');
      }

      // Verificar limite de uso
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        throw new Error('Cupom esgotado');
      }

      // Verificar valor mínimo
      if (coupon.min_order_value && orderTotal < coupon.min_order_value) {
        throw new Error(`Pedido mínimo de R$ ${coupon.min_order_value.toFixed(2)}`);
      }

      // Verificar uso por cliente
      if (customerId && coupon.per_customer_limit) {
        const { count } = await supabase
          .from('coupon_usage')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('customer_id', customerId);
        
        if (count && count >= coupon.per_customer_limit) {
          throw new Error('Você já usou este cupom');
        }
      }

      // Verificar primeira compra
      if (coupon.first_order_only && customerId) {
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('customer_id', customerId);
        
        if (count && count > 0) {
          throw new Error('Cupom válido apenas para primeira compra');
        }
      }

      // Calcular desconto
      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = orderTotal * (coupon.discount_value / 100);
        if (coupon.max_discount) {
          discount = Math.min(discount, coupon.max_discount);
        }
      } else if (coupon.discount_type === 'fixed') {
        discount = coupon.discount_value;
      }
      // free_delivery será tratado na lógica de delivery

      return {
        coupon,
        discount,
        isFreeDelivery: coupon.discount_type === 'free_delivery',
      };
    },
  });
}
