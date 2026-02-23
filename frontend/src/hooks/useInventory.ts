import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface InventoryItem {
  id: string;
  company_id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
  supplier_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  company_id: string;
  inventory_item_id: string;
  movement_type: 'entrada' | 'saida' | 'ajuste' | 'venda';
  quantity: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  inventory_items?: { name: string };
}

export function useInventory() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory-items', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!company?.id,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['inventory-movements', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`*, inventory_items:inventory_item_id (name)`)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as InventoryMovement[];
    },
    enabled: !!company?.id,
  });

  const lowStockItems = items.filter(i => i.current_stock <= i.min_stock);

  const createItem = useMutation({
    mutationFn: async (item: Omit<Partial<InventoryItem>, 'id' | 'company_id' | 'created_at' | 'updated_at'> & { name: string }) => {
      const { error } = await supabase
        .from('inventory_items')
        .insert({
          name: item.name,
          unit: item.unit || 'un',
          current_stock: item.current_stock || 0,
          min_stock: item.min_stock || 0,
          cost_per_unit: item.cost_per_unit || 0,
          supplier_name: item.supplier_name,
          is_active: item.is_active ?? true,
          company_id: company!.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast.success('Item criado!');
    },
    onError: () => toast.error('Erro ao criar item'),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      const { error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast.success('Item atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar item'),
  });

  const addMovement = useMutation({
    mutationFn: async (movement: {
      inventory_item_id: string;
      movement_type: 'entrada' | 'saida' | 'ajuste';
      quantity: number;
      notes?: string;
    }) => {
      const item = items.find(i => i.id === movement.inventory_item_id);
      if (!item) throw new Error('Item não encontrado');
      
      let newBalance = item.current_stock;
      if (movement.movement_type === 'entrada') {
        newBalance += movement.quantity;
      } else if (movement.movement_type === 'saida') {
        newBalance -= movement.quantity;
      } else {
        newBalance = movement.quantity; // ajuste define valor absoluto
      }

      const { error } = await supabase
        .from('inventory_movements')
        .insert({
          company_id: company!.id,
          inventory_item_id: movement.inventory_item_id,
          movement_type: movement.movement_type,
          quantity: movement.quantity,
          balance_after: newBalance,
          notes: movement.notes,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      toast.success('Movimento registrado!');
    },
    onError: () => toast.error('Erro ao registrar movimento'),
  });

  return {
    items,
    movements,
    lowStockItems,
    isLoading,
    createItem: createItem.mutate,
    updateItem: updateItem.mutate,
    addMovement: addMovement.mutate,
    isCreating: createItem.isPending,
  };
}
