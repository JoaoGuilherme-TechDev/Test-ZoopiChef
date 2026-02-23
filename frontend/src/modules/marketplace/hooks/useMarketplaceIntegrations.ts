import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { MarketplaceIntegration, MarketplaceOrder, MarketplaceProvider } from '../types';

export function useMarketplaceIntegrations() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Fetch all integrations
  const integrationsQuery = useQuery({
    queryKey: ['marketplace-integrations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('marketplace_integrations')
        .select('*')
        .eq('company_id', company.id);
      if (error) throw error;
      return data as MarketplaceIntegration[];
    },
    enabled: !!company?.id,
  });

  // Fetch marketplace orders
  const ordersQuery = useQuery({
    queryKey: ['marketplace-orders', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('marketplace_orders')
        .select('*')
        .eq('company_id', company.id)
        .order('placed_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as MarketplaceOrder[];
    },
    enabled: !!company?.id,
  });

  // Connect to marketplace
  const connectMarketplace = useMutation({
    mutationFn: async (provider: MarketplaceProvider) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Check if already exists
      const existing = integrationsQuery.data?.find(i => i.provider === provider);
      if (existing) {
        throw new Error(`Já existe uma integração com ${provider}`);
      }

      // Create integration record
      const { data: integration, error } = await (supabase as any)
        .from('marketplace_integrations')
        .insert({
          company_id: company.id,
          provider,
          status: 'connecting',
          auto_accept_orders: false,
          auto_print_orders: true,
          sync_menu: false,
          sync_stock: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Initiate OAuth flow via edge function
      const { data: authData, error: authError } = await supabase.functions.invoke('marketplace-auth', {
        body: { 
          provider, 
          integrationId: integration.id,
          action: 'initiate',
        },
      });

      if (authError) throw authError;

      return authData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-integrations'] });
      if (data?.authUrl) {
        // Open OAuth window
        window.open(data.authUrl, '_blank', 'width=600,height=700');
      }
      toast.success('Iniciando conexão...');
    },
    onError: (error: any) => {
      toast.error('Erro ao conectar: ' + error.message);
    },
  });

  // Disconnect from marketplace
  const disconnectMarketplace = useMutation({
    mutationFn: async (integrationId: string) => {
      const { error } = await (supabase as any)
        .from('marketplace_integrations')
        .update({
          status: 'disconnected',
          access_token: null,
          refresh_token: null,
        })
        .eq('id', integrationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-integrations'] });
      toast.success('Desconectado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao desconectar: ' + error.message);
    },
  });

  // Update integration settings
  const updateSettings = useMutation({
    mutationFn: async ({ 
      integrationId, 
      settings 
    }: { 
      integrationId: string; 
      settings: Partial<MarketplaceIntegration>;
    }) => {
      const { error } = await (supabase as any)
        .from('marketplace_integrations')
        .update(settings)
        .eq('id', integrationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-integrations'] });
      toast.success('Configurações atualizadas');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Accept marketplace order
  const acceptOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const order = ordersQuery.data?.find(o => o.id === orderId);
      if (!order) throw new Error('Pedido não encontrado');

      // Call edge function to confirm on marketplace
      const { error } = await supabase.functions.invoke('marketplace-order-action', {
        body: { 
          orderId,
          action: 'confirm',
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
      toast.success('Pedido aceito');
    },
    onError: (error: any) => {
      toast.error('Erro ao aceitar: ' + error.message);
    },
  });

  // Reject marketplace order
  const rejectOrder = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const { error } = await supabase.functions.invoke('marketplace-order-action', {
        body: { 
          orderId,
          action: 'cancel',
          reason,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
      toast.success('Pedido rejeitado');
    },
    onError: (error: any) => {
      toast.error('Erro ao rejeitar: ' + error.message);
    },
  });

  // Update order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase.functions.invoke('marketplace-order-action', {
        body: { 
          orderId,
          action: 'update_status',
          status,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-orders'] });
      toast.success('Status atualizado');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Sync menu to marketplace
  const syncMenu = useMutation({
    mutationFn: async (integrationId: string) => {
      const { error } = await supabase.functions.invoke('marketplace-sync', {
        body: { 
          integrationId,
          type: 'menu',
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-integrations'] });
      toast.success('Cardápio sincronizado');
    },
    onError: (error: any) => {
      toast.error('Erro ao sincronizar: ' + error.message);
    },
  });

  // Get integration by provider
  const getIntegration = (provider: MarketplaceProvider) => 
    integrationsQuery.data?.find(i => i.provider === provider);

  // Get pending orders count
  const pendingOrdersCount = ordersQuery.data?.filter(o => 
    o.status === 'placed' || o.status === 'confirmed'
  ).length || 0;

  return {
    integrations: integrationsQuery.data || [],
    orders: ordersQuery.data || [],
    isLoading: integrationsQuery.isLoading || ordersQuery.isLoading,
    pendingOrdersCount,
    getIntegration,
    connectMarketplace,
    disconnectMarketplace,
    updateSettings,
    acceptOrder,
    rejectOrder,
    updateOrderStatus,
    syncMenu,
  };
}
