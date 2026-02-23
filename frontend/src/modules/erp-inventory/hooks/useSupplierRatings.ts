import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface SupplierRating {
  id: string;
  company_id: string;
  supplier_id: string;
  purchase_entry_id: string | null;
  rating: number;
  delivery_rating: number | null;
  quality_rating: number | null;
  price_rating: number | null;
  notes: string | null;
  rated_by: string | null;
  created_at: string;
}

export function useSupplierRatings(supplierId?: string) {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  const { data: ratings, isLoading } = useQuery({
    queryKey: ['supplier-ratings', company?.id, supplierId],
    queryFn: async () => {
      let query = supabase
        .from('supplier_ratings')
        .select('*')
        .eq('company_id', company!.id)
        .order('created_at', { ascending: false });

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SupplierRating[];
    },
    enabled: !!company?.id,
  });

  const createRating = useMutation({
    mutationFn: async (rating: Omit<SupplierRating, 'id' | 'created_at' | 'company_id'>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('supplier_ratings')
        .insert({
          ...rating,
          company_id: company!.id,
          rated_by: userData.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-ratings'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Avaliação registrada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao registrar avaliação');
    },
  });

  const avgRatings = ratings?.length
    ? {
        overall: ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length,
        delivery: ratings.filter(r => r.delivery_rating).reduce((acc, r) => acc + (r.delivery_rating || 0), 0) / ratings.filter(r => r.delivery_rating).length || 0,
        quality: ratings.filter(r => r.quality_rating).reduce((acc, r) => acc + (r.quality_rating || 0), 0) / ratings.filter(r => r.quality_rating).length || 0,
        price: ratings.filter(r => r.price_rating).reduce((acc, r) => acc + (r.price_rating || 0), 0) / ratings.filter(r => r.price_rating).length || 0,
      }
    : null;

  return {
    ratings,
    isLoading,
    createRating,
    avgRatings,
  };
}
