import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface PizzaDoughType {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  price_delta: number;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface PizzaBorderType {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  price_delta: number;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

// ─── DOUGH TYPES ───

export function usePizzaDoughTypes() {
  const { data: company } = useCompany();
  return useQuery({
    queryKey: ['pizza-dough-types', company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pizza_dough_types')
        .select('*')
        .eq('company_id', company!.id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as PizzaDoughType[];
    },
  });
}

export function useActivePizzaDoughTypes(companyId?: string) {
  return useQuery({
    queryKey: ['pizza-dough-types-active', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pizza_dough_types')
        .select('*')
        .eq('company_id', companyId!)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as PizzaDoughType[];
    },
  });
}

export function useUpsertPizzaDoughType() {
  const qc = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (params: { id?: string; name: string; description?: string; price_delta: number; is_active: boolean; is_default: boolean; sort_order?: number }) => {
      const payload = {
        company_id: company!.id,
        name: params.name,
        description: params.description || null,
        price_delta: params.price_delta,
        is_active: params.is_active,
        is_default: params.is_default,
        sort_order: params.sort_order ?? 0,
      };

      if (params.id) {
        const { error } = await supabase.from('pizza_dough_types').update(payload).eq('id', params.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pizza_dough_types').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Tipo de massa salvo');
      qc.invalidateQueries({ queryKey: ['pizza-dough-types'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar tipo de massa'),
  });
}

export function useDeletePizzaDoughType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pizza_dough_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tipo de massa removido');
      qc.invalidateQueries({ queryKey: ['pizza-dough-types'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao remover'),
  });
}

// ─── BORDER TYPES ───

export function usePizzaBorderTypes() {
  const { data: company } = useCompany();
  return useQuery({
    queryKey: ['pizza-border-types', company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pizza_border_types')
        .select('*')
        .eq('company_id', company!.id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as PizzaBorderType[];
    },
  });
}

export function useActivePizzaBorderTypes(companyId?: string) {
  return useQuery({
    queryKey: ['pizza-border-types-active', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pizza_border_types')
        .select('*')
        .eq('company_id', companyId!)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as PizzaBorderType[];
    },
  });
}

export function useUpsertPizzaBorderType() {
  const qc = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (params: { id?: string; name: string; description?: string; price_delta: number; is_active: boolean; is_default: boolean; sort_order?: number }) => {
      const payload = {
        company_id: company!.id,
        name: params.name,
        description: params.description || null,
        price_delta: params.price_delta,
        is_active: params.is_active,
        is_default: params.is_default,
        sort_order: params.sort_order ?? 0,
      };

      if (params.id) {
        const { error } = await supabase.from('pizza_border_types').update(payload).eq('id', params.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pizza_border_types').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Tipo de borda salvo');
      qc.invalidateQueries({ queryKey: ['pizza-border-types'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar tipo de borda'),
  });
}

export function useDeletePizzaBorderType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pizza_border_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tipo de borda removido');
      qc.invalidateQueries({ queryKey: ['pizza-border-types'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao remover'),
  });
}

// ─── PRODUCT LINKING ───

export function useProductDoughTypeLinks(productId: string) {
  return useQuery({
    queryKey: ['product-pizza-dough-links', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_pizza_dough_types')
        .select('dough_type_id')
        .eq('product_id', productId);
      if (error) throw error;
      return (data || []).map(d => d.dough_type_id);
    },
  });
}

export function useProductBorderTypeLinks(productId: string) {
  return useQuery({
    queryKey: ['product-pizza-border-links', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_pizza_border_types')
        .select('border_type_id')
        .eq('product_id', productId);
      if (error) throw error;
      return (data || []).map(d => d.border_type_id);
    },
  });
}

export function useSaveProductDoughLinks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { productId: string; doughTypeIds: string[] }) => {
      await supabase.from('product_pizza_dough_types').delete().eq('product_id', params.productId);
      if (params.doughTypeIds.length > 0) {
        const records = params.doughTypeIds.map(id => ({
          product_id: params.productId,
          dough_type_id: id,
        }));
        const { error } = await supabase.from('product_pizza_dough_types').insert(records);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['product-pizza-dough-links', vars.productId] });
      qc.invalidateQueries({ queryKey: ['product-pizza-configuration-public'] });
    },
  });
}

export function useSaveProductBorderLinks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { productId: string; borderTypeIds: string[] }) => {
      await supabase.from('product_pizza_border_types').delete().eq('product_id', params.productId);
      if (params.borderTypeIds.length > 0) {
        const records = params.borderTypeIds.map(id => ({
          product_id: params.productId,
          border_type_id: id,
        }));
        const { error } = await supabase.from('product_pizza_border_types').insert(records);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['product-pizza-border-links', vars.productId] });
      qc.invalidateQueries({ queryKey: ['product-pizza-configuration-public'] });
    },
  });
}
