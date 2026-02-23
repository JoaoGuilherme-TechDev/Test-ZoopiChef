import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';

export function useVirtualCard() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ['virtual-card-requests', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('virtual_card_requests')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const getCustomerCardData = useMutation({
    mutationFn: async (customerId: string) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name, whatsapp')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;

      const { data: loyaltyPoints } = await supabase
        .from('customer_loyalty_points')
        .select('*')
        .eq('customer_id', customerId)
        .eq('company_id', company.id)
        .maybeSingle();

      return {
        customerId: customer.id,
        customerName: customer.name || 'Cliente',
        customerPhone: customer.whatsapp || '',
        currentPoints: loyaltyPoints?.current_points || 0,
        totalEarned: loyaltyPoints?.total_earned || 0,
        levelName: 'Bronze',
        levelColor: '#CD7F32',
      };
    },
  });

  const createCardRequest = useMutation({
    mutationFn: async (params: {
      customer_id: string;
      customer_phone: string;
    }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('virtual_card_requests')
        .insert({
          company_id: company.id,
          customer_id: params.customer_id,
          customer_phone: params.customer_phone,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-card-requests'] });
    },
  });

  const markAsDelivered = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from('virtual_card_requests')
        .update({ delivery_status: 'delivered', sent_at: new Date().toISOString() })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-card-requests'] });
    },
  });

  const stats = {
    totalRequests: requestsQuery.data?.length || 0,
    deliveredRequests: requestsQuery.data?.filter(r => r.delivery_status === 'delivered').length || 0,
    pendingRequests: requestsQuery.data?.filter(r => r.delivery_status === 'pending').length || 0,
  };

  return {
    requests: requestsQuery.data || [],
    isLoading: requestsQuery.isLoading,
    stats,
    getCustomerCardData,
    createCardRequest,
    markAsDelivered,
  };
}
