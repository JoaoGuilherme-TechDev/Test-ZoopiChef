import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useProfile } from './useProfile';
import { useEffect } from 'react';

export type TargetType = 'all' | 'kds' | 'printer' | 'waiter';

export interface InternalMessage {
  id: string;
  company_id: string;
  sender_id: string | null;
  sender_name: string;
  message: string;
  target_type: TargetType;
  target_sector_id: string | null;
  is_read: boolean;
  read_by: string | null;
  read_at: string | null;
  created_at: string;
}

export function useInternalMessages(targetFilter?: TargetType | TargetType[]) {
  const { data: company } = useCompany();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['internal-messages', company?.id, targetFilter],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('internal_messages')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      // Filter by target type if specified
      if (targetFilter) {
        if (Array.isArray(targetFilter)) {
          query = query.in('target_type', targetFilter);
        } else {
          query = query.or(`target_type.eq.${targetFilter},target_type.eq.all`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InternalMessage[];
    },
    enabled: !!company?.id,
    // Realtime handles updates, no need for aggressive polling
    staleTime: 30000,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel('internal-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'internal_messages',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['internal-messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async (data: {
      message: string;
      target_type: TargetType;
      target_sector_id?: string | null;
    }) => {
      if (!company?.id || !profile) throw new Error('No company or profile');

      const { data: result, error } = await supabase
        .from('internal_messages')
        .insert({
          company_id: company.id,
          sender_id: profile.id,
          sender_name: profile.full_name || 'Operador',
          message: data.message,
          target_type: data.target_type,
          target_sector_id: data.target_sector_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-messages'] });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      if (!profile) throw new Error('No profile');

      const { error } = await supabase
        .from('internal_messages')
        .update({
          is_read: true,
          read_by: profile.id,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-messages'] });
    },
  });

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    markAsRead,
  };
}
