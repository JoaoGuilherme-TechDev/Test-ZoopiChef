import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface LoyaltyProductPoints {
  id: string;
  company_id: string;
  product_id: string;
  bonus_points: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    image_url: string | null;
  };
}

export function useLoyaltyProductPoints() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['loyalty-product-points', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from('loyalty_product_points')
        .select(`
          *,
          product:products(id, name, image_url)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LoyaltyProductPoints[];
    },
    enabled: !!company?.id,
  });

  const upsert = useMutation({
    mutationFn: async (data: { product_id: string; bonus_points: number; active?: boolean }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      const { error } = await (supabase as any)
        .from('loyalty_product_points')
        .upsert({
          company_id: company.id,
          product_id: data.product_id,
          bonus_points: data.bonus_points,
          active: data.active ?? true,
        }, { onConflict: 'company_id,product_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-product-points'] });
      toast.success('Pontos do produto atualizados!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar pontos');
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('loyalty_product_points')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-product-points'] });
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
