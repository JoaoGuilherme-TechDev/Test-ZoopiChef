import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { Store, StoreFormData, StoreTransfer } from '../types';

export function useMultiStore() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Fetch all stores
  const storesQuery = useQuery({
    queryKey: ['stores', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('stores')
        .select('id, company_id, name, code, type, status, address, city, state, zip_code, phone, email, manager_id, timezone, opening_hours, delivery_radius_km, delivery_fee_cents, min_order_cents, is_accepting_orders, is_accepting_delivery, is_accepting_pickup, latitude, longitude, image_url, is_dark_kitchen, menu_slug, menu_enabled, created_at, updated_at, manager:employees(id, name)')
        .eq('company_id', company.id)
        .order('name');
      if (error) throw error;
      return data as Store[];
    },
    enabled: !!company?.id,
  });

  // Fetch transfers
  const transfersQuery = useQuery({
    queryKey: ['store-transfers', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('store_transfers')
        .select(`
          *,
          from_store:stores!from_store_id(id, name),
          to_store:stores!to_store_id(id, name),
          items:store_transfer_items(*)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as StoreTransfer[];
    },
    enabled: !!company?.id,
  });

  // Create store
  const createStore = useMutation({
    mutationFn: async (data: StoreFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { error } = await (supabase as any)
        .from('stores')
        .insert({
          company_id: company.id,
          ...data,
          status: 'active',
          is_accepting_orders: true,
          is_accepting_delivery: true,
          is_accepting_pickup: true,
          timezone: data.timezone || 'America/Sao_Paulo',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Loja criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar loja: ' + error.message);
    },
  });

  // Update store
  const updateStore = useMutation({
    mutationFn: async ({ id, ...data }: StoreFormData & { id: string }) => {
      const { error } = await (supabase as any)
        .from('stores')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Loja atualizada');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Toggle store status
  const toggleStoreStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Store['status'] }) => {
      const { error } = await (supabase as any)
        .from('stores')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Status atualizado');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Toggle order acceptance
  const toggleOrderAcceptance = useMutation({
    mutationFn: async ({ id, accepting }: { id: string; accepting: boolean }) => {
      const { error } = await (supabase as any)
        .from('stores')
        .update({ is_accepting_orders: accepting })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success(
        'Agora ' + (storesQuery.data?.find(s => s.id)?.is_accepting_orders ? 'aceitando' : 'não aceitando') + ' pedidos'
      );
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Create transfer
  const createTransfer = useMutation({
    mutationFn: async (data: {
      from_store_id: string;
      to_store_id: string;
      items: { product_name: string; quantity: number; product_id?: string; erp_item_id?: string }[];
      notes?: string;
    }) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Create transfer
      const { data: transfer, error } = await (supabase as any)
        .from('store_transfers')
        .insert({
          company_id: company.id,
          from_store_id: data.from_store_id,
          to_store_id: data.to_store_id,
          status: 'pending',
          requested_by: (await supabase.auth.getUser()).data.user?.id,
          notes: data.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Create transfer items
      const items = data.items.map(item => ({
        transfer_id: transfer.id,
        product_id: item.product_id || null,
        erp_item_id: item.erp_item_id || null,
        product_name: item.product_name,
        quantity_requested: item.quantity,
      }));

      await (supabase as any)
        .from('store_transfer_items')
        .insert(items);

      return transfer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-transfers'] });
      toast.success('Transferência solicitada');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Approve transfer
  const approveTransfer = useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await (supabase as any)
        .from('store_transfers')
        .update({
          status: 'in_transit',
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
          dispatched_at: new Date().toISOString(),
        })
        .eq('id', transferId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-transfers'] });
      toast.success('Transferência aprovada');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Receive transfer
  const receiveTransfer = useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await (supabase as any)
        .from('store_transfers')
        .update({
          status: 'received',
          received_by: (await supabase.auth.getUser()).data.user?.id,
          received_at: new Date().toISOString(),
        })
        .eq('id', transferId);

      if (error) throw error;

      // TODO: Update stock in destination store
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-transfers'] });
      toast.success('Transferência recebida');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Get store KPIs
  const activeStores = storesQuery.data?.filter(s => s.status === 'active').length || 0;
  const acceptingOrders = storesQuery.data?.filter(s => s.is_accepting_orders).length || 0;
  const pendingTransfers = transfersQuery.data?.filter(t => t.status === 'pending').length || 0;

  return {
    stores: storesQuery.data || [],
    transfers: transfersQuery.data || [],
    isLoading: storesQuery.isLoading,
    activeStores,
    acceptingOrders,
    pendingTransfers,
    createStore,
    updateStore,
    toggleStoreStatus,
    toggleOrderAcceptance,
    createTransfer,
    approveTransfer,
    receiveTransfer,
  };
}
