import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface FlavorHighlightGroup {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useFlavorHighlightGroups() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['flavor-highlight-groups', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('flavor_highlight_groups')
        .select('*')
        .eq('company_id', company.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as FlavorHighlightGroup[];
    },
    enabled: !!company?.id,
  });
}

export function useActiveFlavorHighlightGroups() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['flavor-highlight-groups', 'active', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('flavor_highlight_groups')
        .select('*')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as FlavorHighlightGroup[];
    },
    enabled: !!company?.id,
  });
}

export function useCreateFlavorHighlightGroup() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (group: Omit<FlavorHighlightGroup, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      if (!company?.id) throw new Error('Company not found');

      const { data, error } = await supabase
        .from('flavor_highlight_groups')
        .insert({ ...group, company_id: company.id })
        .select()
        .single();

      if (error) throw error;
      return data as FlavorHighlightGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flavor-highlight-groups'] });
      toast.success('Grupo de destaque criado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar grupo');
    },
  });
}

export function useUpdateFlavorHighlightGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FlavorHighlightGroup> & { id: string }) => {
      const { data, error } = await supabase
        .from('flavor_highlight_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as FlavorHighlightGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flavor-highlight-groups'] });
      toast.success('Grupo atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar grupo');
    },
  });
}

export function useDeleteFlavorHighlightGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('flavor_highlight_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flavor-highlight-groups'] });
      toast.success('Grupo excluído!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir grupo');
    },
  });
}
