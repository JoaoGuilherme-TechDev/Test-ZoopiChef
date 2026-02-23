import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyContext, Company } from '@/contexts/CompanyContext';

export type { Company } from '@/contexts/CompanyContext';

const mapCompanyToFrontend = (data: any): Company => ({
  id: data.id,
  name: data.name,
  slug: data.slug,
  address: data.address,
  whatsapp: data.whatsapp,
  phone: data.phone,
  default_printer: data.defaultPrinter,
  order_sound_enabled: data.orderSoundEnabled,
  auto_print_enabled: data.autoPrintEnabled,
  logo_url: data.logoUrl,
  primary_color: data.primaryColor,
  secondary_color: data.secondaryColor,
  background_color: data.backgroundColor,
  public_menu_layout: data.publicMenuLayout,
  welcome_message: data.welcomeMessage,
  opening_hours: data.openingHours,
  store_profile: data.storeProfile,
  is_active: data.isActive,
  is_template: data.isTemplate,
  trial_ends_at: data.trialEndsAt,
  owner_user_id: data.ownerUserId,
  suspended_reason: data.suspendedReason,
  menu_token: data.menuToken,
  totem_token: data.totemToken,
  print_footer_site: data.printFooterSite,
  print_footer_phone: data.printFooterPhone,
  tax_regime: data.taxRegime,
  state_registration: data.stateRegistration,
  municipal_registration: data.municipalRegistration,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

// Hook que usa o contexto (recomendado - suporta SaaS admin mode)
export function useCompany() {
  const context = useCompanyContext();
  
  return {
    data: context.company,
    isLoading: context.isLoading,
    refetch: context.refetch,
  };
}

// Hook legado que sempre busca do profile (para casos específicos)
export function useCompanyFromProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['company-from-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      try {
        const { data } = await api.get('/companies/me');
        if (!data) return null;
        return mapCompanyToFrontend(data);
      } catch (error) {
        console.error('Error fetching company:', error);
        return null;
      }
    },
    enabled: !!user?.id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data } = await api.post('/companies', {
        name,
        slug,
      });

      return mapCompanyToFrontend(data);
    },
    onSuccess: () => {
      // Invalidate with prefix keys used across the app
      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['userRole'] });
    },
    onError: (error: any) => {
      // Bubble up a useful message (Company.tsx will handle UI toast too)
      console.error('Erro ao criar empresa:', error);
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      // Map frontend snake_case updates to backend camelCase if needed
      // But for dynamic updates, we might need a utility or manual mapping
      // For now, let's assume keys match or we map common ones
      const mappedUpdates: any = {};
      Object.keys(updates).forEach(key => {
        // Simple snake_case to camelCase converter could be used here
        // For now, just pass through as we might need to handle specific fields
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        mappedUpdates[camelKey] = updates[key];
      });

      const { data } = await api.patch(`/companies/${id}`, mappedUpdates);
      return mapCompanyToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });
}

export function useCompanyUsers() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['companyUsers', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data } = await api.get(`/companies/${company.id}/users`);
      
      // Map backend users to frontend profile structure expected by UI
      return data.map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        company_id: user.companyId,
        user_roles: [{
          role: user.role,
          user_id: user.id,
          company_id: user.companyId
        }]
      }));
    },
    enabled: !!company?.id,
  });
}
