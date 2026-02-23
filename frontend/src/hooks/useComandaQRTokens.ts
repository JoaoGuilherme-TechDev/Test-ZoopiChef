import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from './useCompany';

export interface ComandaQRToken {
  id: string;
  company_id: string;
  comanda_number: number;
  token: string;
  created_at: string;
  updated_at: string;
}

const mapQRTokenToFrontend = (data: any): ComandaQRToken => ({
  id: data.id,
  company_id: data.companyId,
  comanda_number: data.comandaNumber,
  token: data.token,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

const mapCompanyToFrontend = (data: any) => {
  if (!data) return null;
  // Map camelCase to snake_case for compatibility with existing components
  return {
    ...data,
    logo_url: data.logoUrl,
    primary_color: data.primaryColor,
    secondary_color: data.secondaryColor,
    background_color: data.backgroundColor,
    public_menu_layout: data.publicMenuLayout,
    welcome_message: data.welcomeMessage,
    opening_hours: data.openingHours,
    store_profile: data.storeProfile,
    is_active: data.isActive,
    print_footer_site: data.printFooterSite,
    print_footer_phone: data.printFooterPhone,
  };
};

const mapSettingsToFrontend = (data: any) => {
  if (!data) return {};
  return {
    company_id: data.companyId,
    no_activity_minutes: data.noActivityMinutes,
    default_service_fee_percent: data.defaultServiceFeePercent,
    allow_close_with_balance: data.allowCloseWithBalance,
    created_at: data.createdAt,
    updated_at: data.updatedAt,
  };
};

const mapModuleSettingsToFrontend = (data: any) => {
  if (!data) return {};
  return {
    company_id: data.companyId,
    idle_warning_minutes: data.idleWarningMinutes,
    enable_qr_ordering: data.enableQrOrdering,
    enable_qr_menu_only: data.enableQrMenuOnly,
    enable_comanda_qr_menu_only: data.enableComandaQrMenuOnly,
    created_at: data.createdAt,
    updated_at: data.updatedAt,
  };
};

export function useComandaQRTokens() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: tokens, isLoading, error } = useQuery({
    queryKey: ['comanda-qr-tokens', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const response = await api.get('/comanda-qr-tokens');
      return (response.data || []).map(mapQRTokenToFrontend);
    },
    enabled: !!company?.id,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const generateToken = useMutation({
    mutationFn: async (comandaNumber: number) => {
      if (!company?.id) throw new Error('No company');
      
      const response = await api.post('/comanda-qr-tokens', { comandaNumber });
      return mapQRTokenToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comanda-qr-tokens'] });
    },
  });

  const generateBatchTokens = useMutation({
    mutationFn: async ({ startNumber, endNumber }: { startNumber: number; endNumber: number }) => {
      if (!company?.id) throw new Error('No company');
      
      const response = await api.post('/comanda-qr-tokens/batch', { startNumber, endNumber });
      return (response.data || []).map(mapQRTokenToFrontend);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comanda-qr-tokens'] });
    },
  });

  const getTokenForComanda = (comandaNumber: number) => {
    return tokens?.find(t => t.comanda_number === comandaNumber);
  };

  return {
    tokens: tokens || [],
    isLoading,
    error,
    generateToken,
    generateBatchTokens,
    getTokenForComanda,
  };
}

// Hook para buscar info de comanda por token (público)
export function useComandaByQRToken(token: string | null) {
  return useQuery({
    queryKey: ['comanda-qr-public', token],
    queryFn: async () => {
      if (!token) return null;
      
      const response = await api.get(`/comanda-qr-tokens/public/${token}`);
      const data = response.data;
      
      if (!data) return null;

      // Backend returns:
      // {
      //   qrToken: ComandaQRToken (camelCase),
      //   comandaNumber: number,
      //   company: Company (camelCase),
      //   settings: ComandaSettings (camelCase),
      //   moduleSettings: TableModuleSettings (camelCase)
      // }

      return {
        qrToken: mapQRTokenToFrontend(data.qrToken),
        comandaNumber: data.comandaNumber,
        company: mapCompanyToFrontend(data.company),
        settings: mapSettingsToFrontend(data.settings),
        moduleSettings: mapModuleSettingsToFrontend(data.moduleSettings),
      };
    },
    enabled: !!token,
  });
}
