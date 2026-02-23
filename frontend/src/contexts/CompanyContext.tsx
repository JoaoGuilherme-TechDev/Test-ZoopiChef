import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase-shim';

export interface Company {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  whatsapp: string | null;
  phone: string | null;
  default_printer: string | null;
  order_sound_enabled: boolean;
  auto_print_enabled: boolean | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  background_color: string | null;
  public_menu_layout: string | null;
  welcome_message: string | null;
  opening_hours: any;
  store_profile: string;
  is_active: boolean;
  is_template: boolean;
  trial_ends_at: string | null;
  owner_user_id: string | null;
  suspended_reason: string | null;
  menu_token: string;
  totem_token: string | null;
  print_footer_site: string | null;
  print_footer_phone: string | null;
  tax_regime: string | null;
  state_registration: string | null;
  municipal_registration: string | null;
  created_at: string;
  updated_at: string;
}

interface CompanyContextType {
  company: Company | null;
  isLoading: boolean;
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  isSaasAdminMode: boolean;
  refetch: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canAccessAllCompanies, setCanAccessAllCompanies] = useState(false);
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('saas_selected_company_id');
    }
    return null;
  });

  // Refs para controle de fetch
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const lastSelectedCompanyIdRef = useRef<string | null>(null);

  const setSelectedCompanyId = useCallback((id: string | null) => {
    setSelectedCompanyIdState(id);
    if (id) {
      localStorage.setItem('saas_selected_company_id', id);
    } else {
      localStorage.removeItem('saas_selected_company_id');
    }
  }, []);

  const fetchCompany = useCallback(async (forceRefetch = false) => {
    if (!user?.id) {
      if (!authLoading) {
        setCompany(null);
        setIsLoading(false);
      }
      return;
    }

    // Verifica se precisa refetch
    const userChanged = lastUserIdRef.current !== user.id;
    const companyChanged = lastSelectedCompanyIdRef.current !== selectedCompanyId;
    
    // Se nada mudou e não é forceRefetch, skip
    if (!userChanged && !companyChanged && !forceRefetch && company !== null) {
      return;
    }

    // Evita chamadas paralelas
    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;
    lastUserIdRef.current = user.id;
    lastSelectedCompanyIdRef.current = selectedCompanyId;
    setIsLoading(true);

    try {
      // OTIMIZAÇÃO: Fazer todas as verificações em paralelo
      const [saasAdminResult, saasUserResult, profileResult] = await Promise.all([
        supabase
          .from('saas_admins')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('saas_users')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .maybeSingle()
      ]);

      // Verificar também role super_admin e reseller
      const [superAdminRole, resellerData] = await Promise.all([
        supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('role', 'super_admin')
          .maybeSingle(),
        supabase
          .from('resellers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      const isSaasAdmin = !!saasAdminResult.data;
      const isSaasUser = !!saasUserResult.data;
      const isSuperAdmin = !!superAdminRole.data;
      const isReseller = !!resellerData.data;
      const hasSpecialAccess = isSaasAdmin || isSaasUser || isSuperAdmin || isReseller;
      
      setCanAccessAllCompanies(hasSpecialAccess);

      let targetCompanyId: string | null = null;

      // Se tem acesso especial e selecionou uma empresa, usar essa
      if (hasSpecialAccess && selectedCompanyId) {
        targetCompanyId = selectedCompanyId;
      } else {
        // Caso contrário, usar empresa do profile
        targetCompanyId = profileResult.data?.company_id || null;
      }

      if (!targetCompanyId) {
        setCompany(null);
      } else {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', targetCompanyId)
          .maybeSingle();

        if (error) throw error;
        setCompany(data as Company | null);
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      setCompany(null);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.id, authLoading, selectedCompanyId, company]);

  // Efeito para quando selectedCompanyId muda - INVALIDAR TODAS AS QUERIES
  useEffect(() => {
    if (selectedCompanyId !== lastSelectedCompanyIdRef.current) {
      // Invalida TODAS as queries que dependem de company
      queryClient.invalidateQueries();
      
      // Força refetch do contexto
      fetchingRef.current = false;
      fetchCompany(true);
    }
  }, [selectedCompanyId, queryClient, fetchCompany]);

  // Trigger fetch quando user muda
  useEffect(() => {
    if (!authLoading) {
      // Reset refs quando usuário muda
      if (user?.id !== lastUserIdRef.current) {
        lastUserIdRef.current = null;
        lastSelectedCompanyIdRef.current = null;
        fetchingRef.current = false;
      }
      fetchCompany();
    }
  }, [user?.id, authLoading, fetchCompany]);

  // Memoize context value para evitar re-renders
  const contextValue = useMemo(() => ({
    company, 
    isLoading: authLoading || isLoading, 
    selectedCompanyId,
    setSelectedCompanyId,
    isSaasAdminMode: canAccessAllCompanies && !!selectedCompanyId,
    refetch: () => fetchCompany(true)
  }), [company, authLoading, isLoading, selectedCompanyId, setSelectedCompanyId, canAccessAllCompanies, fetchCompany]);

  return (
    <CompanyContext.Provider value={contextValue}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanyContext() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanyContext must be used within a CompanyProvider');
  }
  return context;
}
