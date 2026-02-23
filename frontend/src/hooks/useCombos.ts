import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

// Types
export type ComboType = 'fixed' | 'selectable' | 'aggregate';
export type FiscalMode = 'auto' | 'manual';
export type FiscalOverride = 'st' | 'icms' | null;

export const COMBO_TYPE_LABELS: Record<ComboType, string> = {
  fixed: 'Fixo',
  selectable: 'Selecionável',
  aggregate: 'Agregado',
};

export const FISCAL_MODE_LABELS: Record<FiscalMode, string> = {
  auto: 'Automático',
  manual: 'Manual',
};

export interface ComboGroupItem {
  id: string;
  combo_group_id: string;
  company_id: string;
  product_id: string;
  additional_price: number;
  custom_price: number | null;
  inherit_price: boolean;
  fiscal_override: FiscalOverride;
  is_default: boolean;
  display_order: number;
  active: boolean;
  created_at: string;
  // Joined data
  product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    ncm_code: string | null;
    tax_status: string | null;
  };
}

export interface ComboGroup {
  id: string;
  combo_id: string;
  company_id: string;
  name: string;
  description: string | null;
  min_select: number;
  max_select: number;
  required: boolean;
  display_order: number;
  created_at: string;
  // Joined data
  items?: ComboGroupItem[];
}

export interface Combo {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  combo_type: ComboType;
  price: number;
  fiscal_mode: FiscalMode;
  active: boolean;
  aparece_delivery: boolean;
  aparece_totem: boolean;
  aparece_tablet: boolean;
  aparece_mesa: boolean;
  aparece_comanda: boolean;
  aparece_garcom: boolean;
  aparece_tv: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  groups?: ComboGroup[];
}

export interface CreateComboInput {
  name: string;
  description?: string;
  image_url?: string;
  combo_type: ComboType;
  price: number;
  fiscal_mode: FiscalMode;
  active?: boolean;
  aparece_delivery?: boolean;
  aparece_totem?: boolean;
  aparece_tablet?: boolean;
  aparece_mesa?: boolean;
  aparece_comanda?: boolean;
  aparece_garcom?: boolean;
  aparece_tv?: boolean;
}

export interface UpdateComboInput extends Partial<CreateComboInput> {
  id: string;
}

export interface CreateComboGroupInput {
  combo_id: string;
  name: string;
  description?: string;
  min_select?: number;
  max_select?: number;
  required?: boolean;
  display_order?: number;
}

export interface UpdateComboGroupInput extends Partial<Omit<CreateComboGroupInput, 'combo_id'>> {
  id: string;
}

export interface CreateComboGroupItemInput {
  combo_group_id: string;
  product_id: string;
  additional_price?: number;
  custom_price?: number | null;
  inherit_price?: boolean;
  fiscal_override?: FiscalOverride;
  is_default?: boolean;
  display_order?: number;
}

export interface UpdateComboGroupItemInput extends Partial<Omit<CreateComboGroupItemInput, 'combo_group_id'>> {
  id: string;
}

// Mappers
const mapComboGroupItemToFrontend = (data: any): ComboGroupItem => ({
  id: data.id,
  combo_group_id: data.comboGroupId,
  company_id: data.companyId,
  product_id: data.productId,
  additional_price: Number(data.additionalPrice),
  custom_price: data.customPrice ? Number(data.customPrice) : null,
  inherit_price: data.inheritPrice,
  fiscal_override: data.fiscalOverride,
  is_default: data.isDefault,
  display_order: data.displayOrder,
  active: data.active,
  created_at: data.createdAt,
  product: data.product ? {
    id: data.product.id,
    name: data.product.name,
    price: data.product.priceCents ? Number(data.product.priceCents) / 100 : 0,
    image_url: data.product.imageUrl,
    ncm_code: data.product.ncmCode || null,
    tax_status: data.product.taxStatus || null,
  } : undefined,
});

const mapComboGroupToFrontend = (data: any): ComboGroup => ({
  id: data.id,
  combo_id: data.comboId,
  company_id: data.companyId,
  name: data.name,
  description: data.description,
  min_select: data.minSelect,
  max_select: data.maxSelect,
  required: data.required,
  display_order: data.displayOrder,
  created_at: data.createdAt,
  items: data.items?.map(mapComboGroupItemToFrontend),
});

