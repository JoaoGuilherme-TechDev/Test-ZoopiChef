import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface SmartKDSSettings {
  company_id: string;
  is_enabled: boolean;
  auto_prioritize: boolean;
  consider_prep_time: boolean;
  consider_order_type: boolean;
  consider_vip_customers: boolean;
  rush_hour_boost: number;
  delivery_priority_boost: number;
  vip_priority_boost: number;
  batch_similar_items: boolean;
  max_batch_size: number;
}

export interface ProductPrepTime {
  id: string;
  company_id: string;
  product_id: string;
  avg_prep_time_minutes: number;
  min_prep_time_minutes: number | null;
  max_prep_time_minutes: number | null;
  samples_count: number;
  last_updated_at: string;
}

export interface KDSPriorityLog {
  id: string;
  order_id: string;
  original_position: number | null;
  new_position: number | null;
  priority_score: number | null;
  factors_json: Record<string, unknown> | null;
  applied_at: string;
}

export function useSmartKDSSettings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['smart-kds-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from('smart_kds_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data as SmartKDSSettings | null;
    },
    enabled: !!company?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<SmartKDSSettings>) => {
      if (!company?.id) throw new Error('Company not found');
      const { error } = await supabase
        .from('smart_kds_settings')
        .upsert({ company_id: company.id, ...updates });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-kds-settings'] });
      toast.success('Configurações do KDS atualizadas!');
    },
    onError: () => toast.error('Erro ao atualizar configurações'),
  });

  return { settings, isLoading, updateSettings };
}

export function useProductPrepTimes() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: prepTimes = [], isLoading } = useQuery({
    queryKey: ['product-prep-times', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('product_prep_times')
        .select('*')
        .eq('company_id', company.id);
      if (error) throw error;
      return data as ProductPrepTime[];
    },
    enabled: !!company?.id,
  });

  const updatePrepTime = useMutation({
    mutationFn: async ({ product_id, avg_prep_time_minutes }: { product_id: string; avg_prep_time_minutes: number }) => {
      if (!company?.id) throw new Error('Company not found');
      const { error } = await supabase
        .from('product_prep_times')
        .upsert({ 
          company_id: company.id, 
          product_id, 
          avg_prep_time_minutes,
          last_updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-prep-times'] });
    },
  });

  return { prepTimes, isLoading, updatePrepTime };
}

export function useKDSPriorityLog() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['kds-priority-log', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('kds_priority_log')
        .select('*')
        .eq('company_id', company.id)
        .order('applied_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as KDSPriorityLog[];
    },
    enabled: !!company?.id,
  });
}

export function useRecalculateKDSPriority() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Company not found');
      const { data, error } = await supabase.functions.invoke('ai-smart-kds', {
        body: { companyId: company.id, action: 'prioritize' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
      queryClient.invalidateQueries({ queryKey: ['kds-priority-log'] });
      toast.success(`${data?.orders_reordered || 0} pedidos reorganizados!`);
    },
    onError: () => toast.error('Erro ao recalcular prioridades'),
  });
}

export function useLearnPrepTimes() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Company not found');
      const { data, error } = await supabase.functions.invoke('ai-smart-kds', {
        body: { companyId: company.id, action: 'learn_prep_times' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-prep-times'] });
      toast.success(`${data?.products_updated || 0} tempos de preparo aprendidos!`);
    },
    onError: () => toast.error('Erro ao aprender tempos de preparo'),
  });
}
