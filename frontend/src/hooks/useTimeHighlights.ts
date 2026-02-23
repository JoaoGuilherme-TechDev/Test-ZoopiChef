import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';

export interface TimeHighlightSuggestion {
  id: string;
  company_id: string;
  period: string;
  product_id: string | null;
  channels: string[];
  reason: string | null;
  confidence: string | null;
  priority: number | null;
  status: string | null;
  applied_at: string | null;
  start_hour: number;
  end_hour: number;
  sales_count: number | null;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
  };
}

const PERIOD_LABELS: Record<string, string> = {
  manha: 'Manhã',
  almoco: 'Almoço',
  tarde: 'Tarde',
  jantar: 'Jantar',
  noite: 'Noite',
};

export function getPeriodLabel(period: string): string {
  return PERIOD_LABELS[period] || period;
}

export function useTimeHighlights() {
  return useQuery({
    queryKey: ['time-highlight-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_highlight_suggestions')
        .select(`
          *,
          product:products(id, name, price)
        `)
        .order('period')
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as unknown as TimeHighlightSuggestion[];
    },
  });
}

export function usePendingHighlights() {
  return useQuery({
    queryKey: ['time-highlight-suggestions', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_highlight_suggestions')
        .select(`
          *,
          product:products(id, name, price)
        `)
        .eq('status', 'pending')
        .order('period')
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as unknown as TimeHighlightSuggestion[];
    },
  });
}

export function useAppliedHighlights() {
  return useQuery({
    queryKey: ['time-highlight-suggestions', 'applied'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_highlight_suggestions')
        .select(`
          *,
          product:products(id, name, price)
        `)
        .eq('status', 'applied')
        .order('period')
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as unknown as TimeHighlightSuggestion[];
    },
  });
}

export function useGenerateMenuHighlights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, channels }: { companyId: string; channels: string[] }) => {
      const { data, error } = await supabase.functions.invoke('ai-menu-highlight', {
        body: { companyId, channels }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-highlight-suggestions'] });
      toast.success('Análise de destaques concluída!');
    },
    onError: (error) => {
      toast.error(`Erro na análise: ${error.message}`);
    },
  });
}

export function useGenerateTVHighlights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      const { data, error } = await supabase.functions.invoke('ai-tv-highlight', {
        body: { companyId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-highlight-suggestions'] });
      toast.success('Análise de destaques para TV concluída!');
    },
    onError: (error) => {
      toast.error(`Erro na análise: ${error.message}`);
    },
  });
}

export function useApproveHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('time_highlight_suggestions')
        .update({ 
          status: 'approved',
          applied_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-highlight-suggestions'] });
      toast.success('Destaque aprovado!');
    },
    onError: (error) => {
      toast.error(`Erro ao aprovar: ${error.message}`);
    },
  });
}

export function useApplyHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestion: TimeHighlightSuggestion) => {
      // Atualizar o produto com o destaque de horário
      if (suggestion.product_id) {
        const { error: productError } = await supabase
          .from('products')
          .update({ 
            destaque_horario: [suggestion.period],
            ordem_destaque: suggestion.priority || 1
          })
          .eq('id', suggestion.product_id);

        if (productError) throw productError;
      }

      // Marcar sugestão como aplicada
      const { data, error } = await supabase
        .from('time_highlight_suggestions')
        .update({ 
          status: 'applied',
          applied_at: new Date().toISOString()
        })
        .eq('id', suggestion.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-highlight-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Destaque aplicado ao produto!');
    },
    onError: (error) => {
      toast.error(`Erro ao aplicar: ${error.message}`);
    },
  });
}

export function useRejectHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('time_highlight_suggestions')
        .update({ status: 'rejected' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-highlight-suggestions'] });
      toast.success('Destaque rejeitado');
    },
    onError: (error) => {
      toast.error(`Erro ao rejeitar: ${error.message}`);
    },
  });
}

export function useDeleteHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('time_highlight_suggestions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-highlight-suggestions'] });
      toast.success('Destaque removido');
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });
}
