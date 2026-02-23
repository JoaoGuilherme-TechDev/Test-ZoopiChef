import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export type TokenType = 'menu' | 'tv' | 'roleta' | 'kds' | 'scale';

export function useRegenerateToken() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (tokenType: TokenType) => {
      if (!profile?.company_id) {
        throw new Error('Empresa não encontrada');
      }

      const { data, error } = await supabase.rpc('regenerate_company_token', {
        _company_id: profile.company_id,
        _token_type: tokenType,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_public_links'] });
      toast.success('Token v2 regenerado! Links legados continuam funcionando.');
    },
    onError: (error: Error) => {
      console.error('Error regenerating token:', error);
      if (error.message.includes('Only admins')) {
        toast.error('Apenas administradores podem regenerar tokens');
      } else {
        toast.error('Erro ao regenerar token');
      }
    },
  });
}
