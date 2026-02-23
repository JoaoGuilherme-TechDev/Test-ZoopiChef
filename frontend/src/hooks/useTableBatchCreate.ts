import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export function useTableBatchCreate() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const batchCreateTables = useMutation({
    mutationFn: async ({ 
      startNumber, 
      endNumber,
      commissionPercent = 0
    }: { 
      startNumber: number; 
      endNumber: number;
      commissionPercent?: number;
    }) => {
      if (!company?.id) throw new Error('No company');
      
      if (startNumber > endNumber) {
        throw new Error('Número inicial deve ser menor ou igual ao final');
      }

      const tablesToCreate = [];
      for (let i = startNumber; i <= endNumber; i++) {
        tablesToCreate.push({
          company_id: company.id,
          number: i,
          name: null,
          active: true,
          status: 'available',
          commission_percent: commissionPercent,
        });
      }

      const { data, error } = await supabase
        .from('tables')
        .insert(tablesToCreate)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  return {
    batchCreateTables,
  };
}
