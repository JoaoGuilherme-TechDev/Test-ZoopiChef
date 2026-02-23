import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export interface TableSurchargeRange {
  id: string;
  company_id: string;
  start_number: number;
  end_number: number;
  surcharge_percentage: number;
  created_at: string;
  updated_at: string;
}

export function useTableSurchargeRanges() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: ranges = [], isLoading, error } = useQuery({
    queryKey: ['table-surcharge-ranges', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('table_surcharge_ranges')
        .select('*')
        .eq('company_id', company.id)
        .order('start_number', { ascending: true });

      if (error) throw error;
      return data as TableSurchargeRange[];
    },
    enabled: !!company?.id,
  });

  const createRange = useMutation({
    mutationFn: async ({ 
      startNumber, 
      endNumber, 
      surchargePercentage 
    }: { 
      startNumber: number; 
      endNumber: number; 
      surchargePercentage: number;
    }) => {
      if (!company?.id) throw new Error('No company');
      
      const { data, error } = await supabase
        .from('table_surcharge_ranges')
        .insert([{ 
          company_id: company.id,
          start_number: startNumber,
          end_number: endNumber,
          surcharge_percentage: surchargePercentage,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-surcharge-ranges'] });
    },
  });

  const updateRange = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TableSurchargeRange> & { id: string }) => {
      const { data, error } = await supabase
        .from('table_surcharge_ranges')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-surcharge-ranges'] });
    },
  });

  const deleteRange = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('table_surcharge_ranges')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-surcharge-ranges'] });
    },
  });

  // Get surcharge percentage for a table number
  const getSurchargeForTable = (tableNumber: number): number => {
    const range = ranges.find(r => 
      tableNumber >= r.start_number && tableNumber <= r.end_number
    );
    return range?.surcharge_percentage || 0;
  };

  return {
    ranges,
    isLoading,
    error,
    createRange,
    updateRange,
    deleteRange,
    getSurchargeForTable,
  };
}
