import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface DeliveryCostSettings {
  delivery_base_cost_cents: number;
  delivery_cost_per_km_cents: number;
  delivery_free_above_cents: number | null;
  delivery_min_distance_km: number;
  delivery_max_distance_km: number;
}

export interface CalculatedDeliveryCost {
  distanceKm: number;
  baseCostCents: number;
  distanceCostCents: number;
  totalCostCents: number;
  isFree: boolean;
  isOutOfRange: boolean;
}

export function useDeliveryCostPerKm() {
  const { data: company, refetch } = useCompany();
  const queryClient = useQueryClient();

  const { data: companySettings } = useQuery({
    queryKey: ['company-delivery-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data } = await supabase
        .from('companies')
        .select('delivery_base_cost_cents, delivery_cost_per_km_cents, delivery_free_above_cents, delivery_min_distance_km, delivery_max_distance_km')
        .eq('id', company.id)
        .single();
      return data;
    },
    enabled: !!company?.id,
  });

  const settings: DeliveryCostSettings = {
    delivery_base_cost_cents: companySettings?.delivery_base_cost_cents || 0,
    delivery_cost_per_km_cents: companySettings?.delivery_cost_per_km_cents || 100,
    delivery_free_above_cents: companySettings?.delivery_free_above_cents || null,
    delivery_min_distance_km: Number(companySettings?.delivery_min_distance_km) || 0,
    delivery_max_distance_km: Number(companySettings?.delivery_max_distance_km) || 20,
  };

  const calculateDeliveryCost = (distanceKm: number, orderTotalCents?: number): CalculatedDeliveryCost => {
    if (distanceKm > settings.delivery_max_distance_km) {
      return { distanceKm, baseCostCents: 0, distanceCostCents: 0, totalCostCents: 0, isFree: false, isOutOfRange: true };
    }

    if (orderTotalCents && settings.delivery_free_above_cents && orderTotalCents >= settings.delivery_free_above_cents) {
      return { distanceKm, baseCostCents: 0, distanceCostCents: 0, totalCostCents: 0, isFree: true, isOutOfRange: false };
    }

    const chargeableDistance = Math.max(0, distanceKm - settings.delivery_min_distance_km);
    const distanceCostCents = Math.round(chargeableDistance * settings.delivery_cost_per_km_cents);
    const totalCostCents = settings.delivery_base_cost_cents + distanceCostCents;

    return { distanceKm, baseCostCents: settings.delivery_base_cost_cents, distanceCostCents, totalCostCents, isFree: false, isOutOfRange: false };
  };

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<DeliveryCostSettings>) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      const { error } = await supabase.from('companies').update(newSettings).eq('id', company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['company-delivery-settings'] });
      toast.success('Configurações de entrega atualizadas!');
    },
    onError: (error) => toast.error('Erro ao atualizar: ' + error.message),
  });

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return { settings, calculateDeliveryCost, calculateDistance, updateSettings };
}
