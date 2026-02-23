import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface SupportButton {
  id: string;
  company_id: string;
  label: string;
  action_type: 'link' | 'phone';
  action_value: string;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SupportButtonInput = Omit<SupportButton, 'id' | 'company_id' | 'created_at' | 'updated_at'>;

export function useSupportButtons() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['support-buttons', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('support_buttons')
        .select('*')
        .eq('company_id', company.id)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as SupportButton[];
    },
    enabled: !!company?.id,
  });

  const createButton = useMutation({
    mutationFn: async (input: Partial<SupportButtonInput>) => {
      if (!company?.id) throw new Error('Sem empresa');
      const { data, error } = await supabase
        .from('support_buttons')
        .insert({
          company_id: company.id,
          label: input.label || 'Suporte',
          action_type: input.action_type || 'link',
          action_value: input.action_value || '',
          icon: input.icon || 'headphones',
          color: input.color || '#6366f1',
          display_order: input.display_order ?? (query.data?.length || 0),
          is_active: input.is_active ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-buttons'] });
      toast.success('Botão de suporte criado!');
    },
    onError: (e: Error) => toast.error('Erro ao criar botão: ' + e.message),
  });

  const updateButton = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SupportButton> & { id: string }) => {
      const { data, error } = await supabase
        .from('support_buttons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-buttons'] });
      toast.success('Botão atualizado!');
    },
    onError: (e: Error) => toast.error('Erro ao atualizar: ' + e.message),
  });

  const deleteButton = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('support_buttons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-buttons'] });
      toast.success('Botão removido!');
    },
    onError: (e: Error) => toast.error('Erro ao remover: ' + e.message),
  });

  return {
    buttons: query.data || [],
    isLoading: query.isLoading,
    createButton,
    updateButton,
    deleteButton,
  };
}
