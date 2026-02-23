/**
 * Hook for Fiscal Provider Configuration
 * Manages fiscal_config table for Integra Notas and other providers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import type { FiscalProviderConfig, FiscalProviderType, FiscalEnvironment } from '@/lib/fiscal/types';

export interface FiscalConfigFormData {
  provider: FiscalProviderType;
  environment: FiscalEnvironment;
  is_enabled: boolean;
  api_token: string;
  api_secret: string;
}

export function useFiscalConfig() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['fiscal-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('fiscal_config')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      // Cast to access new columns
      const configData = data as Record<string, unknown>;

      return {
        id: data.id,
        company_id: data.company_id,
        provider: (data.provider || 'integra_notas') as FiscalProviderType,
        environment: (data.environment || 'sandbox') as FiscalEnvironment,
        is_enabled: (configData.is_enabled as boolean) ?? false,
        api_token: data.api_token ?? '',
        api_secret: (configData.api_secret as string) ?? '',
        webhook_secret: (configData.webhook_secret as string) ?? '',
        settings: (configData.provider_settings ?? {}) as Record<string, unknown>,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as FiscalProviderConfig;
    },
    enabled: !!company?.id,
  });
}

export function useUpdateFiscalConfig() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FiscalConfigFormData) => {
      if (!company?.id) throw new Error('Company not found');

      const updateData = {
        company_id: company.id,
        provider: formData.provider,
        environment: formData.environment,
        is_enabled: formData.is_enabled,
        api_token: formData.api_token || null,
        api_secret: formData.api_secret || null,
      };

      // Check if config exists
      const { data: existing } = await supabase
        .from('fiscal_config')
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('fiscal_config')
          .update(updateData as any)
          .eq('company_id', company.id);

        if (error) throw error;
      } else {
        // Create new config with webhook secret
        const insertData = {
          ...updateData,
          webhook_secret: crypto.randomUUID(),
        };

        const { error } = await supabase
          .from('fiscal_config')
          .insert(insertData as any);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-config'] });
      toast.success('Configuração fiscal salva com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao salvar configuração fiscal');
    },
  });
}

export function useTestFiscalConnection() {
  return useMutation({
    mutationFn: async () => {
      // TODO: Implement actual API test when provider is connected
      // For now, simulate a test
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Return mock result
      return {
        success: true,
        message: 'Conexão preparada. A integração será ativada quando a API for configurada.',
      };
    },
  });
}
