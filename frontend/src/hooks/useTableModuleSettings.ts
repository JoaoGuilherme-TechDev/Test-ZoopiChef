import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from './useCompany';

export interface TableModuleSettings {
  company_id: string;
  idle_warning_minutes: number;
  enable_qr_ordering: boolean;
  enable_qr_menu_only: boolean;
  enable_comanda_qr_menu_only: boolean;
  created_at: string;
  updated_at: string;
}

const mapSettingsToFrontend = (data: any): TableModuleSettings => ({
  company_id: data.companyId,
  idle_warning_minutes: data.idleWarningMinutes,
  enable_qr_ordering: data.enableQrOrdering,
  enable_qr_menu_only: data.enableQrMenuOnly,
  enable_comanda_qr_menu_only: data.enableComandaQrMenuOnly,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

export function useTableModuleSettings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['table-module-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      try {
        const { data } = await api.get('/table-module-settings');
        return data ? mapSettingsToFrontend(data) : null;
      } catch (err) {
        return null;
      }
    },
    enabled: !!company?.id,
  });

  const upsertSettings = useMutation({
    mutationFn: async (updates: Partial<Omit<TableModuleSettings, 'company_id' | 'created_at' | 'updated_at'>>) => {
      if (!company?.id) throw new Error('No company');
      
      const backendUpdates: any = {};
      if (updates.idle_warning_minutes !== undefined) backendUpdates.idleWarningMinutes = updates.idle_warning_minutes;
      if (updates.enable_qr_ordering !== undefined) backendUpdates.enableQrOrdering = updates.enable_qr_ordering;
      if (updates.enable_qr_menu_only !== undefined) backendUpdates.enableQrMenuOnly = updates.enable_qr_menu_only;
      if (updates.enable_comanda_qr_menu_only !== undefined) backendUpdates.enableComandaQrMenuOnly = updates.enable_comanda_qr_menu_only;

      const { data } = await api.post('/table-module-settings', backendUpdates);
      return mapSettingsToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-module-settings'] });
    },
  });

  return {
    settings: settings || {
      company_id: company?.id || '',
      idle_warning_minutes: 30,
      enable_qr_ordering: true,
      enable_qr_menu_only: false,
      enable_comanda_qr_menu_only: false,
      created_at: '',
      updated_at: '',
    },
    isLoading,
    error,
    upsertSettings,
  };
}
