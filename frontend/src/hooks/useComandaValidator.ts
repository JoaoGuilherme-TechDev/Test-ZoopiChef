import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from './useCompany';

export interface ComandaValidatorToken {
  id: string;
  company_id: string;
  token: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComandaValidationLog {
  id: string;
  company_id: string;
  comanda_id: string | null;
  comanda_number: number;
  validator_token_id: string | null;
  status: string;
  total_amount: number;
  items_count: number;
  validated_at: string;
  device_info: Record<string, unknown>;
}

const mapTokenToFrontend = (data: any): ComandaValidatorToken => ({
  id: data.id,
  company_id: data.companyId,
  token: data.token,
  name: data.name,
  is_active: data.isActive,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

const mapLogToFrontend = (data: any): ComandaValidationLog => ({
  id: data.id,
  company_id: data.companyId,
  comanda_id: data.comandaId,
  comanda_number: data.comandaNumber,
  validator_token_id: data.validatorTokenId,
  status: data.status,
  total_amount: Number(data.totalAmount),
  items_count: data.itemsCount,
  validated_at: data.validatedAt,
  device_info: data.deviceInfo || {},
});

export function useComandaValidatorTokens() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: tokens, isLoading, error } = useQuery({
    queryKey: ['comanda-validator-tokens', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data } = await api.get('/comanda-validator/tokens');
      return (data || []).map(mapTokenToFrontend);
    },
    enabled: !!company?.id,
  });

  const createToken = useMutation({
    mutationFn: async (name: string) => {
      if (!company?.id) throw new Error('No company');
      
      const { data } = await api.post('/comanda-validator/tokens', { name });
      return mapTokenToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comanda-validator-tokens'] });
    },
  });

  const updateToken = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ComandaValidatorToken> }) => {
      // Map frontend updates to backend structure if needed
      const backendUpdates: any = {};
      if (updates.name !== undefined) backendUpdates.name = updates.name;
      if (updates.is_active !== undefined) backendUpdates.isActive = updates.is_active;

      const { data } = await api.patch(`/comanda-validator/tokens/${id}`, backendUpdates);
      return mapTokenToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comanda-validator-tokens'] });
    },
  });

  const deleteToken = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/comanda-validator/tokens/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comanda-validator-tokens'] });
    },
  });

  return {
    tokens: tokens || [],
    isLoading,
    error,
    createToken,
    updateToken,
    deleteToken,
  };
}

export function useComandaValidationLogs() {
  const { data: company } = useCompany();

  const { data: logs, isLoading, error, refetch } = useQuery({
    queryKey: ['comanda-validation-logs', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data } = await api.get('/comanda-validator/logs');
      return (data || []).map(mapLogToFrontend);
    },
    enabled: !!company?.id,
  });

  return {
    logs: logs || [],
    isLoading,
    error,
    refetch,
  };
}
