import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface Deliverer {
  id: string;
  company_id: string;
  name: string;
  whatsapp: string | null;
  active: boolean;
  access_token: string | null;
  pin: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

const mapDelivererToFrontend = (data: any): Deliverer => ({
  id: data.id,
  company_id: data.companyId,
  name: data.name,
  whatsapp: data.whatsapp,
  active: data.active,
  access_token: data.accessToken,
  pin: data.pin,
  last_login_at: data.lastLoginAt,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

const mapDelivererToBackend = (data: Partial<Deliverer>): any => {
  const mapped: any = {};
  if (data.company_id) mapped.companyId = data.company_id;
  if (data.name) mapped.name = data.name;
  if (data.whatsapp) mapped.whatsapp = data.whatsapp;
  if (data.active !== undefined) mapped.active = data.active;
  if (data.pin) mapped.pin = data.pin;
  return mapped;
};

export function useDeliverers() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const { data: deliverers = [], isLoading, error } = useQuery({
    queryKey: ['deliverers', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data } = await api.get(`/deliverers?companyId=${profile.company_id}`);
      return data.map(mapDelivererToFrontend);
    },
    enabled: !!user && !!profile?.company_id,
  });

  const createDeliverer = useMutation({
    mutationFn: async (deliverer: { name: string; whatsapp?: string; company_id: string }) => {
      const payload = mapDelivererToBackend(deliverer);
      const { data } = await api.post('/deliverers', payload);
      return mapDelivererToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverers'] });
      toast.success('Entregador cadastrado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error creating deliverer:', error);
      toast.error(`Erro ao cadastrar entregador: ${error.message}`);
    },
  });

  const updateDeliverer = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; whatsapp?: string | null; active?: boolean; pin?: string | null }) => {
      const payload = mapDelivererToBackend(updates);
      const { data } = await api.put(`/deliverers/${id}`, payload);
      return mapDelivererToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverers'] });
      toast.success('Entregador atualizado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error updating deliverer:', error);
      toast.error(`Erro ao atualizar entregador: ${error.message}`);
    },
  });

  const deleteDeliverer = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/deliverers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverers'] });
      toast.success('Entregador removido com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error deleting deliverer:', error);
      toast.error(`Erro ao excluir entregador: ${error.message}`);
    },
  });

  return {
    deliverers,
    isLoading,
    error,
    createDeliverer,
    updateDeliverer,
    deleteDeliverer,
  };
}
