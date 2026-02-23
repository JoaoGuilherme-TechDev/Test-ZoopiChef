import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface LoyaltyPaymentMethodPoints {
  id: string;
  company_id: string;
  payment_method: string;
  bonus_points: number;
  multiplier: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
  { value: 'pix', label: 'PIX', icon: '📱' },
  { value: 'credito', label: 'Cartão de Crédito', icon: '💳' },
  { value: 'debito', label: 'Cartão de Débito', icon: '💳' },
  { value: 'vale_refeicao', label: 'Vale Refeição', icon: '🍽️' },
  { value: 'vale_alimentacao', label: 'Vale Alimentação', icon: '🛒' },
  { value: 'credito_loja', label: 'Crédito da Loja', icon: '🏪' },
];

export { PAYMENT_METHODS };

export function useLoyaltyPaymentMethodPoints() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['loyalty-payment-method-points', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await (supabase as any)
        .from('loyalty_payment_method_points')
        .select('*')
        .eq('company_id', company.id)
        .order('payment_method');

      if (error) throw error;
      return data as LoyaltyPaymentMethodPoints[];
    },
    enabled: !!company?.id,
  });

  const upsert = useMutation({
    mutationFn: async (data: { payment_method: string; bonus_points: number; multiplier?: number; active?: boolean }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const { error } = await (supabase as any)
        .from('loyalty_payment_method_points')
        .upsert({
          company_id: company.id,
          payment_method: data.payment_method,
          bonus_points: data.bonus_points,
          multiplier: data.multiplier ?? 1.0,
          active: data.active ?? true,
        }, { onConflict: 'company_id,payment_method' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-payment-method-points'] });
      toast.success('Pontos por método de pagamento atualizados!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('loyalty_payment_method_points')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-payment-method-points'] });
      toast.success('Configuração removida!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover');
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    upsert,
    remove,
  };
}
