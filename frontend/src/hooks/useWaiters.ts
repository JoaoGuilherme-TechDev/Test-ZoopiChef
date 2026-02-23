import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface Waiter {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  active: boolean;
  pin: string | null;
  pin_hash: string | null;
  last_login_at: string | null;
  failed_login_attempts: number | null;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWaiterInput {
  name: string;
  phone?: string;
  pin: string;
  active?: boolean;
}

export interface UpdateWaiterInput {
  id: string;
  name?: string;
  phone?: string;
  active?: boolean;
}

// Simple PIN hash function (matches the edge function)
function hashPin(pin: string): string {
  return btoa(pin + 'garcom_salt_v1');
}

export function useWaiters() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: waiters = [], isLoading, refetch } = useQuery({
    queryKey: ['waiters', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('waiters')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      
      if (error) throw error;
      return data as Waiter[];
    },
    enabled: !!company?.id,
  });

  const createWaiter = useMutation({
    mutationFn: async (input: CreateWaiterInput) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      // Validate PIN
      if (!input.pin || input.pin.length < 4 || input.pin.length > 6) {
        throw new Error('PIN deve ter entre 4 e 6 dígitos');
      }
      
      if (!/^\d+$/.test(input.pin)) {
        throw new Error('PIN deve conter apenas números');
      }
      
      // Check for duplicate PIN
      const { data: existingWaiters } = await supabase
        .from('waiters')
        .select('id, name, pin, pin_hash')
        .eq('company_id', company.id)
        .eq('active', true);
      
      const pinHash = hashPin(input.pin);
      const duplicatePin = existingWaiters?.find(
        w => w.pin === input.pin || w.pin_hash === pinHash
      );
      
      if (duplicatePin) {
        throw new Error(`Este PIN já está em uso por ${duplicatePin.name}`);
      }
      
      const { data, error } = await supabase
        .from('waiters')
        .insert({
          company_id: company.id,
          name: input.name.trim(),
          phone: input.phone?.trim() || null,
          pin: input.pin,
          pin_hash: pinHash,
          active: input.active ?? true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiters'] });
      toast.success('Garçom criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateWaiter = useMutation({
    mutationFn: async (input: UpdateWaiterInput) => {
      const { id, ...updates } = input;
      
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.name !== undefined) updateData.name = updates.name.trim();
      if (updates.phone !== undefined) updateData.phone = updates.phone?.trim() || null;
      if (updates.active !== undefined) updateData.active = updates.active;
      
      const { error } = await supabase
        .from('waiters')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiters'] });
      toast.success('Garçom atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const changePin = useMutation({
    mutationFn: async ({ id, newPin }: { id: string; newPin: string }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      // Validate PIN
      if (!newPin || newPin.length < 4 || newPin.length > 6) {
        throw new Error('PIN deve ter entre 4 e 6 dígitos');
      }
      
      if (!/^\d+$/.test(newPin)) {
        throw new Error('PIN deve conter apenas números');
      }
      
      // Check for duplicate PIN (excluding current waiter)
      const { data: existingWaiters } = await supabase
        .from('waiters')
        .select('id, name, pin, pin_hash')
        .eq('company_id', company.id)
        .eq('active', true)
        .neq('id', id);
      
      const pinHash = hashPin(newPin);
      const duplicatePin = existingWaiters?.find(
        w => w.pin === newPin || w.pin_hash === pinHash
      );
      
      if (duplicatePin) {
        throw new Error(`Este PIN já está em uso por ${duplicatePin.name}`);
      }
      
      const { error } = await supabase
        .from('waiters')
        .update({
          pin: newPin,
          pin_hash: pinHash,
          failed_login_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiters'] });
      toast.success('PIN alterado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('waiters')
        .update({ 
          active, 
          updated_at: new Date().toISOString(),
          // If deactivating, clear any lock
          ...(active === false ? { locked_until: null, failed_login_attempts: 0 } : {})
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['waiters'] });
      toast.success(variables.active ? 'Garçom ativado' : 'Garçom desativado');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  const deleteWaiter = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by deactivating
      const { error } = await supabase
        .from('waiters')
        .update({ 
          active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiters'] });
      toast.success('Garçom removido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });

  const unlockWaiter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('waiters')
        .update({ 
          failed_login_attempts: 0, 
          locked_until: null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiters'] });
      toast.success('Bloqueio removido');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  return {
    waiters,
    isLoading,
    refetch,
    createWaiter,
    updateWaiter,
    changePin,
    toggleActive,
    deleteWaiter,
    unlockWaiter,
  };
}
