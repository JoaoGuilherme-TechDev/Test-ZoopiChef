import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Reseller {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  system_name: string;
  subdomain: string | null;
  custom_domain: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function useResellers() {
  const { user } = useAuth();

  const { data: resellers = [], isLoading } = useQuery({
    queryKey: ['resellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Reseller[];
    },
    enabled: !!user,
  });

  return { resellers, isLoading };
}

export function useMyReseller() {
  const { user } = useAuth();

  const { data: reseller, isLoading, refetch } = useQuery({
    queryKey: ['my-reseller', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Reseller | null;
    },
    enabled: !!user,
  });

  return { reseller, isLoading, refetch };
}

export function useCreateReseller() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      subdomain?: string;
      systemName?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('create-reseller', {
        body: params,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      toast.success('Revendedor criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar revendedor');
    },
  });
}

export function useUpdateReseller() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Reseller> & { id: string }) => {
      const { data, error } = await supabase
        .from('resellers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      queryClient.invalidateQueries({ queryKey: ['my-reseller'] });
      toast.success('Revendedor atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar revendedor');
    },
  });
}
