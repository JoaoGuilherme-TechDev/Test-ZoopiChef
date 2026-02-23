import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ComandaItem {
  id: string;
  company_id: string;
  comanda_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  qty: number;
  unit_price_snapshot: number;
  notes: string | null;
  options_json: any;
  created_at: string;
  created_by: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  is_printed: boolean;
  printed_at: string | null;
}

function mapComandaItemToFrontend(item: any): ComandaItem {
  return {
    id: item.id,
    company_id: item.companyId,
    comanda_id: item.comandaId,
    product_id: item.productId,
    product_name_snapshot: item.productName,
    qty: Number(item.qty),
    unit_price_snapshot: Number(item.unitPrice),
    notes: item.notes,
    options_json: item.optionsJson,
    created_at: item.createdAt,
    created_by: item.createdBy,
    canceled_at: item.canceledAt,
    cancel_reason: item.cancelReason,
    is_printed: item.isPrinted,
    printed_at: item.printedAt,
  };
}

export function useComandaItems(comandaId: string | null) {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ['comanda-items', comandaId],
    queryFn: async () => {
      if (!comandaId) return [];

      const response = await api.get('/comanda-items', {
        params: { comandaId }
      });

      return (response.data || []).map(mapComandaItemToFrontend);
    },
    enabled: !!comandaId,
    refetchInterval: 5000, // Polling instead of realtime
  });

  // Active items (not canceled)
  const activeItems = items.filter(item => !item.canceled_at);

  // Grouped items for display (same product + same options = combined qty)
  const groupedItems = activeItems.reduce((acc, item) => {
    const key = `${item.product_id}-${JSON.stringify(item.options_json)}-${item.notes || ''}`;
    const existing = acc.find(g => g.key === key);
    
    if (existing) {
      existing.totalQty += Number(item.qty);
      existing.items.push(item);
    } else {
      acc.push({
        key,
        product_name: item.product_name_snapshot,
        unit_price: Number(item.unit_price_snapshot),
        totalQty: Number(item.qty),
        notes: item.notes,
        options_json: item.options_json,
        items: [item],
      });
    }
    
    return acc;
  }, [] as Array<{
    key: string;
    product_name: string;
    unit_price: number;
    totalQty: number;
    notes: string | null;
    options_json: any;
    items: ComandaItem[];
  }>);

  return { items, activeItems, groupedItems, isLoading, error, refetch };
}

export function useComandaItemMutations() {
  const { company } = useCompanyContext();
  const companyId = company?.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const addItem = useMutation({
    mutationFn: async ({
      comandaId,
      productId,
      productName,
      qty,
      unitPrice,
      notes,
      optionsJson,
    }: {
      comandaId: string;
      productId: string | null;
      productName: string;
      qty: number;
      unitPrice: number;
      notes?: string;
      optionsJson?: any;
    }) => {
      if (!companyId) throw new Error('Company not found');

      const response = await api.post('/comanda-items', {
        comandaId,
        productId,
        productName,
        qty,
        unitPrice,
        notes,
        optionsJson,
      });

      return mapComandaItemToFrontend(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comanda-items', variables.comandaId] });
      queryClient.invalidateQueries({ queryKey: ['comandas', companyId] });
      // Backend now handles recalc
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar item: ' + error.message);
    },
  });

  const cancelItem = useMutation({
    mutationFn: async ({ itemId, reason }: { itemId: string; reason: string }) => {
      if (!companyId) throw new Error('Company not found');

      const response = await api.post(`/comanda-items/${itemId}/cancel`, {
        reason,
      });

      return mapComandaItemToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comanda-items'] });
      queryClient.invalidateQueries({ queryKey: ['comandas', companyId] });
      toast.success('Item cancelado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cancelar item: ' + error.message);
    },
  });

  const transferItem = useMutation({
    mutationFn: async ({
      itemId,
      targetComandaId,
      qtyToTransfer,
    }: {
      itemId: string;
      targetComandaId: string;
      qtyToTransfer: number;
    }) => {
      if (!companyId) throw new Error('Company not found');

      await api.post('/comanda-items/transfer', {
        itemId,
        targetComandaId,
        qtyToTransfer,
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comanda-items'] });
      queryClient.invalidateQueries({ queryKey: ['comandas', companyId] });
      toast.success('Item transferido!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao transferir item: ' + error.message);
    },
  });

  const markAsPrinted = useMutation({
    mutationFn: async (itemIds: string[]) => {
      if (!companyId) throw new Error('Company not found');

      await api.post('/comanda-items/print', {
        ids: itemIds,
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comanda-items'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao marcar como impresso: ' + error.message);
    },
  });

  return { addItem, cancelItem, transferItem, markAsPrinted };
}
