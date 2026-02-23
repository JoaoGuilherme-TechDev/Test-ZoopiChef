import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

export type ComandaStatus = 'free' | 'open' | 'no_activity' | 'requested_bill' | 'closed';

export interface Comanda {
  id: string;
  company_id: string;
  command_number: number;
  name: string | null;
  status: ComandaStatus;
  opened_at: string;
  closed_at: string | null;
  last_activity_at: string;
  apply_service_fee: boolean;
  service_fee_percent: number;
  discount_value: number;
  surcharge_value: number;
  total_amount: number;
  paid_amount: number;
  created_by: string | null;
  closed_by: string | null;
  table_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComandaSettings {
  company_id: string;
  no_activity_minutes: number;
  default_service_fee_percent: number;
  allow_close_with_balance: boolean;
}

const mapComandaToFrontend = (data: any): Comanda => ({
  id: data.id,
  company_id: data.companyId,
  command_number: data.commandNumber,
  name: data.name,
  status: data.status,
  opened_at: data.openedAt,
  closed_at: data.closedAt,
  last_activity_at: data.lastActivityAt,
  apply_service_fee: data.applyServiceFee,
  service_fee_percent: Number(data.serviceFeePercent),
  discount_value: Number(data.discountValue),
  surcharge_value: Number(data.surchargeValue),
  total_amount: Number(data.totalAmount),
  paid_amount: Number(data.paidAmount),
  created_by: data.createdBy,
  closed_by: data.closedBy,
  table_number: data.tableNumber,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

const mapSettingsToFrontend = (data: any): ComandaSettings => ({
  company_id: data.companyId,
  no_activity_minutes: data.noActivityMinutes,
  default_service_fee_percent: Number(data.defaultServiceFeePercent),
  allow_close_with_balance: data.allowCloseWithBalance,
});

export function useComandas(statusFilter?: ComandaStatus[]) {
  const { company } = useCompanyContext();
  const companyId = company?.id;
  const queryClient = useQueryClient();

  const { data: comandas = [], isLoading, error, refetch } = useQuery({
    queryKey: ['comandas', companyId, statusFilter],
    queryFn: async () => {
      if (!companyId) return [];

      const response = await api.get('/comandas', {
        params: { 
          status: statusFilter 
        }
      });
      
      return (response.data || []).map(mapComandaToFrontend);
    },
    enabled: !!companyId,
    refetchInterval: 5000, // Polling instead of realtime
  });

  // Safety net commented out for migration. 
  // TODO: Backend should handle total recalculation via triggers or service methods.
  /*
  useEffect(() => {
    // ... logic to fix totals
  }, [companyId, comandas]);
  */

  return { comandas, isLoading, error, refetch };
}

export function useComanda(comandaId: string | null) {
  const { company } = useCompanyContext();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['comanda', comandaId],
    queryFn: async () => {
      if (!comandaId) return null;

      const response = await api.get(`/comandas/${comandaId}`);
      return mapComandaToFrontend(response.data);
    },
    enabled: !!comandaId && !!companyId,
  });
}

export function useComandaSettings() {
  const { company } = useCompanyContext();
  const companyId = company?.id;
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['comanda-settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const response = await api.get('/comanda-settings');
      return mapSettingsToFrontend(response.data);
    },
    enabled: !!companyId,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<ComandaSettings>) => {
      if (!companyId) throw new Error('Company not found');

      // Map snake_case to camelCase for backend
      const payload: any = {};
      if (updates.no_activity_minutes !== undefined) payload.noActivityMinutes = updates.no_activity_minutes;
      if (updates.default_service_fee_percent !== undefined) payload.defaultServiceFeePercent = updates.default_service_fee_percent;
      if (updates.allow_close_with_balance !== undefined) payload.allowCloseWithBalance = updates.allow_close_with_balance;

      const response = await api.post('/comanda-settings', payload);
      return mapSettingsToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comanda-settings', companyId] });
      toast.success('Configurações salvas!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar configurações: ' + error.message);
    },
  });

  return { settings, isLoading, updateSettings };
}

export function useComandaMutations() {
  const { company } = useCompanyContext();
  const companyId = company?.id;
  const queryClient = useQueryClient();

  const createComanda = useMutation({
    mutationFn: async ({ 
      name, 
      applyServiceFee, 
      serviceFeePercent 
    }: { 
      name?: string; 
      applyServiceFee?: boolean; 
      serviceFeePercent?: number;
    }) => {
      if (!companyId) throw new Error('Company not found');

      const response = await api.post('/comandas', {
        name,
        applyServiceFee,
        serviceFeePercent
      });

      return mapComandaToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas', companyId] });
      toast.success('Comanda criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar comanda: ' + error.message);
    },
  });

  const updateComanda = useMutation({
    mutationFn: async ({ comandaId, updates }: { comandaId: string; updates: Partial<Comanda> }) => {
      // Map snake_case to camelCase
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.table_number !== undefined) payload.tableNumber = updates.table_number;
      if (updates.apply_service_fee !== undefined) payload.applyServiceFee = updates.apply_service_fee;
      if (updates.service_fee_percent !== undefined) payload.serviceFeePercent = updates.service_fee_percent;
      if (updates.discount_value !== undefined) payload.discountValue = updates.discount_value;
      if (updates.surcharge_value !== undefined) payload.surchargeValue = updates.surcharge_value;

      const response = await api.patch(`/comandas/${comandaId}`, payload);
      return mapComandaToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas', companyId] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar comanda: ' + error.message);
    },
  });

  const requestBill = useMutation({
    mutationFn: async (comandaId: string) => {
      const response = await api.post(`/comandas/${comandaId}/request-bill`);
      return mapComandaToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas', companyId] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao solicitar conta: ' + error.message);
    },
  });

  const reopenComanda = useMutation({
    mutationFn: async (comandaId: string) => {
      const response = await api.post(`/comandas/${comandaId}/reopen`);
      return mapComandaToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas', companyId] });
      toast.success('Comanda reaberta!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao reabrir comanda: ' + error.message);
    },
  });

  const closeComanda = useMutation({
    mutationFn: async ({ comandaId, tableNumber }: { comandaId: string; tableNumber?: string }) => {
      const response = await api.post(`/comandas/${comandaId}/close`, { tableNumber });
      return mapComandaToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas', companyId] });
      toast.success('Comanda fechada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao fechar comanda: ' + error.message);
    },
  });

  const mergeComandas = useMutation({
    mutationFn: async ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
      const response = await api.post('/comandas/merge', { sourceId, targetId });
      return response.data.targetId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas', companyId] });
      queryClient.invalidateQueries({ queryKey: ['comanda-items'] });
      toast.success('Comandas unificadas!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao unificar comandas: ' + error.message);
    },
  });

  const releaseComanda = useMutation({
    mutationFn: async (comandaId: string) => {
      const response = await api.post(`/comandas/${comandaId}/release`);
      return mapComandaToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas', companyId] });
      toast.success('Comanda liberada!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao liberar comanda: ' + error.message);
    },
  });

  return {
    createComanda,
    updateComanda,
    requestBill,
    reopenComanda,
    closeComanda,
    mergeComandas,
    releaseComanda,
  };
}
