import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { DeliveryFeeConfig, DeliveryNeighborhood, DeliveryRange, calculateDeliveryFee, DeliveryFeeResult } from './useDeliveryConfig';

/**
 * Hook para buscar configurações de entrega de uma empresa via companyId
 * Usado no checkout público (/m/:token)
 */
export function usePublicDeliveryFee(companyId: string | undefined) {
  const configQuery = useQuery({
    queryKey: ['public_delivery_config', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('delivery_fee_config')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data as DeliveryFeeConfig | null;
    },
    enabled: !!companyId,
  });

  const neighborhoodsQuery = useQuery({
    queryKey: ['public_delivery_neighborhoods', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('delivery_fee_neighborhoods')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('neighborhood');
      if (error) throw error;
      return data as DeliveryNeighborhood[];
    },
    enabled: !!companyId,
  });

  const rangesQuery = useQuery({
    queryKey: ['public_delivery_ranges', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('delivery_fee_ranges')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('min_km');
      if (error) throw error;
      return data as DeliveryRange[];
    },
    enabled: !!companyId,
  });

  const calculate = (
    neighborhood: string,
    city: string = '',
    latitude?: number,
    longitude?: number
  ): DeliveryFeeResult => {
    return calculateDeliveryFee(
      configQuery.data ?? null,
      neighborhoodsQuery.data ?? [],
      rangesQuery.data ?? [],
      neighborhood,
      city,
      latitude,
      longitude
    );
  };

  return {
    config: configQuery.data,
    neighborhoods: neighborhoodsQuery.data ?? [],
    ranges: rangesQuery.data ?? [],
    isLoading: configQuery.isLoading || neighborhoodsQuery.isLoading || rangesQuery.isLoading,
    calculate,
  };
}
