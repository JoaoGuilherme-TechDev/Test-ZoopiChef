import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export function useOrderCounter() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: counter, isLoading } = useQuery({
    queryKey: ['orderCounter', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('company_order_counters')
        .select('*')
        .eq('company_id', company.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const getNextNumber = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Company not found');

      // Buscar contador atual
      const { data: existing, error: fetchError } = await supabase
        .from('company_order_counters')
        .select('current_number')
        .eq('company_id', company.id)
        .single();

      let nextNumber = 1;

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existing) {
        nextNumber = existing.current_number;
        // Incrementar
        const { error: updateError } = await supabase
          .from('company_order_counters')
          .update({ current_number: nextNumber + 1 })
          .eq('company_id', company.id);
        
        if (updateError) throw updateError;
      } else {
        // Criar novo contador
        const { error: insertError } = await supabase
          .from('company_order_counters')
          .insert({
            company_id: company.id,
            current_number: 2, // Próximo será 2
          });
        
        if (insertError) throw insertError;
      }

      return nextNumber;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderCounter'] });
    },
  });

  const resetCounter = useMutation({
    mutationFn: async (startNumber: number) => {
      if (!company?.id) throw new Error('Company not found');

      const { error } = await supabase
        .from('company_order_counters')
        .upsert({
          company_id: company.id,
          current_number: startNumber,
          last_reset_date: new Date().toISOString().split('T')[0],
        }, {
          onConflict: 'company_id',
        });

      if (error) throw error;
      return startNumber;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderCounter'] });
    },
  });

  const shouldShowResetDialog = () => {
    if (!counter) return true; // Primeira vez

    const today = new Date().toISOString().split('T')[0];
    const lastReset = counter.last_reset_date;

    // Se o último reset não foi hoje, perguntar
    return lastReset !== today;
  };

  return {
    counter,
    isLoading,
    getNextNumber,
    resetCounter,
    shouldShowResetDialog,
  };
}