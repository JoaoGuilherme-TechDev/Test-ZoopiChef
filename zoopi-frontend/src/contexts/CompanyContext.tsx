/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  is_active: boolean;
}

interface CompanyContextType {
  company: Company | null;        // A empresa que está sendo visualizada no momento
  isLoading: boolean;
  isAdminMode: boolean;           // Indica se um Admin está visualizando a loja de um cliente
  switchCompany: (slug: string) => Promise<void>; // Função para Admin trocar de loja
  resetToMyCompany: () => void;   // Volta para a empresa original do Admin
  refetch: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado para controlar se o Admin selecionou uma empresa diferente da dele
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    localStorage.getItem('zoopi_admin_selected_slug')
  );

  const fetchCompany = async () => {
    // Se não há usuário, não há empresa
    if (!user) {
      setCompany(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Lógica de seleção do Slug:
      // 1. Se for Admin e houver um slug selecionado no localStorage, usa ele.
      // 2. Senão, usa o company_slug do próprio usuário logado.
      const isSaaSAdmin = user.global_role === 'ADMIN' || user.global_role === 'SUPER_ADMIN';
      const targetSlug = (isSaaSAdmin && selectedSlug) ? selectedSlug : user.company_slug;

      // Busca os dados da empresa (usando o slug como identificador no seu novo backend)
      const response = await api.get(`/companies/slug/${targetSlug}`);
      setCompany(response.data);
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
      setCompany(null);
      // Se der erro (ex: slug selecionado não existe mais), limpa o override
      localStorage.removeItem('zoopi_admin_selected_slug');
      setSelectedSlug(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, [user, selectedSlug]);

  // Função para o Admin trocar de contexto
  const switchCompany = async (slug: string) => {
    if (user?.global_role === 'ADMIN' || user?.global_role === 'SUPER_ADMIN') {
      localStorage.setItem('zoopi_admin_selected_slug', slug);
      setSelectedSlug(slug);
    }
  };

  // Função para o Admin voltar para a sua própria unidade
  const resetToMyCompany = () => {
    localStorage.removeItem('zoopi_admin_selected_slug');
    setSelectedSlug(null);
  };

  const isAdminMode = !!selectedSlug && selectedSlug !== user?.company_slug;

  return (
    <CompanyContext.Provider value={{ 
      company, 
      isLoading, 
      isAdminMode,
      switchCompany,
      resetToMyCompany,
      refetch: fetchCompany 
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanyContext() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanyContext deve ser usado dentro de um CompanyProvider');
  }
  return context;
}