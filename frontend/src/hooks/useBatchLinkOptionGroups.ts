import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export interface BatchOptionGroupLink {
  groupId: string;
  minSelect?: number;
  maxSelect?: number;
  sortOrder?: number;
  selectionUnique?: boolean;
  calcMode?: string;
}

export interface MasterOptionalGroupForBatch {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  selection_unique: boolean;
  calc_mode: string | null;
  active: boolean;
  items_count: number;
}

// Fetch master optional groups from optional_groups table (cadastro master)
export function useOptionGroupsForBatch() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['optional-groups-for-batch', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('optional_groups')
        .select(`
          id,
          name,
          min_select,
          max_select,
          required,
          selection_unique,
          calc_mode,
          active,
          items:optional_group_items(id)
        `)
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;

      return (data || []).map(group => ({
        id: group.id,
        name: group.name,
        min_select: group.min_select,
        max_select: group.max_select,
        required: group.required,
        selection_unique: group.selection_unique,
        calc_mode: group.calc_mode,
        active: group.active,
        items_count: group.items?.length || 0,
      })) as MasterOptionalGroupForBatch[];
    },
    enabled: !!company?.id,
  });
}

// Link master optional groups to products in batch
export function useBatchDirectLinkOptionGroups() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async ({
      productIds,
      groupLinks,
    }: {
      productIds: string[];
      groupLinks: BatchOptionGroupLink[];
    }) => {
      if (!company?.id) throw new Error('Company not found');
      if (groupLinks.length === 0) throw new Error('Selecione ao menos um grupo');

      for (const link of groupLinks) {
        // Fetch master group defaults
        const { data: masterGroup, error: masterError } = await supabase
          .from('optional_groups')
          .select('*')
          .eq('id', link.groupId)
          .single();

        if (masterError) throw masterError;

        for (const productId of productIds) {
          // Check if link already exists for this product-group combo
          const { data: existing } = await supabase
            .from('product_optional_groups')
            .select('id')
            .eq('product_id', productId)
            .eq('optional_group_id', link.groupId)
            .maybeSingle();

          if (existing) {
            // Update existing link with new config
            await supabase
              .from('product_optional_groups')
              .update({
                min_select: link.minSelect ?? masterGroup.min_select,
                max_select: link.maxSelect ?? masterGroup.max_select,
                sort_order: link.sortOrder ?? 10,
                selection_unique: link.selectionUnique ?? masterGroup.selection_unique,
                calc_mode: link.calcMode ?? masterGroup.calc_mode,
              })
              .eq('id', existing.id);
          } else {
            // Create new link
            const { error: insertError } = await supabase
              .from('product_optional_groups')
              .insert({
                company_id: company.id,
                product_id: productId,
                optional_group_id: link.groupId,
                min_select: link.minSelect ?? masterGroup.min_select,
                max_select: link.maxSelect ?? masterGroup.max_select,
                sort_order: link.sortOrder ?? 10,
                selection_unique: link.selectionUnique ?? masterGroup.selection_unique,
                calc_mode: link.calcMode ?? masterGroup.calc_mode,
                active: true,
              });

            if (insertError && insertError.code !== '23505') {
              throw insertError;
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-optional-groups'] });
      queryClient.invalidateQueries({ queryKey: ['optional-groups-for-batch'] });
    },
  });
}

// Remove optional groups from products in batch (by group id)
export function useBatchRemoveOptionGroups() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async ({
      productIds,
      groupIds,
    }: {
      productIds: string[];
      groupIds: string[];
    }) => {
      if (!company?.id) throw new Error('Company not found');
      if (groupIds.length === 0) throw new Error('Selecione ao menos um grupo');

      const { error } = await supabase
        .from('product_optional_groups')
        .delete()
        .in('product_id', productIds)
        .in('optional_group_id', groupIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-optional-groups'] });
    },
  });
}
