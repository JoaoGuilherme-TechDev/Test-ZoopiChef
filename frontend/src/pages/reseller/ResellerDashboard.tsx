import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Palette, Globe, Loader2, Plus } from 'lucide-react';
import { useMyReseller } from '@/hooks/useResellers';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { CreateCompanyDialog } from '@/components/reseller/CreateCompanyDialog';
import { CompanySubscriptionCard } from '@/components/reseller/CompanySubscriptionCard';

export default function ResellerDashboard() {
  const { isRevendedor, isLoading: rolesLoading } = useUserRoles();
  const { reseller, isLoading: resellerLoading } = useMyReseller();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Get companies created by this reseller
  const { data: companies = [], refetch: refetchCompanies } = useQuery({
    queryKey: ['reseller-companies', reseller?.id],
    queryFn: async () => {
      if (!reseller) return [];

      const { data, error } = await supabase
        .from('companies')
        .select('id, name, slug, is_active, created_at, trial_ends_at')
        .eq('reseller_id', reseller.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!reseller?.id,
  });

  if (rolesLoading || resellerLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isRevendedor) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Painel do Revendedor
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo, {reseller?.name}. Gerencie seus clientes e personalização.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Empresas Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companies.filter(c => c.is_active).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {companies.length} empresas
              </p>
            </CardContent>
          </Card>

          <Link to="/reseller/branding">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Personalização
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Configure logotipo, cores e nome do seu sistema white-label.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Seu Domínio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-mono truncate">
                {reseller?.subdomain ? `${reseller.subdomain}.sistema.com` : 'Não configurado'}
              </div>
              <p className="text-xs text-muted-foreground">
                Domínio base para seus clientes
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Suas Empresas</h2>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Empresa
            </Button>
          </div>

          {companies.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Você ainda não cadastrou nenhuma empresa.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company) => (
                <CompanySubscriptionCard 
                  key={company.id} 
                  company={company}
                  onManage={() => {
                    // TODO: Open management dialog/page
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateCompanyDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </DashboardLayout>
  );
}
