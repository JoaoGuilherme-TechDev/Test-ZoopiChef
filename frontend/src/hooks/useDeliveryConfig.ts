import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface DeliveryFeeConfig {
  id: string;
  company_id: string;
  mode: 'neighborhood' | 'radius';
  origin_address: string | null;
  origin_latitude: number | null;
  origin_longitude: number | null;
  max_distance_km: number;
  fallback_fee: number;
  allow_manual_override: boolean;
}

export interface DeliveryNeighborhood {
  id: string;
  company_id: string;
  neighborhood: string;
  city: string;
  fee: number;
  estimated_minutes: number | null;
  active: boolean;
}

export interface DeliveryRange {
  id: string;
  company_id: string;
  min_km: number;
  max_km: number;
  fee: number;
  estimated_minutes: number | null;
  active: boolean;
}

export interface OrderReceiptType {
  id: string;
  company_id: string;
  name: string;
  code: string;
  icon: string;
  requires_address: boolean;
  requires_table_number: boolean;
  apply_delivery_fee: boolean;
  display_order: number;
  active: boolean;
}

export function useDeliveryConfig() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ['delivery_fee_config', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      const { data, error } = await supabase
        .from('delivery_fee_config')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();
      if (error) throw error;
      return data as DeliveryFeeConfig | null;
    },
    enabled: !!profile?.company_id,
  });

  const neighborhoodsQuery = useQuery({
    queryKey: ['delivery_fee_neighborhoods', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from('delivery_fee_neighborhoods')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('neighborhood');
      if (error) throw error;
      return data as DeliveryNeighborhood[];
    },
    enabled: !!profile?.company_id,
  });

  const rangesQuery = useQuery({
    queryKey: ['delivery_fee_ranges', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from('delivery_fee_ranges')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('min_km');
      if (error) throw error;
      return data as DeliveryRange[];
    },
    enabled: !!profile?.company_id,
  });

  const receiptTypesQuery = useQuery({
    queryKey: ['order_receipt_types', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from('order_receipt_types')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('active', true)
        .order('display_order');
      if (error) throw error;
      return data as OrderReceiptType[];
    },
    enabled: !!profile?.company_id,
  });

  const saveConfig = useMutation({
    mutationFn: async (config: Partial<DeliveryFeeConfig>) => {
      if (!profile?.company_id) throw new Error('No company');
      const { data, error } = await supabase
        .from('delivery_fee_config')
        .upsert({ ...config, company_id: profile.company_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_fee_config'] });
      toast.success('Configuração salva');
    },
    onError: () => toast.error('Erro ao salvar configuração'),
  });

  const addNeighborhood = useMutation({
    mutationFn: async (neighborhood: Omit<DeliveryNeighborhood, 'id' | 'company_id'>) => {
      if (!profile?.company_id) throw new Error('No company');
      const { data, error } = await supabase
        .from('delivery_fee_neighborhoods')
        .insert({ ...neighborhood, company_id: profile.company_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_fee_neighborhoods'] });
      toast.success('Bairro adicionado');
    },
    onError: () => toast.error('Erro ao adicionar bairro'),
  });

  const updateNeighborhood = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeliveryNeighborhood> & { id: string }) => {
      const { error } = await supabase
        .from('delivery_fee_neighborhoods')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_fee_neighborhoods'] });
      toast.success('Bairro atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar bairro: ' + error.message);
    },
  });

  const deleteNeighborhood = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('delivery_fee_neighborhoods')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_fee_neighborhoods'] });
      toast.success('Bairro removido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover bairro: ' + error.message);
    },
  });

  const addRange = useMutation({
    mutationFn: async (range: Omit<DeliveryRange, 'id' | 'company_id'>) => {
      if (!profile?.company_id) throw new Error('No company');
      const { data, error } = await supabase
        .from('delivery_fee_ranges')
        .insert({ ...range, company_id: profile.company_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_fee_ranges'] });
      toast.success('Faixa adicionada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar faixa: ' + error.message);
    },
  });

  const deleteRange = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('delivery_fee_ranges')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_fee_ranges'] });
      toast.success('Faixa removida');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover faixa: ' + error.message);
    },
  });

  return {
    config: configQuery.data,
    neighborhoods: neighborhoodsQuery.data || [],
    ranges: rangesQuery.data || [],
    receiptTypes: receiptTypesQuery.data || [],
    isLoading: configQuery.isLoading || neighborhoodsQuery.isLoading || rangesQuery.isLoading,
    saveConfig,
    addNeighborhood,
    updateNeighborhood,
    deleteNeighborhood,
    addRange,
    deleteRange,
  };
}

// Calculate delivery fee based on address
export interface DeliveryFeeResult {
  isServiced: boolean | null;
  fee: number;
  estimatedMinutes?: number;
  distanceKm?: number;
  message?: string;
}

export function calculateDeliveryFee(
  config: DeliveryFeeConfig | null,
  neighborhoods: DeliveryNeighborhood[],
  ranges: DeliveryRange[],
  neighborhood: string,
  city: string = 'São Paulo',
  latitude?: number,
  longitude?: number
): DeliveryFeeResult {
  if (!config) {
    return { isServiced: null, fee: 0, message: 'Configuração de entrega não encontrada' };
  }

  if (config.mode === 'neighborhood') {
    const found = neighborhoods.find(
      n => n.neighborhood.toLowerCase() === neighborhood.toLowerCase() &&
           n.city.toLowerCase() === city.toLowerCase() &&
           n.active
    );

    if (!found) {
      return {
        isServiced: false,
        fee: 0,
        message: `Bairro "${neighborhood}" não atendido`,
      };
    }

    return {
      isServiced: true,
      fee: found.fee,
      estimatedMinutes: found.estimated_minutes || undefined,
    };
  }

  if (config.mode === 'radius') {
    if (!latitude || !longitude || !config.origin_latitude || !config.origin_longitude) {
      return {
        isServiced: null,
        fee: config.fallback_fee,
        message: 'Distância não calculada. Taxa padrão aplicada.',
      };
    }

    const distance = haversineDistance(
      config.origin_latitude,
      config.origin_longitude,
      latitude,
      longitude
    );

    if (distance > config.max_distance_km) {
      return {
        isServiced: false,
        fee: 0,
        distanceKm: distance,
        message: `Fora da área de entrega (${distance.toFixed(1)}km > ${config.max_distance_km}km)`,
      };
    }

    const range = ranges.find(r => r.active && distance >= r.min_km && distance <= r.max_km);

    if (!range) {
      return {
        isServiced: true,
        fee: config.fallback_fee,
        distanceKm: distance,
        message: 'Faixa de distância não configurada. Taxa padrão aplicada.',
      };
    }

    return {
      isServiced: true,
      fee: range.fee,
      estimatedMinutes: range.estimated_minutes || undefined,
      distanceKm: distance,
    };
  }

  return { isServiced: false, fee: 0, message: 'Modo de taxa não configurado' };
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
