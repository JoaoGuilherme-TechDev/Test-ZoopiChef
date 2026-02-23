import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Banner {
  id: string;
  company_id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  active: boolean;
  display_order: number;
  tv_screen_id: string | null;
  description_font: string | null;
  description_color: string | null;
  created_at: string;
  updated_at: string;
}

export function useBanners() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: banners = [], isLoading, error } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Banner[];
    },
    enabled: !!user,
  });

  const createBanner = useMutation({
    mutationFn: async (banner: { title?: string; image_url: string; company_id: string }) => {
      const { data, error } = await supabase
        .from('banners')
        .insert(banner)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: (error: Error) => {
      console.error('Error creating banner:', error);
      toast.error(`Erro ao criar banner: ${error.message}`);
    },
  });

  const updateBanner = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; active?: boolean; display_order?: number }) => {
      const { data, error } = await supabase
        .from('banners')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: (error: Error) => {
      console.error('Error updating banner:', error);
      toast.error(`Erro ao atualizar banner: ${error.message}`);
    },
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
  });

  const uploadBannerImage = async (file: File, companyId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('banners')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('banners')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  return {
    banners,
    isLoading,
    error,
    createBanner,
    updateBanner,
    deleteBanner,
    uploadBannerImage,
  };
}

export function usePublicBanners(companyId: string | undefined) {
  return useQuery({
    queryKey: ['public-banners', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as Banner[];
    },
    enabled: !!companyId,
  });
}
