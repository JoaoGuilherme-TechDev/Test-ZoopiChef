import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

// Types
export interface Allergen {
  id: string;
  company_id: string;
  name: string;
  icon: string | null;
  color: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductAllergen {
  id: string;
  product_id: string;
  allergen_id: string;
  company_id: string;
  notes: string | null;
  created_at: string;
  allergen?: Allergen;
}

export interface DietaryTag {
  id: string;
  company_id: string;
  name: string;
  icon: string | null;
  color: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductDietaryTag {
  id: string;
  product_id: string;
  dietary_tag_id: string;
  company_id: string;
  created_at: string;
  dietary_tag?: DietaryTag;
}

export interface FoodPairing {
  id: string;
  company_id: string;
  product_id: string;
  paired_product_id: string;
  pairing_type: string;
  reason: string | null;
  discount_percent: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  paired_product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
}

export interface AdvancedMenuSettings {
  company_id: string;
  show_allergens: boolean;
  show_dietary_tags: boolean;
  show_pairings: boolean;
  show_calories: boolean;
  allergen_display_mode: string;
  pairing_display_mode: string;
  created_at: string;
  updated_at: string;
}

// Allergens Hook
export function useAllergens() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  const { data: allergens = [], isLoading } = useQuery({
    queryKey: ['allergens', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('allergens')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      if (error) throw error;
      return data as Allergen[];
    },
    enabled: !!company?.id,
  });

  const createAllergen = useMutation({
    mutationFn: async (allergen: Omit<Allergen, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      if (!company?.id) throw new Error('No company selected');
      const { data, error } = await supabase
        .from('allergens')
        .insert({ ...allergen, company_id: company.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allergens'] });
      toast.success('Alérgeno criado com sucesso');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateAllergen = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Allergen> & { id: string }) => {
      const { data, error } = await supabase
        .from('allergens')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allergens'] });
      toast.success('Alérgeno atualizado');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteAllergen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('allergens').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allergens'] });
      toast.success('Alérgeno removido');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { allergens, isLoading, createAllergen, updateAllergen, deleteAllergen };
}

// Dietary Tags Hook
export function useDietaryTags() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  const { data: dietaryTags = [], isLoading } = useQuery({
    queryKey: ['dietary_tags', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('dietary_tags')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      if (error) throw error;
      return data as DietaryTag[];
    },
    enabled: !!company?.id,
  });

  const createDietaryTag = useMutation({
    mutationFn: async (tag: Omit<DietaryTag, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      if (!company?.id) throw new Error('No company selected');
      const { data, error } = await supabase
        .from('dietary_tags')
        .insert({ ...tag, company_id: company.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dietary_tags'] });
      toast.success('Tag dietética criada com sucesso');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateDietaryTag = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DietaryTag> & { id: string }) => {
      const { data, error } = await supabase
        .from('dietary_tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dietary_tags'] });
      toast.success('Tag dietética atualizada');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteDietaryTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dietary_tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dietary_tags'] });
      toast.success('Tag dietética removida');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { dietaryTags, isLoading, createDietaryTag, updateDietaryTag, deleteDietaryTag };
}

// Food Pairings Hook
export function useFoodPairings() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  const { data: pairings = [], isLoading } = useQuery({
    queryKey: ['food_pairings', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('food_pairings')
        .select('*, paired_product:products!food_pairings_paired_product_id_fkey(id, name, price, image_url)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FoodPairing[];
    },
    enabled: !!company?.id,
  });

  const createPairing = useMutation({
    mutationFn: async (pairing: Omit<FoodPairing, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'paired_product'>) => {
      if (!company?.id) throw new Error('No company selected');
      const { data, error } = await supabase
        .from('food_pairings')
        .insert({ ...pairing, company_id: company.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food_pairings'] });
      toast.success('Harmonização criada com sucesso');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updatePairing = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FoodPairing> & { id: string }) => {
      const { data, error } = await supabase
        .from('food_pairings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food_pairings'] });
      toast.success('Harmonização atualizada');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deletePairing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('food_pairings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food_pairings'] });
      toast.success('Harmonização removida');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { pairings, isLoading, createPairing, updatePairing, deletePairing };
}

// Product Allergens Hook
export function useProductAllergens(productId?: string) {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  const { data: productAllergens = [], isLoading } = useQuery({
    queryKey: ['product_allergens', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('product_allergens')
        .select('*, allergen:allergens(*)')
        .eq('product_id', productId);
      if (error) throw error;
      return data as ProductAllergen[];
    },
    enabled: !!productId,
  });

  const setProductAllergens = useMutation({
    mutationFn: async ({ productId, allergenIds }: { productId: string; allergenIds: string[] }) => {
      if (!company?.id) throw new Error('No company selected');
      
      // Delete existing
      await supabase.from('product_allergens').delete().eq('product_id', productId);
      
      // Insert new
      if (allergenIds.length > 0) {
        const { error } = await supabase.from('product_allergens').insert(
          allergenIds.map(allergen_id => ({
            product_id: productId,
            allergen_id,
            company_id: company.id,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_allergens'] });
      toast.success('Alérgenos do produto atualizados');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { productAllergens, isLoading, setProductAllergens };
}

// Product Dietary Tags Hook
export function useProductDietaryTags(productId?: string) {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  const { data: productDietaryTags = [], isLoading } = useQuery({
    queryKey: ['product_dietary_tags', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('product_dietary_tags')
        .select('*, dietary_tag:dietary_tags(*)')
        .eq('product_id', productId);
      if (error) throw error;
      return data as ProductDietaryTag[];
    },
    enabled: !!productId,
  });

  const setProductDietaryTags = useMutation({
    mutationFn: async ({ productId, tagIds }: { productId: string; tagIds: string[] }) => {
      if (!company?.id) throw new Error('No company selected');
      
      // Delete existing
      await supabase.from('product_dietary_tags').delete().eq('product_id', productId);
      
      // Insert new
      if (tagIds.length > 0) {
        const { error } = await supabase.from('product_dietary_tags').insert(
          tagIds.map(dietary_tag_id => ({
            product_id: productId,
            dietary_tag_id,
            company_id: company.id,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_dietary_tags'] });
      toast.success('Tags dietéticas do produto atualizadas');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { productDietaryTags, isLoading, setProductDietaryTags };
}

// Advanced Menu Settings Hook
export function useAdvancedMenuSettings() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['advanced_menu_settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from('advanced_menu_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data as AdvancedMenuSettings | null;
    },
    enabled: !!company?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<AdvancedMenuSettings>) => {
      if (!company?.id) throw new Error('No company selected');
      
      const { data, error } = await supabase
        .from('advanced_menu_settings')
        .upsert({ company_id: company.id, ...updates })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanced_menu_settings'] });
      toast.success('Configurações salvas');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { settings, isLoading, updateSettings };
}
