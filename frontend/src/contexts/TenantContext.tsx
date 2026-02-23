import { createContext, useContext, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Loader2, AlertCircle, Building2 } from 'lucide-react';

interface TenantCompany {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  background_color: string | null;
  is_active: boolean;
  is_blocked: boolean | null;
  // Self-service fields
  selfservice_price_per_kg: number | null;
  selfservice_mode: string | null;
  selfservice_product_name: string | null;
}

interface TenantContextType {
  company: TenantCompany | null;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children, tenantSlug }: { children: ReactNode; tenantSlug?: string }) {
  const params = useParams<{ tenantSlug?: string; slug?: string }>();
  // Suporta tanto :tenantSlug quanto :slug para compatibilidade
  const slug = tenantSlug || params.tenantSlug || params.slug;

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['tenant_company', slug],
    queryFn: async () => {
      if (!slug) return null;

      // Use public_companies view for public access without authentication
      const { data, error } = await supabase
        .from('public_companies')
        .select('id, name, slug, logo_url, primary_color, secondary_color, background_color, is_active, is_blocked, selfservice_price_per_kg, selfservice_mode, selfservice_product_name')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data as TenantCompany | null;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Company not found
  if (!company && !isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Empresa não encontrada</h1>
        <p className="text-muted-foreground text-center max-w-md">
          O link que você acessou não corresponde a nenhuma empresa cadastrada.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          Verifique se o endereço está correto.
        </p>
      </div>
    );
  }

  // Company blocked or inactive
  if (company && (company.is_blocked || !company.is_active)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Empresa inativa</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Esta empresa está temporariamente indisponível.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          Entre em contato com o estabelecimento para mais informações.
        </p>
      </div>
    );
  }

  return (
    <TenantContext.Provider value={{ company, isLoading, error: error?.message || null }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
