import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface SmartPOSDevice {
  id: string;
  company_id: string;
  device_serial: string;
  device_model: string | null;
  provider: string;
  device_name: string | null;
  mode: string;
  is_active: boolean;
  last_seen_at: string | null;
  auth_token: string | null;
  config_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  linked_tef_device_id: string | null;
  linked_tef_device?: SmartPOSDevice | null;
}

export interface SmartPOSPendingTransaction {
  id: string;
  company_id: string;
  device_id: string | null;
  order_id: string | null;
  table_session_id: string | null;
  comanda_id: string | null;
  amount_cents: number;
  payment_method: string;
  installments: number;
  status: string;
  external_transaction_id: string | null;
  authorization_code: string | null;
  card_brand: string | null;
  card_last_digits: string | null;
  nsu: string | null;
  error_message: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  processed_at: string | null;
  updated_at: string;
  cash_session_id: string | null;
  source_device_id: string | null;
  source_device?: SmartPOSDevice | null;
  target_device?: SmartPOSDevice | null;
}

// Hook para listar dispositivos
export function useSmartPOSDevices() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['smartpos-devices', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('smartpos_devices')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Buscar nomes das TEFs vinculadas
      const devicesWithTef = await Promise.all(
        (data || []).map(async (device) => {
          if (device.linked_tef_device_id) {
            const { data: tefDevice } = await supabase
              .from('smartpos_devices')
              .select('id, device_name, device_serial')
              .eq('id', device.linked_tef_device_id)
              .single();
            return { ...device, linked_tef_device: tefDevice } as SmartPOSDevice;
          }
          return device as SmartPOSDevice;
        })
      );
      
      return devicesWithTef;
    },
    enabled: !!company?.id,
  });
}

// Hook para listar apenas dispositivos TEF (para vincular a outros dispositivos)
export function useSmartPOSTEFDevices() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['smartpos-tef-devices', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('smartpos_devices')
        .select('*')
        .eq('company_id', company.id)
        .eq('mode', 'tef')
        .eq('is_active', true)
        .order('device_name', { ascending: true });

      if (error) throw error;
      return data as SmartPOSDevice[];
    },
    enabled: !!company?.id,
  });
}

// Hook para criar/atualizar dispositivo
export function useCreateSmartPOSDevice() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (device: Partial<SmartPOSDevice>) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const insertData = {
        device_serial: device.device_serial || '',
        device_model: device.device_model,
        provider: device.provider || 'pagseguro',
        device_name: device.device_name,
        mode: device.mode || 'pdv',
        is_active: device.is_active ?? true,
        auth_token: device.auth_token,
        config_json: (device.config_json || {}) as Json,
        company_id: company.id,
        linked_tef_device_id: device.linked_tef_device_id || null,
      };

      const { data, error } = await supabase
        .from('smartpos_devices')
        .upsert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartpos-devices'] });
      toast.success('Dispositivo salvo com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao salvar dispositivo: ' + error.message);
    },
  });
}

// Hook para atualizar dispositivo
export function useUpdateSmartPOSDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SmartPOSDevice> & { id: string }) => {
      // Remover campos virtuais que não existem na tabela
      const { linked_tef_device, ...cleanUpdates } = updates as Partial<SmartPOSDevice>;
      const updateData: Record<string, unknown> = { ...cleanUpdates };
      
      // Cast config_json if present
      if ('config_json' in updateData) {
        updateData.config_json = (updateData.config_json || {}) as Json;
      }

      const { data, error } = await supabase
        .from('smartpos_devices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartpos-devices'] });
      toast.success('Dispositivo atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar dispositivo: ' + error.message);
    },
  });
}

// Hook para deletar dispositivo
export function useDeleteSmartPOSDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase
        .from('smartpos_devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartpos-devices'] });
      toast.success('Dispositivo removido');
    },
    onError: (error) => {
      toast.error('Erro ao remover dispositivo: ' + error.message);
    },
  });
}

// Hook para enviar transação para o Smart POS
export function useSendToSmartPOS() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async ({
      deviceId,
      amountCents,
      paymentMethod,
      installments = 1,
      orderId,
      tableSessionId,
      comandaId,
      metadata = {},
    }: {
      deviceId: string;
      amountCents: number;
      paymentMethod: 'credit' | 'debit' | 'pix' | 'voucher';
      installments?: number;
      orderId?: string;
      tableSessionId?: string;
      comandaId?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const insertData = {
        company_id: company.id,
        device_id: deviceId,
        order_id: orderId,
        table_session_id: tableSessionId,
        comanda_id: comandaId,
        amount_cents: amountCents,
        payment_method: paymentMethod,
        installments,
        status: 'pending',
        metadata_json: (metadata || {}) as Json,
      };

      const { data, error } = await supabase
        .from('smartpos_pending_transactions')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartpos-pending-transactions'] });
      toast.success('Transação enviada para a maquininha');
    },
    onError: (error) => {
      toast.error('Erro ao enviar transação: ' + error.message);
    },
  });
}

// Hook para listar transações pendentes
export function useSmartPOSPendingTransactions(deviceId?: string) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['smartpos-pending-transactions', company?.id, deviceId],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('smartpos_pending_transactions')
        .select('*')
        .eq('company_id', company.id)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (deviceId) {
        query = query.eq('device_id', deviceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SmartPOSPendingTransaction[];
    },
    enabled: !!company?.id,
    staleTime: 1000 * 15, // 15 segundos
    refetchInterval: 1000 * 30, // OTIMIZAÇÃO: 30 segundos (era 5s)
    refetchOnWindowFocus: false,
  });
}

// Hook para cancelar transação pendente
export function useCancelSmartPOSTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('smartpos_pending_transactions')
        .update({ status: 'cancelled' })
        .eq('id', transactionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartpos-pending-transactions'] });
      toast.success('Transação cancelada');
    },
    onError: (error) => {
      toast.error('Erro ao cancelar: ' + error.message);
    },
  });
}

// Hook para escutar atualizações em tempo real
export function useSmartPOSRealtimeUpdates(onTransactionUpdate: (transaction: SmartPOSPendingTransaction) => void) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const setupSubscription = useCallback(() => {
    if (!company?.id) return null;

    const channel = supabase
      .channel('smartpos-transactions')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'smartpos_pending_transactions',
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          const transaction = payload.new as SmartPOSPendingTransaction;
          onTransactionUpdate(transaction);
          queryClient.invalidateQueries({ queryKey: ['smartpos-pending-transactions'] });

          // Notificar usuário sobre status da transação
          if (transaction.status === 'approved') {
            toast.success(`Pagamento aprovado - ${transaction.card_brand} ****${transaction.card_last_digits}`);
          } else if (transaction.status === 'declined') {
            toast.error(`Pagamento recusado: ${transaction.error_message || 'Tente novamente'}`);
          }
        }
      )
      .subscribe();

    return channel;
  }, [company?.id, onTransactionUpdate, queryClient]);

  return { setupSubscription };
}
