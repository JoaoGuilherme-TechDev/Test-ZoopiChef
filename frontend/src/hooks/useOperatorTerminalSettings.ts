import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';

export interface ModulePosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OperatorTerminalSettings {
  id: string;
  company_id: string;
  user_id: string;
  enabled_modules: string[];
  module_colors: Record<string, string>;
  module_order: string[];
  module_usage_count: Record<string, number>;
  background_color: string;
  module_sizes: Record<string, 'small' | 'medium' | 'large'>;
  module_positions: Record<string, ModulePosition>;
  layout_name: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_COLORS: Record<string, string> = {
  mesas: 'bg-blue-600',
  comandas: 'bg-purple-600',
  novo_pedido: 'bg-violet-600',
  pedidos: 'bg-emerald-600',
  chamados: 'bg-orange-600',
  mensagens: 'bg-pink-600',
};

export function useOperatorTerminalSettings() {
  const { company } = useCompanyContext();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['operator_terminal_settings', company?.id, user?.id],
    queryFn: async () => {
      if (!company?.id || !user?.id) return null;

      const { data, error } = await supabase
        .from('operator_terminal_settings')
        .select('*')
        .eq('company_id', company.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        return {
          ...data,
          enabled_modules: (data.enabled_modules || []) as string[],
          module_colors: (data.module_colors || DEFAULT_COLORS) as Record<string, string>,
          module_order: (data.module_order || []) as string[],
          module_usage_count: (data.module_usage_count || {}) as Record<string, number>,
          background_color: (data.background_color || 'bg-slate-950') as string,
          module_sizes: (data.module_sizes || {}) as unknown as Record<string, 'small' | 'medium' | 'large'>,
          module_positions: (data.module_positions || {}) as unknown as Record<string, ModulePosition>,
          layout_name: (data.layout_name || 'Padrão') as string,
        } as OperatorTerminalSettings;
      }
      
      return null;
    },
    enabled: !!company?.id && !!user?.id,
  });
}

export function useUpsertOperatorTerminalSettings() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<Omit<OperatorTerminalSettings, 'id' | 'company_id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!company?.id || !user?.id) throw new Error('Company or user not found');

      // Prepare data for Supabase (convert complex types)
      const upsertData: Record<string, unknown> = {
        company_id: company.id,
        user_id: user.id,
      };
      
      if (data.enabled_modules !== undefined) upsertData.enabled_modules = data.enabled_modules;
      if (data.module_colors !== undefined) upsertData.module_colors = data.module_colors;
      if (data.module_order !== undefined) upsertData.module_order = data.module_order;
      if (data.module_usage_count !== undefined) upsertData.module_usage_count = data.module_usage_count;
      if (data.background_color !== undefined) upsertData.background_color = data.background_color;
      if (data.module_sizes !== undefined) upsertData.module_sizes = data.module_sizes;
      if (data.module_positions !== undefined) upsertData.module_positions = data.module_positions;
      if (data.layout_name !== undefined) upsertData.layout_name = data.layout_name;

      const { data: result, error } = await supabase
        .from('operator_terminal_settings')
        .upsert(upsertData as any, { onConflict: 'company_id,user_id' })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator_terminal_settings'] });
    },
  });
}

export function useIncrementModuleUsage() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (moduleId: string) => {
      if (!company?.id || !user?.id) throw new Error('Company or user not found');

      // First get current settings
      const { data: current } = await supabase
        .from('operator_terminal_settings')
        .select('module_usage_count')
        .eq('company_id', company.id)
        .eq('user_id', user.id)
        .maybeSingle();

      const currentCount = (current?.module_usage_count as Record<string, number>) || {};
      const newCount = {
        ...currentCount,
        [moduleId]: (currentCount[moduleId] || 0) + 1,
      };

      const { error } = await supabase
        .from('operator_terminal_settings')
        .upsert(
          { 
            company_id: company.id, 
            user_id: user.id,
            module_usage_count: newCount 
          }, 
          { onConflict: 'company_id,user_id' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator_terminal_settings'] });
    },
  });
}

export const DEFAULT_MODULE_COLORS = DEFAULT_COLORS;