const mapComboToFrontend = (data: any): Combo => ({
  id: data.id,
  company_id: data.companyId,
  name: data.name,
  description: data.description,
  image_url: data.imageUrl,
  combo_type: data.comboType,
  price: Number(data.price),
  fiscal_mode: data.fiscalMode,
  active: data.active,
  aparece_delivery: data.apareceDelivery,
  aparece_totem: data.apareceTotem,
  aparece_tablet: data.apareceTablet,
  aparece_mesa: data.apareceMesa,
  aparece_comanda: data.apareceComanda,
  aparece_garcom: data.apareceGarcom,
  aparece_tv: data.apareceTv,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
  groups: data.groups?.map(mapComboGroupToFrontend),
});

const mapComboToBackend = (data: Partial<CreateComboInput>): any => {
  const mapped: any = {};
  if (data.name) mapped.name = data.name;
  if (data.description) mapped.description = data.description;
  if (data.image_url) mapped.imageUrl = data.image_url;
  if (data.combo_type) mapped.comboType = data.combo_type;
  if (data.price !== undefined) mapped.price = data.price;
  if (data.fiscal_mode) mapped.fiscalMode = data.fiscal_mode;
  if (data.active !== undefined) mapped.active = data.active;
  if (data.aparece_delivery !== undefined) mapped.apareceDelivery = data.aparece_delivery;
  if (data.aparece_totem !== undefined) mapped.apareceTotem = data.aparece_totem;
  if (data.aparece_tablet !== undefined) mapped.apareceTablet = data.aparece_tablet;
  if (data.aparece_mesa !== undefined) mapped.apareceMesa = data.aparece_mesa;
  if (data.aparece_comanda !== undefined) mapped.apareceComanda = data.aparece_comanda;
  if (data.aparece_garcom !== undefined) mapped.apareceGarcom = data.aparece_garcom;
  if (data.aparece_tv !== undefined) mapped.apareceTv = data.aparece_tv;
  return mapped;
};

const mapComboGroupToBackend = (data: Partial<CreateComboGroupInput>): any => {
  const mapped: any = {};
  if (data.combo_id) mapped.comboId = data.combo_id;
  if (data.name) mapped.name = data.name;
  if (data.description) mapped.description = data.description;
  if (data.min_select !== undefined) mapped.minSelect = data.min_select;
  if (data.max_select !== undefined) mapped.maxSelect = data.max_select;
  if (data.required !== undefined) mapped.required = data.required;
  if (data.display_order !== undefined) mapped.displayOrder = data.display_order;
  return mapped;
};

const mapComboGroupItemToBackend = (data: Partial<CreateComboGroupItemInput>): any => {
  const mapped: any = {};
  if (data.combo_group_id) mapped.comboGroupId = data.combo_group_id;
  if (data.product_id) mapped.productId = data.product_id;
  if (data.additional_price !== undefined) mapped.additionalPrice = data.additional_price;
  if (data.custom_price !== undefined) mapped.customPrice = data.custom_price;
  if (data.inherit_price !== undefined) mapped.inheritPrice = data.inherit_price;
  if (data.fiscal_override) mapped.fiscalOverride = data.fiscal_override;
  if (data.is_default !== undefined) mapped.isDefault = data.is_default;
  if (data.display_order !== undefined) mapped.displayOrder = data.display_order;
  return mapped;
};

// ============ Hooks ============

export function useCombos() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['combos', company?.id],
    queryFn: async (): Promise<Combo[]> => {
      if (!company?.id) return [];

      const { data } = await api.get(`/combos?companyId=${company.id}`);
      return data.map(mapComboToFrontend);
    },
    enabled: !!company?.id,
  });
}

export function useCombo(comboId: string | undefined) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['combo', comboId],
    queryFn: async (): Promise<Combo | null> => {
      if (!company?.id || !comboId) return null;

      const { data } = await api.get(`/combos/${comboId}?companyId=${company.id}`);
      return mapComboToFrontend(data);
    },
    enabled: !!company?.id && !!comboId,
  });
}

