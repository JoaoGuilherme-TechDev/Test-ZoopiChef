import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

// Enum matching database optional_calc_mode
export type OptionalCalcMode = 
  | 'sum_each_part'      // Soma valor a cada parte (2 partes, +R$4 = +R$8 total)
  | 'proportional'       // Proporcional (adicional R$6 pizza 3 partes = R$6 total)
  | 'pizza_total_split'  // Total no item principal, sistema exibe valor por parte
  | 'max_part_value'     // Cobrar maior valor adicional entre as partes
  | 'per_flavor_part';   // Adicional só na parte/sabor específico escolhido

export const CALC_MODE_LABELS: Record<OptionalCalcMode, string> = {
  sum_each_part: 'Soma por parte (cada parte soma o valor)',
  proportional: 'Proporcional (valor total dividido pelas partes)',
  pizza_total_split: 'Total no item (sistema exibe por parte)',
  max_part_value: 'Maior valor (cobra o maior entre as partes)',
  per_flavor_part: 'Por sabor (adicional aplicado só no sabor escolhido)',
};

export interface OptionItem {
  id: string;
  company_id: string;
  group_id: string;
  label: string;
  price_delta: number;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OptionGroup {
  id: string;
  company_id: string;
  product_id: string;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  type: 'single' | 'multiple';
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  calc_mode: OptionalCalcMode;
  items?: OptionItem[];
}

export interface SelectedOption {
  group_id: string;
  group_name: string;
  items: {
    id: string;
    label: string;
    price_delta: number;
  }[];
}

// Hook para buscar grupos de opcionais de um produto
export function useProductOptionGroups(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-option-groups', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('product_option_groups')
        .select('*, items:product_option_items(*)')
        .eq('product_id', productId)
        .eq('active', true)
        .order('sort_order');

      if (error) throw error;
      
      // Ordenar items dentro de cada grupo
      return (data || []).map(group => ({
        ...group,
        items: (group.items || []).sort((a: OptionItem, b: OptionItem) => a.sort_order - b.sort_order)
      })) as OptionGroup[];
    },
    enabled: !!productId,
  });
}

// Hook para gerenciar grupos (CRUD - admin)
export function useManageOptionGroups() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ['all-option-groups', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('product_option_groups')
        .select('*, items:product_option_items(*), product:products(id, name)')
        .eq('company_id', company.id)
        .order('sort_order');

      if (error) throw error;
      return data as (OptionGroup & { product: { id: string; name: string } })[];
    },
    enabled: !!company?.id,
  });

  const createGroup = useMutation({
    mutationFn: async (group: Omit<OptionGroup, 'id' | 'created_at' | 'updated_at' | 'items'>) => {
      const { data, error } = await supabase
        .from('product_option_groups')
        .insert(group)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-option-groups'] });
      queryClient.invalidateQueries({ queryKey: ['product-option-groups'] });
    },
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OptionGroup> & { id: string }) => {
      const { data, error } = await supabase
        .from('product_option_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-option-groups'] });
      queryClient.invalidateQueries({ queryKey: ['product-option-groups'] });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_option_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-option-groups'] });
      queryClient.invalidateQueries({ queryKey: ['product-option-groups'] });
    },
  });

  return {
    groups: groupsQuery.data || [],
    isLoading: groupsQuery.isLoading,
    createGroup,
    updateGroup,
    deleteGroup,
  };
}

// Hook para gerenciar itens de opcionais (CRUD - admin)
export function useManageOptionItems() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const createItem = useMutation({
    mutationFn: async (item: Omit<OptionItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('product_option_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-option-groups'] });
      queryClient.invalidateQueries({ queryKey: ['product-option-groups'] });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OptionItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('product_option_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-option-groups'] });
      queryClient.invalidateQueries({ queryKey: ['product-option-groups'] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_option_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-option-groups'] });
      queryClient.invalidateQueries({ queryKey: ['product-option-groups'] });
    },
  });

  return {
    createItem,
    updateItem,
    deleteItem,
  };
}

// Função para calcular preço total com opcionais
export function calculateTotalWithOptions(basePrice: number, selectedOptions: SelectedOption[]): number {
  let total = basePrice;
  for (const group of selectedOptions) {
    for (const item of group.items) {
      total += item.price_delta;
    }
  }
  return total;
}

// Função para validar seleção de opcionais
export function validateOptions(groups: OptionGroup[], selectedOptions: SelectedOption[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const group of groups) {
    if (!group.active) continue;

    const selected = selectedOptions.find(s => s.group_id === group.id);
    const count = selected?.items.length || 0;

    if (group.required && count < group.min_select) {
      errors.push(`${group.name}: selecione pelo menos ${group.min_select} ${group.min_select === 1 ? 'opção' : 'opções'}`);
    }

    if (count > group.max_select) {
      errors.push(`${group.name}: máximo de ${group.max_select} ${group.max_select === 1 ? 'opção' : 'opções'}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
