import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { mapOrderToFrontend } from './useOrders';

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  whatsapp: string;
  phone: string | null;
  alerts: string | null;
  document: string | null;
  email: string | null;
  credit_balance: number;
  credit_limit: number | null;
  allow_credit: boolean | null;
  is_blocked: boolean | null;
  created_at: string;
  updated_at: string;
}

const mapCustomerToFrontend = (data: any): Customer => ({
  id: data.id,
  company_id: data.companyId,
  name: data.name,
  whatsapp: data.whatsapp,
  phone: data.phone,
  alerts: data.alerts,
  document: data.document,
  email: data.email,
  credit_balance: Number(data.creditBalance || 0),
  credit_limit: data.creditLimit ? Number(data.creditLimit) : null,
  allow_credit: data.allowCredit,
  is_blocked: data.isBlocked,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

const mapCustomerToBackend = (data: Partial<Customer>): any => {
  const mapped: any = {};
  if (data.company_id) mapped.companyId = data.company_id;
  if (data.name) mapped.name = data.name;
  if (data.whatsapp) mapped.whatsapp = data.whatsapp;
  if (data.phone) mapped.phone = data.phone;
  if (data.alerts) mapped.alerts = data.alerts;
  if (data.document) mapped.document = data.document;
  if (data.email) mapped.email = data.email;
  if (data.credit_balance !== undefined) mapped.creditBalance = data.credit_balance;
  if (data.credit_limit !== undefined) mapped.creditLimit = data.credit_limit;
  if (data.allow_credit !== undefined) mapped.allowCredit = data.allow_credit;
  if (data.is_blocked !== undefined) mapped.isBlocked = data.is_blocked;
  return mapped;
};

export function useCustomers() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const { data: customers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['customers', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data } = await api.get(`/customers?companyId=${profile.company_id}`);
      return data.map(mapCustomerToFrontend);
    },
    enabled: !!user && !!profile?.company_id,
    refetchInterval: 30000, // Polling every 30s for sync
  });

  const createCustomer = useMutation({
    mutationFn: async (customer: { name: string; whatsapp: string; company_id: string }) => {
      const payload = mapCustomerToBackend(customer);
      const { data } = await api.post('/customers', payload);
      return mapCustomerToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar cliente: ' + error.message);
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; whatsapp?: string; alerts?: string | null }) => {
      const payload = mapCustomerToBackend(updates);
      await api.put(`/customers/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente atualizado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar cliente: ' + error.message);
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente removido!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover cliente: ' + error.message);
    },
  });

  return {
    customers,
    isLoading,
    error,
    refetch,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
}

export function useCustomerOrders(customerId: string | null) {
  return useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data } = await api.get(`/orders?customerId=${customerId}`);
      return data.map(mapOrderToFrontend);
    },
    enabled: !!customerId,
  });
}
