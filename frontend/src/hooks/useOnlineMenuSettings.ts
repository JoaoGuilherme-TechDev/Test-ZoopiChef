import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface OnlineMenuSettings {
  // Visual
  primary_color: string | null;
  secondary_color: string | null;
  background_color: string | null;
  text_color: string | null;
  logo_url: string | null;
  cover_banner_url: string | null;
  public_menu_layout: string | null;
  
  // Exibição
  public_menu_show_address: boolean;
  public_menu_show_phone: boolean;
  public_menu_show_hours: boolean;
  public_menu_show_banner: boolean;
  public_menu_category_layout: string;
  public_menu_card_layout: string;
  public_menu_mode: string;
  
  // Loja
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  welcome_message: string | null;
  opening_hours: {
    enabled: boolean;
    hours: { day: string; open: string; close: string; closed: boolean }[];
  } | null;
  
  // IA
  ai_banners_enabled: boolean;
}

export function useOnlineMenuSettings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['online-menu-settings', company?.id],
    queryFn: async (): Promise<OnlineMenuSettings | null> => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('companies')
        .select(`
          name,
          primary_color,
          secondary_color,
          background_color,
          text_color,
          logo_url,
          cover_banner_url,
          public_menu_layout,
          public_menu_show_address,
          public_menu_show_phone,
          public_menu_show_hours,
          public_menu_show_banner,
          public_menu_category_layout,
          public_menu_card_layout,
          public_menu_mode,
          address,
          phone,
          whatsapp,
          welcome_message,
          opening_hours,
          ai_banners_enabled
        `)
        .eq('id', company.id)
        .single();

      if (error) throw error;
      
      return data as unknown as OnlineMenuSettings;
    },
    enabled: !!company?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<OnlineMenuSettings>) => {
      if (!company?.id) throw new Error('No company');

      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', company.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-menu-settings'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Configurações salvas!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar configurações: ' + error.message);
    },
  });

  const uploadCoverBanner = useMutation({
    mutationFn: async (file: File) => {
      if (!company?.id) throw new Error('No company');

      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}/cover.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);

      // Adicionar timestamp para evitar cache
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('companies')
        .update({ cover_banner_url: urlWithTimestamp })
        .eq('id', company.id);

      if (updateError) throw updateError;

      return urlWithTimestamp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-menu-settings'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Banner atualizado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar banner: ' + error.message);
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings,
    uploadCoverBanner,
  };
}
