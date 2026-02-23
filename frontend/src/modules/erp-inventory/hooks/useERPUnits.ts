import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { ERPUnit, ERPUnitConversion } from '../types';

export function useERPUnits() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const unitsQuery = useQuery({
    queryKey: ['erp-units', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('erp_units')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      if (error) throw error;
      return data as ERPUnit[];
    },
    enabled: !!company?.id,
  });

  const conversionsQuery = useQuery({
    queryKey: ['erp-unit-conversions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('erp_unit_conversions')
        .select('*')
        .eq('company_id', company.id);
      if (error) throw error;
      return data as ERPUnitConversion[];
    },
    enabled: !!company?.id,
  });

  const createUnit = useMutation({
    mutationFn: async (data: { name: string; symbol: string; unit_type: string }) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      const { data: result, error } = await (supabase as any)
        .from('erp_units')
        .insert({ ...data, company_id: company.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-units'] });
      toast.success('Unidade criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar unidade: ' + error.message);
    },
  });

  const createConversion = useMutation({
    mutationFn: async (data: { from_unit_id: string; to_unit_id: string; factor: number }) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      const { data: result, error } = await (supabase as any)
        .from('erp_unit_conversions')
        .insert({ ...data, company_id: company.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-unit-conversions'] });
      toast.success('Conversão criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar conversão: ' + error.message);
    },
  });

  // Convert quantity from one unit to another
  const convertQuantity = (qty: number, fromUnitId: string, toUnitId: string): number => {
    if (fromUnitId === toUnitId) return qty;
    const conversion = conversionsQuery.data?.find(
      c => c.from_unit_id === fromUnitId && c.to_unit_id === toUnitId
    );
    if (conversion) return qty * conversion.factor;
    // Try reverse
    const reverse = conversionsQuery.data?.find(
      c => c.from_unit_id === toUnitId && c.to_unit_id === fromUnitId
    );
    if (reverse) return qty / reverse.factor;
    // Built-in conversions for common units
    const units = unitsQuery.data || [];
    const fromUnit = units.find(u => u.id === fromUnitId);
    const toUnit = units.find(u => u.id === toUnitId);
    if (fromUnit && toUnit) {
      // kg to g
      if (fromUnit.symbol === 'kg' && toUnit.symbol === 'g') return qty * 1000;
      if (fromUnit.symbol === 'g' && toUnit.symbol === 'kg') return qty / 1000;
      // L to ml
      if (fromUnit.symbol === 'L' && toUnit.symbol === 'ml') return qty * 1000;
      if (fromUnit.symbol === 'ml' && toUnit.symbol === 'L') return qty / 1000;
    }
    console.warn(`No conversion found from ${fromUnitId} to ${toUnitId}`);
    return qty;
  };

  return {
    units: unitsQuery.data || [],
    conversions: conversionsQuery.data || [],
    isLoading: unitsQuery.isLoading || conversionsQuery.isLoading,
    createUnit,
    createConversion,
    convertQuantity,
  };
}
