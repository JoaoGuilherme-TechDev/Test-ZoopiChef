/**
 * TenantGarcom - Tenant-based route for Waiter App access
 * 
 * Route: /:slug/garcom
 * 
 * This component redirects to the waiter app with proper context.
 * The waiter app requires authentication, so we show a login prompt
 * with context about which company they're trying to access.
 */

import { useNavigate } from 'react-router-dom';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserRoundCheck, LogIn, AlertCircle } from 'lucide-react';

function GarcomContent() {
  const { company } = useTenant();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Still loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // If user is logged in, redirect to waiter home
  if (user) {
    // Navigate to the internal waiter route
    window.location.href = '/waiter';
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login prompt
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {company?.logo_url && (
            <img 
              src={company.logo_url} 
              alt={company.name} 
              className="h-16 w-auto mx-auto mb-4 object-contain"
            />
          )}
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserRoundCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">App do Garçom</CardTitle>
          <CardDescription>
            {company ? (
              <>Acesso para funcionários de <strong>{company.name}</strong></>
            ) : (
              'Acesso para funcionários'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <AlertCircle className="inline-block w-4 h-4 mr-1 mb-0.5" />
            Você precisa estar logado para acessar o app do garçom.
          </div>
          
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => navigate('/auth', { state: { from: '/waiter' } })}
          >
            <LogIn className="w-5 h-5 mr-2" />
            Fazer Login
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Após o login, você será redirecionado automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TenantGarcom() {
  return (
    <TenantProvider>
      <GarcomContent />
    </TenantProvider>
  );
}