export function useCreateCombo() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (input: CreateComboInput) => {
      if (!company?.id) throw new Error('Company not found');

      const payload = {
        ...mapComboToBackend(input),
        companyId: company.id,
      };

      const { data } = await api.post('/combos', payload);
      return mapComboToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      toast.success('Combo criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar combo: ${error.message}`);
    },
  });
}

export function useUpdateCombo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateComboInput) => {
      const payload = mapComboToBackend(input);
      const { data } = await api.patch(`/combos/${id}`, payload);
      return mapComboToFrontend(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      queryClient.invalidateQueries({ queryKey: ['combo', data.id] });
      toast.success('Combo atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar combo: ${error.message}`);
    },
  });
}

export function useDeleteCombo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/combos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      toast.success('Combo excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir combo: ${error.message}`);
    },
  });
}

// ============ Combo Groups ============

export function useCreateComboGroup() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (input: CreateComboGroupInput) => {
      if (!company?.id) throw new Error('Company not found');

      const payload = {
        ...mapComboGroupToBackend(input),
        companyId: company.id,
      };

      const { data } = await api.post('/combos/groups', payload);
      return mapComboGroupToFrontend(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      queryClient.invalidateQueries({ queryKey: ['combo', data.combo_id] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar grupo: ${error.message}`);
    },
  });
}

export function useUpdateComboGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateComboGroupInput) => {
      const payload = mapComboGroupToBackend(input);
      const { data } = await api.patch(`/combos/groups/${id}`, payload);
      return mapComboGroupToFrontend(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      queryClient.invalidateQueries({ queryKey: ['combo', data.combo_id] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar grupo: ${error.message}`);
    },
  });
}

export function useDeleteComboGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/combos/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir grupo: ${error.message}`);
    },
  });
}

// ============ Combo Group Items ============

export function useCreateComboGroupItem() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (input: CreateComboGroupItemInput) => {
      if (!company?.id) throw new Error('Company not found');

      const payload = {
        ...mapComboGroupItemToBackend(input),
        companyId: company.id,
      };

      const { data } = await api.post('/combos/groups/items', payload);
      return mapComboGroupItemToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar produto: ${error.message}`);
    },
  });
}

export function useUpdateComboGroupItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateComboGroupItemInput) => {
      const payload = mapComboGroupItemToBackend(input);
      const { data } = await api.patch(`/combos/groups/items/${id}`, payload);
      return mapComboGroupItemToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar item: ${error.message}`);
    },
  });
}

export function useDeleteComboGroupItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/combos/groups/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover item: ${error.message}`);
    },
  });
}

// ============ Bulk Operations ============

export function useAddProductsToGroup() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async ({ groupId, productIds }: { groupId: string; productIds: string[] }) => {
      if (!company?.id) throw new Error('Company not found');

      const { data } = await api.post(`/combos/groups/${groupId}/products`, {
        productIds,
        companyId: company.id,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      toast.success('Produtos adicionados ao grupo!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar produtos: ${error.message}`);
    },
  });
}

// ============ Utility Functions ============

/**
 * Calculates the total price of a combo based on selected items
 */
export function calculateComboPrice(
  combo: Combo,
  selections: Record<string, string[]> // groupId -> selected productIds
): number {
  if (combo.combo_type === 'fixed' || combo.combo_type === 'selectable') {
    // Base price + additional costs for premium selections
    let total = combo.price;
    
    for (const group of combo.groups || []) {
      const selectedProductIds = selections[group.id] || [];
      for (const item of group.items || []) {
        if (selectedProductIds.includes(item.product_id)) {
          total += item.additional_price || 0;
        }
      }
    }
    
    return total;
  }
  
  if (combo.combo_type === 'aggregate') {
    // Sum of all selected item prices
    let total = 0;
    
    for (const group of combo.groups || []) {
      const selectedProductIds = selections[group.id] || [];
      for (const item of group.items || []) {
        if (selectedProductIds.includes(item.product_id)) {
          if (item.inherit_price && item.product) {
            total += item.product.price;
          } else {
            total += item.custom_price ?? 0;
          }
        }
      }
    }
    
    return total;
  }
  
  return combo.price;
}
