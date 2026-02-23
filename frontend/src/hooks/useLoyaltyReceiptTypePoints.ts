import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface LoyaltyReceiptTypePoints {
  id: string;
  company_id: string;
  receipt_type_id: string;
  bonus_points: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  receipt_type?: {
    id: string;
    name: string;
    code: string;
    icon: string;
  };
}

export function useLoyaltyReceiptTypePoints() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['loyalty-receipt-type-points', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from('loyalty_receipt_type_points')
        .select(`
          *,
          receipt_type:order_receipt_types(id, name, code, icon)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LoyaltyReceiptTypePoints[];
    },
    enabled: !!company?.id,
  });

  const upsert = useMutation({
    mutationFn: async (data: { receipt_type_id: string; bonus_points: number; multiplier?: number; active?: boolean }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      const { error } = await (supabase as any)
        .from('loyalty_receipt_type_points')
        .upsert({
          company_id: company.id,
          receipt_type_id: data.receipt_type_id,
          bonus_points: data.bonus_points,
          multiplier: data.multiplier ?? 1.0,
          active: data.active ?? true,
        }, { onConflict: 'company_id,receipt_type_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-receipt-type-points'] });
      toast.success('Bônus de frete atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar bônus');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('loyalty_receipt_type_points')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-receipt-type-points'] });
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
