import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook para obter ou criar sessão de mesa de forma ATÔMICA
 * 
 * Este é o ÚNICO caminho seguro para abrir/usar mesa em qualquer ponto:
 * - PDV (caixa)
 * - PWA Garçom
 * - QR Code
 * 
 * Garante que nunca existam 2 sessões abertas para a mesma mesa.
 */
export function useTableSessionAtomic() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Obter ou criar sessão por número da mesa
  const getOrCreateSession = useMutation({
    mutationFn: async ({ 
      companyId, 
      tableNumber 
    }: { 
      companyId: string; 
      tableNumber: number;
    }) => {
      const { data, error } = await supabase
        .rpc('get_or_create_table_session', {
          p_company_id: companyId,
          p_table_number: tableNumber,
          p_user_id: null
        });

      if (error) {
        console.error('Error getting/creating table session:', error);
        throw error;
      }

      return data as string; // Returns session_id UUID
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao abrir mesa',
        description: error.message || 'Não foi possível abrir a mesa',
        variant: 'destructive',
      });
    },
  });

  // Obter ou criar sessão via token do QR Code
  const getSessionByQRToken = useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase
        .rpc('get_table_session_by_qr_token', {
          p_token: token,
          p_user_id: null
        });

      if (error) {
        console.error('Error getting session by QR token:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Token inválido ou mesa não encontrada');
      }

      return data[0] as {
        session_id: string;
        table_id: string;
        table_number: number;
        table_name: string | null;
        company_id: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao acessar mesa',
        description: error.message || 'QR Code inválido',
        variant: 'destructive',
      });
    },
  });

  return {
    getOrCreateSession,
    getSessionByQRToken,
  };
}

/**
 * Hook simplificado para obter sessão pelo número da mesa
 * Retorna a sessão existente ou cria uma nova automaticamente
 */
export function useGetOrCreateTableSession() {
  return useTableSessionAtomic().getOrCreateSession;
}

/**
 * Hook para QR Code - obtém sessão pelo token
 */
export function useGetTableSessionByQR() {
  return useTableSessionAtomic().getSessionByQRToken;
}
