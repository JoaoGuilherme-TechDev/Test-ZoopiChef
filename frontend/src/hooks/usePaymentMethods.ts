import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface PaymentMethod {
  id: string;
  company_id: string;
  code: string;
  name: string;
  icon: string | null;
  active: boolean;
  requires_customer: boolean;
  is_credit: boolean;
  display_order: number;
  payment_type: string;
  status: string;
  adjustment_percent: number;
  allows_change: boolean;
  admin_fee_percent: number;
  days_to_receive: number;
  bank_account_id: string | null;
  chart_account_id: string | null;
  has_loyalty_points: boolean;
  loyalty_bonus_points: number | null;
  is_fiado: boolean;
  allows_prepaid: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const PAYMENT_TYPES = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_debito', label: 'Cartão de Débito (Não integrado)' },
  { value: 'cartao_credito', label: 'Cartão de Crédito (Não integrado)' },
  { value: 'pix', label: 'PIX (Não integrado)' },
  { value: 'conta_corrente', label: 'Conta Corrente (Fiado)' },
  { value: 'caderneta', label: 'Caderneta (Vencimento dia do Cliente)' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'vale_alimentacao', label: 'Vale Alimentação' },
  { value: 'vale_refeicao', label: 'Vale Refeição' },
  { value: 'vale_presente', label: 'Vale Presente' },
  { value: 'vale_troca', label: 'Vale Troca' },
  { value: 'tef', label: 'TEF' },
  { value: 'tef_api', label: 'TEF - Api' },
  { value: 'pagar_me', label: 'Pagar.me (Stone)' },
  { value: 'safe2pay', label: 'Safe2Pay' },
  { value: 'duplicata', label: 'Duplicata Mercantil (Não integrado)' },
  { value: 'outros', label: 'Outros' },
];

export const PAYMENT_STATUS = [
  { value: 'ativo', label: 'Ativado', icon: '✅' },
  { value: 'desativado', label: 'Desativado', icon: '🚫' },
  { value: 'arquivado', label: 'Desativado (arquivado)', icon: '❌' },
];

export function usePaymentMethods() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['payment-methods', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('company_id', company.id)
        .order('display_order')
        .order('name');

      if (error) throw error;
      return data as PaymentMethod[];
    },
    enabled: !!company?.id,
  });

  const createMethod = useMutation({
    mutationFn: async (data: Partial<PaymentMethod> & { name: string }) => {
      if (!company?.id) throw new Error('No company');
      
      const code = data.code || data.name.toLowerCase().replace(/\s+/g, '_');
      
      const { data: result, error } = await supabase
        .from('payment_methods')
        .insert([{ ...data, code, name: data.name, company_id: company.id }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Forma de pagamento criada');
    },
    onError: (error) => {
      toast.error('Erro ao criar forma de pagamento: ' + error.message);
    },
  });

  const updateMethod = useMutation({
    mutationFn: async ({ id, ...data }: Partial<PaymentMethod> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('payment_methods')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Forma de pagamento atualizada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar forma de pagamento: ' + error.message);
    },
  });

  const deleteMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Forma de pagamento removida');
    },
    onError: (error) => {
      toast.error('Erro ao remover forma de pagamento: ' + error.message);
    },
  });

  return {
    methods,
    activeMethods: methods.filter(m => m.status === 'ativo'),
    fiadoMethods: methods.filter(m => m.is_fiado),
    isLoading,
    createMethod,
    updateMethod,
    deleteMethod,
  };
}
