import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from './useCompany';

export interface TableQRToken {
  id: string;
  company_id: string;
  table_id: string;
  token: string;
  created_at: string;
  updated_at: string;
}

const mapQRTokenToFrontend = (data: any): TableQRToken => ({
  id: data.id,
  company_id: data.companyId,
  table_id: data.tableId,
  token: data.token,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

const mapTableToFrontend = (data: any) => {
  if (!data) return null;
  return {
    id: data.id,
    company_id: data.companyId,
    number: data.number,
    name: data.name,
    active: data.active,
    status: data.status,
    current_order_id: data.currentOrderId,
    capacity: data.capacity,
    created_at: data.createdAt,
    updated_at: data.updatedAt,
  };
};

const mapCompanyToFrontend = (data: any) => {
  if (!data) return null;
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

const mapTableSettingsToFrontend = (data: any) => {
  if (!data) return null;
  return {
    company_id: data.companyId,
    no_consumption_minutes: data.noConsumptionMinutes,
    request_table_number: data.requestTableNumber,
    allow_mobile_delete_printed_items: data.allowMobileDeletePrintedItems,
    request_people_count: data.requestPeopleCount,
    require_customer_identification: data.requireCustomerIdentification,
    cash_register_mode: data.cashRegisterMode,
    show_weather_on_closing: data.showWeatherOnClosing,
    shift_report_email: data.shiftReportEmail,
    location_latitude: data.locationLatitude,
    location_longitude: data.locationLongitude,
    smtp_host: data.smtpHost,
    smtp_port: data.smtpPort,
    smtp_user: data.smtpUser,
    smtp_password: data.smtpPassword,
    smtp_from_email: data.smtpFromEmail,
    smtp_from_name: data.smtpFromName,
    smtp_enabled: data.smtpEnabled,
    geo_security_enabled: data.geoSecurityEnabled,
    geo_security_radius_meters: data.geoSecurityRadiusMeters,
    geo_session_duration_minutes: data.geoSessionDurationMinutes,
    created_at: data.createdAt,
    updated_at: data.updatedAt,
  };
};

export function useTableQRTokens() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: tokens, isLoading, error } = useQuery({
    queryKey: ['table-qr-tokens', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const response = await api.get('/table-qr-tokens');
      return (response.data || []).map(mapQRTokenToFrontend);
    },
    enabled: !!company?.id,
    refetchInterval: 30000,
  });

  const generateToken = useMutation({
    mutationFn: async (tableId: string) => {
      if (!company?.id) throw new Error('No company');
      
      const response = await api.post('/table-qr-tokens', { tableId });
      return mapQRTokenToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-qr-tokens'] });
    },
  });

  const generateBatchTokens = useMutation({
    mutationFn: async (tableIds: string[]) => {
      if (!company?.id) throw new Error('No company');
      
      const response = await api.post('/table-qr-tokens/batch', { tableIds });
      return (response.data || []).map(mapQRTokenToFrontend);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-qr-tokens'] });
    },
  });

  const getTokenForTable = (tableId: string) => {
    return tokens?.find(t => t.table_id === tableId);
  };

  return {
    tokens: tokens || [],
    isLoading,
    error,
    generateToken,
    generateBatchTokens,
    getTokenForTable,
  };
}

// Hook para buscar info de mesa por token (público)
export function useTableByQRToken(token: string | null) {
  return useQuery({
    queryKey: ['table-qr-public', token],
    queryFn: async () => {
      if (!token) return null;
      
      const response = await api.get(`/table-qr-tokens/public/${token}`);
      const data = response.data;
      
      if (!data) return null;

      return {
        qrToken: mapQRTokenToFrontend(data.qrToken),
        table: mapTableToFrontend(data.table),
        company: mapCompanyToFrontend(data.company),
        settings: data.settings ? mapModuleSettingsToFrontend(data.settings) : {
          enable_qr_ordering: true,
          enable_qr_menu_only: false,
        },
        tableSettings: mapTableSettingsToFrontend(data.tableSettings),
        pixSettings: data.pixSettings ? {
          pixEnabled: data.pixSettings.pixEnabled,
          pixKey: data.pixSettings.pixKey,
          pixKeyType: data.pixSettings.pixKeyType,
        } : null,
      };
    },
    enabled: !!token,
  });
}

