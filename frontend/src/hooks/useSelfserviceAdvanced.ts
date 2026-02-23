import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface SelfserviceAdvancedSettings {
  company_id: string;
  is_enabled: boolean;
  ai_recommendations_enabled: boolean;
  ai_upsell_enabled: boolean;
  voice_ordering_enabled: boolean;
  remember_customer_preferences: boolean;
  show_allergen_warnings: boolean;
  show_calorie_info: boolean;
  allow_split_payment: boolean;
  allow_tips: boolean;
  default_tip_percentages: number[];
  points_multiplier: number;
  show_loyalty_progress: boolean;
  layout_style: 'grid' | 'list' | 'carousel';
  show_preparation_time: boolean;
}

export interface CustomerOrderPreference {
  id: string;
  company_id: string;
  customer_identifier: string;
  product_id: string;
  order_count: number;
  last_ordered_at: string;
  avg_quantity: number;
  favorite: boolean;
  notes: string | null;
}

export interface SelfserviceRecommendation {
  id: string;
  company_id: string;
  customer_identifier: string | null;
  recommendation_type: 'personal' | 'popular' | 'combo' | 'upsell';
  product_ids: string[];
  reason: string | null;
  score: number | null;
  shown_at: string | null;
  clicked_at: string | null;
  converted_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export function useSelfserviceAdvancedSettings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['selfservice-advanced-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from('selfservice_advanced_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data as SelfserviceAdvancedSettings | null;
    },
    enabled: !!company?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<SelfserviceAdvancedSettings>) => {
      if (!company?.id) throw new Error('Company not found');
      const { error } = await supabase
        .from('selfservice_advanced_settings')
        .upsert({ company_id: company.id, ...updates });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selfservice-advanced-settings'] });
      toast.success('Configurações atualizadas!');
    },
    onError: () => toast.error('Erro ao atualizar configurações'),
  });

  return { settings, isLoading, updateSettings };
}

export function useCustomerPreferences(customerIdentifier?: string) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['customer-preferences', company?.id, customerIdentifier],
    queryFn: async () => {
      if (!company?.id || !customerIdentifier) return [];
      const { data, error } = await supabase
        .from('customer_order_preferences')
        .select('*')
        .eq('company_id', company.id)
        .eq('customer_identifier', customerIdentifier)
        .order('order_count', { ascending: false });
      if (error) throw error;
      return data as CustomerOrderPreference[];
    },
    enabled: !!company?.id && !!customerIdentifier,
  });
}

export function useUpdateCustomerPreference() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      customer_identifier, 
      product_id, 
      quantity = 1 
    }: { 
      customer_identifier: string; 
      product_id: string; 
      quantity?: number;
    }) => {
      if (!company?.id) throw new Error('Company not found');
      
      // Get existing preference
      const { data: existing } = await supabase
        .from('customer_order_preferences')
        .select('*')
        .eq('company_id', company.id)
        .eq('customer_identifier', customer_identifier)
        .eq('product_id', product_id)
        .maybeSingle();

      if (existing) {
        const newCount = existing.order_count + 1;
        const newAvgQty = ((existing.avg_quantity * existing.order_count) + quantity) / newCount;
        
        const { error } = await supabase
          .from('customer_order_preferences')
          .update({
            order_count: newCount,
            avg_quantity: newAvgQty,
            last_ordered_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customer_order_preferences')
          .insert({
            company_id: company.id,
            customer_identifier,
            product_id,
            order_count: 1,
            avg_quantity: quantity,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-preferences'] });
    },
  });
}

export function useSelfserviceRecommendations(customerIdentifier?: string) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['selfservice-recommendations', company?.id, customerIdentifier],
    queryFn: async () => {
      if (!company?.id) return [];
      
      let query = supabase
        .from('selfservice_recommendations')
        .select('*')
        .eq('company_id', company.id)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('score', { ascending: false })
        .limit(10);

      if (customerIdentifier) {
        query = query.or(`customer_identifier.eq.${customerIdentifier},customer_identifier.is.null`);
      } else {
        query = query.is('customer_identifier', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SelfserviceRecommendation[];
    },
    enabled: !!company?.id,
  });
}

export function useGenerateRecommendations() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerIdentifier?: string) => {
      if (!company?.id) throw new Error('Company not found');
      const { data, error } = await supabase.functions.invoke('ai-selfservice-recommendations', {
        body: { companyId: company.id, customerIdentifier },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selfservice-recommendations'] });
      toast.success('Recomendações geradas!');
    },
    onError: () => toast.error('Erro ao gerar recomendações'),
  });
}

export function useTrackRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      recommendationId, 
      action 
    }: { 
      recommendationId: string; 
      action: 'shown' | 'clicked' | 'converted';
    }) => {
      const updateField = action === 'shown' 
        ? { shown_at: new Date().toISOString() }
        : action === 'clicked'
        ? { clicked_at: new Date().toISOString() }
        : { converted_at: new Date().toISOString() };

      const { error } = await supabase
        .from('selfservice_recommendations')
        .update(updateField)
        .eq('id', recommendationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selfservice-recommendations'] });
    },
  });
}
