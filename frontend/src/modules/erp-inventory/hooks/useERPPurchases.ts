import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ERPPurchaseEntry, ERPPurchaseEntryFormData } from '../types';

export function useERPPurchases() {
  const { data: company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: ['erp-purchase-entries', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('erp_purchase_entries')
        .select(`
          *,
          supplier:erp_suppliers(*),
          items:erp_purchase_entry_items(
            *,
            erp_item:erp_items(*),
            unit:erp_units(*)
          )
        `)
        .eq('company_id', company.id)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return data as ERPPurchaseEntry[];
    },
    enabled: !!company?.id,
  });

  const createEntry = useMutation({
    mutationFn: async (data: ERPPurchaseEntryFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      
      // Create entry
      const { data: entry, error: entryError } = await (supabase as any)
        .from('erp_purchase_entries')
        .insert({
          company_id: company.id,
          supplier_id: data.supplier_id || null,
          entry_date: data.entry_date,
          invoice_number: data.invoice_number || null,
          freight: data.freight || 0,
          taxes: data.taxes || 0,
          notes: data.notes || null,
          created_by: user?.id,
          status: 'draft',
        })
        .select()
        .single();
      if (entryError) throw entryError;

      // Create entry items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map(item => ({
          company_id: company.id,
          entry_id: entry.id,
          erp_item_id: item.erp_item_id,
          qty: item.qty,
          unit_id: item.unit_id || null,
          unit_cost: item.unit_cost,
          total_cost: item.qty * item.unit_cost,
        }));
        const { error: itemsError } = await (supabase as any)
          .from('erp_purchase_entry_items')
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-purchase-entries'] });
      toast.success('Entrada de compra criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar entrada: ' + error.message);
    },
  });

  const postEntry = useMutation({
    mutationFn: async (entryId: string) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      
      // Get entry with items
      const { data: entry, error: fetchError } = await (supabase as any)
        .from('erp_purchase_entries')
        .select(`
          *,
          items:erp_purchase_entry_items(*)
        `)
        .eq('id', entryId)
        .single();
      if (fetchError) throw fetchError;
      if (entry.status === 'posted') throw new Error('Entrada já foi lançada');

      // Process each item - update stock and cost
      for (const item of entry.items) {
        // Get current item data
        const { data: erpItem, error: itemError } = await (supabase as any)
          .from('erp_items')
          .select('*')
          .eq('id', item.erp_item_id)
          .single();
        if (itemError) throw itemError;

        // Calculate new weighted average cost
        const currentStock = erpItem.current_stock || 0;
        const currentAvgCost = erpItem.avg_cost || 0;
        const newQty = item.qty;
        const newCost = item.unit_cost;
        
        let newAvgCost: number;
        if (currentStock + newQty === 0) {
          newAvgCost = newCost;
        } else {
          newAvgCost = ((currentStock * currentAvgCost) + (newQty * newCost)) / (currentStock + newQty);
        }
        const newStock = currentStock + newQty;

        // Update item stock and cost
        const { error: updateError } = await (supabase as any)
          .from('erp_items')
          .update({
            current_stock: newStock,
            avg_cost: newAvgCost,
            last_cost: newCost,
          })
          .eq('id', item.erp_item_id);
        if (updateError) throw updateError;

        // Create stock movement
        const { error: movementError } = await (supabase as any)
          .from('erp_stock_movements')
          .insert({
            company_id: company.id,
            erp_item_id: item.erp_item_id,
            movement_type: 'purchase_in',
            qty: newQty,
            unit_id: item.unit_id,
            unit_cost_snapshot: newCost,
            balance_after: newStock,
            source_table: 'erp_purchase_entries',
            source_id: entryId,
            created_by: user?.id,
          });
        if (movementError) throw movementError;
      }

      // Mark entry as posted
      const { error: postError } = await (supabase as any)
        .from('erp_purchase_entries')
        .update({
          status: 'posted',
          posted_at: new Date().toISOString(),
          posted_by: user?.id,
        })
        .eq('id', entryId);
      if (postError) throw postError;

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-purchase-entries'] });
      queryClient.invalidateQueries({ queryKey: ['erp-items'] });
      queryClient.invalidateQueries({ queryKey: ['erp-stock-movements'] });
      toast.success('Entrada lançada! Estoque e custo atualizados.');
    },
    onError: (error: any) => {
      toast.error('Erro ao lançar entrada: ' + error.message);
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      // Only draft entries can be deleted
      const { data: entry } = await (supabase as any)
        .from('erp_purchase_entries')
        .select('status')
        .eq('id', entryId)
        .single();
      if (entry?.status === 'posted') {
        throw new Error('Não é possível excluir entrada já lançada');
      }
      const { error } = await (supabase as any)
        .from('erp_purchase_entries')
        .delete()
        .eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-purchase-entries'] });
      toast.success('Entrada excluída');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir entrada: ' + error.message);
    },
  });

  return {
    entries: entriesQuery.data || [],
    isLoading: entriesQuery.isLoading,
    createEntry,
    postEntry,
    deleteEntry,
  };
}
