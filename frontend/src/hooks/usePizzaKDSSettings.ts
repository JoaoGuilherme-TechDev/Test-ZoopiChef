import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export type PizzaKDSStep = 'dough_border' | 'toppings' | 'oven' | 'finish';

export interface PizzaKDSSettings {
  company_id: string;
  is_enabled: boolean;
  step_dough_border_enabled: boolean;
  step_toppings_enabled: boolean;
  step_oven_enabled: boolean;
  step_finish_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PizzaKDSOperator {
  id: string;
  company_id: string;
  name: string;
  pin_hash: string;
  assigned_step: PizzaKDSStep;
  is_active: boolean;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export const PIZZA_KDS_STEP_LABELS: Record<PizzaKDSStep, string> = {
  dough_border: 'Massa + Borda',
  toppings: 'Coberturas',
  oven: 'Forno',
  finish: 'Finalização',
};

export const PIZZA_KDS_STEP_ORDER: PizzaKDSStep[] = ['dough_border', 'toppings', 'oven', 'finish'];

const DEFAULT_SETTINGS: Omit<PizzaKDSSettings, 'company_id' | 'created_at' | 'updated_at'> = {
  is_enabled: false,
  step_dough_border_enabled: true,
  step_toppings_enabled: true,
  step_oven_enabled: true,
  step_finish_enabled: true,
};

export function usePizzaKDSSettings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['pizza-kds-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('pizza_kds_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      return data as PizzaKDSSettings | null;
    },
    enabled: !!company?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<Omit<PizzaKDSSettings, 'company_id' | 'created_at' | 'updated_at'>>) => {
      if (!company?.id) throw new Error('No company');

      const { data, error } = await supabase
        .from('pizza_kds_settings')
        .upsert({
          company_id: company.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizza-kds-settings'] });
      toast.success('Configurações salvas!');
    },
    onError: () => toast.error('Erro ao salvar configurações'),
  });

  return {
    settings: settings || { ...DEFAULT_SETTINGS, company_id: company?.id || '' } as PizzaKDSSettings,
    isLoading,
    updateSettings,
    DEFAULT_SETTINGS,
  };
}

export function usePizzaKDSOperators() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: operators = [], isLoading } = useQuery({
    queryKey: ['pizza-kds-operators', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('pizza_kds_operators')
        .select('*')
        .eq('company_id', company.id)
        .order('assigned_step', { ascending: true });

      if (error) throw error;
      return data as PizzaKDSOperator[];
    },
    enabled: !!company?.id,
  });

  const createOperator = useMutation({
    mutationFn: async ({ name, pin, assigned_step }: { name: string; pin: string; assigned_step: PizzaKDSStep }) => {
      if (!company?.id) throw new Error('No company');

      // Hash PIN
      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const pinHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const { data: newOp, error } = await supabase
        .from('pizza_kds_operators')
        .insert({
          company_id: company.id,
          name,
          pin_hash: pinHash,
          assigned_step,
        })
        .select()
        .single();

      if (error) throw error;
      return newOp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizza-kds-operators'] });
      toast.success('Operador criado!');
    },
    onError: () => toast.error('Erro ao criar operador'),
  });

  const updateOperator = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PizzaKDSOperator> & { id: string; newPin?: string }) => {
      if (!company?.id) throw new Error('No company');

      const updateData: Record<string, unknown> = { ...updates };

      // If new PIN provided, hash it
      if ('newPin' in updates && updates.newPin) {
        const encoder = new TextEncoder();
        const data = encoder.encode(updates.newPin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        updateData.pin_hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        delete updateData.newPin;
      }

      const { error } = await supabase
        .from('pizza_kds_operators')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizza-kds-operators'] });
      toast.success('Operador atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar operador'),
  });

  const deleteOperator = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pizza_kds_operators')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizza-kds-operators'] });
      toast.success('Operador removido!');
    },
    onError: () => toast.error('Erro ao remover operador'),
  });

  return {
    operators,
    isLoading,
    createOperator,
    updateOperator,
    deleteOperator,
  };
}
