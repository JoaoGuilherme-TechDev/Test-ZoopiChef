import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export function useWeatherMenu() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const weatherTagsQuery = useQuery({
    queryKey: ['product-weather-tags', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('product_weather_tags')
        .select('*')
        .eq('company_id', company.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const suggestionsQuery = useQuery({
    queryKey: ['weather-menu-suggestions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('weather_menu_suggestions')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const setProductWeatherTags = useMutation({
    mutationFn: async (params: {
      product_id: string;
      weather_tags: string[];
      ideal_conditions: string[];
      temperature_min?: number;
      temperature_max?: number;
    }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      await supabase
        .from('product_weather_tags')
        .delete()
        .eq('product_id', params.product_id)
        .eq('company_id', company.id);

      if (params.weather_tags.length === 0 && params.ideal_conditions.length === 0) {
        return null;
      }

      const { data, error } = await supabase
        .from('product_weather_tags')
        .insert({
          company_id: company.id,
          product_id: params.product_id,
          weather_tags: params.weather_tags,
          ideal_conditions: params.ideal_conditions,
          temperature_min: params.temperature_min || 0,
          temperature_max: params.temperature_max || 40,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-weather-tags'] });
    },
  });

  const generateSuggestions = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase.functions.invoke('generate-weather-menu', {
        body: { companyId: company.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather-menu-suggestions'] });
    },
  });

  const getProductTags = (productId: string) => {
    return weatherTagsQuery.data?.find(t => t.product_id === productId);
  };

  return {
    weatherTags: weatherTagsQuery.data || [],
    suggestions: suggestionsQuery.data || [],
    isLoading: weatherTagsQuery.isLoading,
    setProductWeatherTags,
    generateSuggestions,
    getProductTags,
  };
}
