import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface AIMarketingPost {
  id: string;
  company_id: string;
  product_id: string | null;
  product_name: string;
  product_image_url: string | null;
  product_price: number | null;
  sale_price: number | null;
  caption: string | null;
  hashtags: string[] | null;
  image_prompt: string | null;
  generated_image_url: string | null;
  channel: 'instagram' | 'whatsapp' | 'both';
  status: 'pending' | 'approved' | 'posted' | 'failed' | 'dismissed';
  whatsapp_message: string | null;
  whatsapp_target_count: number;
  whatsapp_sent_count: number;
  whatsapp_audience_type: string | null;
  scheduled_for: string | null;
  posted_at: string | null;
  error_message: string | null;
  ai_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function useAIMarketingPosts(status?: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['ai-marketing-posts', profile?.company_id, status],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      let query = supabase
        .from('ai_marketing_posts')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as AIMarketingPost[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useGenerateMarketingPosts() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (params?: { product_id?: string; channel?: string; audience_type?: string }) => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-marketing-post', {
        body: {
          company_id: profile.company_id,
          action: 'generate',
          product_id: params?.product_id,
          channel: params?.channel || 'both',
          audience_type: params?.audience_type || 'all',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-marketing-posts'] });
      if (data?.success) {
        toast.success(data.message || 'Posts de marketing gerados!');
      } else {
        toast.warning(data?.message || 'Nenhum post gerado');
      }
    },
    onError: (error) => {
      console.error('Erro ao gerar posts:', error);
      toast.error('Erro ao gerar posts de marketing');
    },
  });
}

export function useApproveMarketingPost() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-marketing-post', {
        body: {
          company_id: profile.company_id,
          action: 'approve',
          post_id: postId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-marketing-posts'] });
      toast.success('Post aprovado!');
    },
    onError: (error) => {
      console.error('Erro ao aprovar post:', error);
      toast.error('Erro ao aprovar post');
    },
  });
}

export function useDismissMarketingPost() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-marketing-post', {
        body: {
          company_id: profile.company_id,
          action: 'dismiss',
          post_id: postId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-marketing-posts'] });
      toast.success('Post ignorado');
    },
    onError: (error) => {
      console.error('Erro ao ignorar post:', error);
      toast.error('Erro ao ignorar post');
    },
  });
}

export function useSendWhatsAppBlast() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-marketing-post', {
        body: {
          company_id: profile.company_id,
          action: 'send_whatsapp',
          post_id: postId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-marketing-posts'] });
      if (data?.simulated) {
        toast.warning(data.message);
      } else {
        toast.success(data?.message || 'Mensagens enviadas!');
      }
    },
    onError: (error) => {
      console.error('Erro ao enviar WhatsApp:', error);
      toast.error('Erro ao enviar mensagens');
    },
  });
}

export function useGetInstagramContent() {
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-marketing-post', {
        body: {
          company_id: profile.company_id,
          action: 'post_instagram',
          post_id: postId,
        },
      });

      if (error) throw error;
      return data;
    },
  });
}
