import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface Review {
  id: string;
  company_id: string;
  order_id: string;
  customer_id: string | null;
  rating: number;
  food_rating: number | null;
  delivery_rating: number | null;
  comment: string | null;
  reply: string | null;
  replied_at: string | null;
  is_public: boolean;
  created_at: string;
  orders?: {
    order_number: number;
    customer_name: string | null;
    total: number;
  };
}

export function useReviews() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('order_reviews')
        .select(`
          *,
          orders:order_id (order_number, customer_name, total)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!company?.id,
  });

  const replyMutation = useMutation({
    mutationFn: async ({ reviewId, reply }: { reviewId: string; reply: string }) => {
      const { error } = await supabase
        .from('order_reviews')
        .update({ reply, replied_at: new Date().toISOString() })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Resposta enviada!');
    },
    onError: () => {
      toast.error('Erro ao enviar resposta');
    },
  });

  const stats = {
    total: reviews.length,
    average: reviews.length > 0 
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
      : 0,
    byRating: [1, 2, 3, 4, 5].map(r => ({
      rating: r,
      count: reviews.filter(rev => rev.rating === r).length,
    })),
  };

  return {
    reviews,
    isLoading,
    stats,
    replyToReview: replyMutation.mutate,
    isReplying: replyMutation.isPending,
  };
}

// Hook para criar review público (sem auth)
export function useCreatePublicReview() {
  return useMutation({
    mutationFn: async (review: {
      company_id: string;
      order_id: string;
      customer_id?: string;
      rating: number;
      food_rating?: number;
      delivery_rating?: number;
      comment?: string;
    }) => {
      const { error } = await supabase
        .from('order_reviews')
        .insert(review);
      if (error) throw error;
    },
  });
}
