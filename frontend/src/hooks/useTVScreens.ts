import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface TVScreen {
  id: string;
  company_id: string;
  name: string;
  token: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useTVScreens() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const { data: tvScreens = [], isLoading, error } = useQuery({
    queryKey: ['tv_screens'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tv_screens')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as TVScreen[];
    },
    enabled: !!profile?.company_id,
  });

  const createTVScreen = useMutation({
    mutationFn: async (screen: { name: string; company_id: string }) => {
      const { data, error } = await supabase
        .from('tv_screens')
        .insert(screen)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv_screens'] });
      toast.success('Tela TV criada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar tela TV');
    },
  });

  const updateTVScreen = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; active?: boolean }) => {
      const { error } = await supabase
        .from('tv_screens')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv_screens'] });
      toast.success('Tela TV atualizada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar tela TV');
    },
  });

  const deleteTVScreen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tv_screens')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv_screens'] });
      toast.success('Tela TV excluída!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir tela TV');
    },
  });

  const regenerateToken = useMutation({
    mutationFn: async ({ tvScreenId, companyId }: { tvScreenId: string; companyId: string }) => {
      // Generate new token with prefix
      const newToken = `tv_${Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;

      // Update the TV screen token
      const { error: updateError } = await supabase
        .from('tv_screens')
        .update({ token: newToken })
        .eq('id', tvScreenId);

      if (updateError) throw updateError;

      // Log the regeneration in audit logs
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('token_audit_logs')
          .insert({
            company_id: companyId,
            user_id: user.id,
            token_type: 'tv_screen',
            action: 'regenerate',
          });
      }

      return newToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv_screens'] });
      toast.success('Token regenerado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao regenerar token');
    },
  });

  return {
    tvScreens,
    isLoading,
    error,
    createTVScreen,
    updateTVScreen,
    deleteTVScreen,
    regenerateToken,
  };
}

// Hook to fetch TV screen by token (public)
export function useTVScreenByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['tv_screen_public', token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase
        .from('tv_screens')
        .select('*, companies(*)')
        .eq('token', token)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });
}
