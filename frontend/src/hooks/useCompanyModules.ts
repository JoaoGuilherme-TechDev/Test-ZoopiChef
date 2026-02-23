import { useCompany } from './useCompany';
import { useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';

// Definição dos módulos disponíveis
export interface CompanyModules {
  module_tables: boolean;        // Módulo Mesa
  module_comandas: boolean;      // Módulo Comanda
  module_orders: boolean;        // Módulo Pedidos (Kanban)
  module_new_order: boolean;     // Novo Pedido (Ligação/Balcão)
  module_calls: boolean;         // Módulo Chamados
  module_messages: boolean;      // Módulo Mensagens
  module_tv: boolean;            // Telas de TV
  module_marketing: boolean;     // Marketing
  module_ai: boolean;            // Inteligência Artificial
  module_sommelier: boolean;     // Enólogo Virtual
  module_scale: boolean;         // Balança Automática
  module_tracking: boolean;      // Rastreio GPS de Entregadores
  module_tablet: boolean;        // Tablet/Totem Autoatendimento
  module_self_checkout: boolean; // Self Check-out (pagamento de comandas)
  module_expedition: boolean;    // Expedição de Entregadores
  module_performance: boolean;   // Dashboard de Performance Operacional
  module_bill_split: boolean;    // Divisão de Contas e Gorjetas
  module_scheduled_orders: boolean; // Agendamento de Pedidos
  module_weather_menu: boolean;  // Cardápio baseado no Clima
  module_comanda_validator: boolean; // Validador de Comandas
}

// Valores padrão (todos ativos)
const DEFAULT_MODULES: CompanyModules = {
  module_tables: true,
  module_comandas: true,
  module_orders: true,
  module_new_order: true,
  module_calls: true,
  module_messages: true,
  module_tv: true,
  module_marketing: true,
  module_ai: true,
  module_sommelier: false, // Disabled by default - opt-in
  module_scale: false,     // Disabled by default - opt-in
  module_tracking: true,   // Enabled by default - GPS tracking always available
  module_tablet: false,    // Disabled by default - opt-in
  module_self_checkout: false, // Disabled by default - opt-in
  module_expedition: false,    // Disabled by default - opt-in
  module_performance: false,   // Disabled by default - opt-in
  module_bill_split: false,    // Disabled by default - opt-in
  module_scheduled_orders: false, // Disabled by default - opt-in
  module_weather_menu: false,  // Disabled by default - opt-in
  module_comanda_validator: false, // Disabled by default - opt-in
};

export function useCompanyModules() {
  const { data: company, isLoading, refetch } = useCompany();
  const queryClient = useQueryClient();

  const modules = useMemo((): CompanyModules => {
    if (!company) return DEFAULT_MODULES;
    
    const flags = (company as any).feature_flags as Record<string, any> | null;
    if (!flags) return DEFAULT_MODULES;

    return {
      module_tables: flags.module_tables !== false,
      module_comandas: flags.module_comandas !== false,
      module_orders: flags.module_orders !== false,
      module_new_order: flags.module_new_order !== false,
      module_calls: flags.module_calls !== false,
      module_messages: flags.module_messages !== false,
      module_tv: flags.module_tv !== false,
      module_marketing: flags.module_marketing !== false,
      module_ai: flags.module_ai !== false,
      module_sommelier: flags.module_sommelier === true,
      module_scale: flags.module_scale === true,
      module_tracking: flags.module_tracking !== false, // Default enabled - always show GPS
      module_tablet: flags.module_tablet === true,
      module_self_checkout: flags.module_self_checkout === true,
      module_expedition: flags.module_expedition === true,
      module_performance: flags.module_performance === true,
      module_bill_split: flags.module_bill_split === true,
      module_scheduled_orders: flags.module_scheduled_orders === true,
      module_weather_menu: flags.module_weather_menu === true,
      module_comanda_validator: flags.module_comanda_validator === true,
    };
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: async (newModules: Partial<CompanyModules>) => {
      if (!company) throw new Error('No company');

      const currentFlags = ((company as any).feature_flags as Record<string, any>) ?? {};
      
      const { data, error } = await supabase
        .from('companies')
        .update({
          feature_flags: {
            ...currentFlags,
            ...newModules,
          },
        })
        .eq('id', company.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      refetch();
    },
  });

  const updateModules = useCallback(async (newModules: Partial<CompanyModules>) => {
    await updateMutation.mutateAsync(newModules);
  }, [updateMutation]);

  return {
    modules,
    isLoading,
    updateModules,
    isUpdating: updateMutation.isPending,
  };
}

// Hook para uso no SaaS Admin - aceita feature_flags diretamente
export function getModulesFromFlags(featureFlags: Record<string, any> | null): CompanyModules {
  if (!featureFlags) return DEFAULT_MODULES;

  return {
    module_tables: featureFlags.module_tables !== false,
    module_comandas: featureFlags.module_comandas !== false,
    module_orders: featureFlags.module_orders !== false,
    module_new_order: featureFlags.module_new_order !== false,
    module_calls: featureFlags.module_calls !== false,
    module_messages: featureFlags.module_messages !== false,
    module_tv: featureFlags.module_tv !== false,
    module_marketing: featureFlags.module_marketing !== false,
    module_ai: featureFlags.module_ai !== false,
    module_sommelier: featureFlags.module_sommelier === true,
    module_scale: featureFlags.module_scale === true,
    module_tracking: featureFlags.module_tracking !== false, // Default enabled - always show GPS
    module_tablet: featureFlags.module_tablet === true,
    module_self_checkout: featureFlags.module_self_checkout === true,
    module_expedition: featureFlags.module_expedition === true,
    module_performance: featureFlags.module_performance === true,
    module_bill_split: featureFlags.module_bill_split === true,
    module_scheduled_orders: featureFlags.module_scheduled_orders === true,
    module_weather_menu: featureFlags.module_weather_menu === true,
    module_comanda_validator: featureFlags.module_comanda_validator === true,
  };
}
