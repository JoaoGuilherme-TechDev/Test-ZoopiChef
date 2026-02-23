/**
 * TenantPDVPWA - Unified PWA entry point for PDV Loja
 * 
 * Route: /:slug/pdv
 * 
 * Flow:
 * 1. Identify restaurant by slug
 * 2. Persist restaurant context
 * 3. Require login (PDV operator must be authenticated)
 * 4. Validate user has PDV permissions
 * 5. Load PDV Loja
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CreditCard } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PWASlugIdentifier } from '@/components/pwa/PWASlugIdentifier';
import { 
  savePWAContext, 
  loadPWAContext, 
  buildPWAUrl,
  PWAContext 
} from '@/lib/pwa/unifiedPersistence';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';

// Lazy load the actual PDV Loja
import PDVLoja from '@/pages/PDVLoja';

interface RestaurantContext {
  companyId: string;
  companySlug: string;
  companyName: string;
  logoUrl?: string;
}

export default function TenantPDVPWA() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<RestaurantContext | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Verify user belongs to this restaurant and has PDV role
        if (restaurant) {
          // Get profile for company_id
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', session.user.id)
            .single();
          
          // Get role from user_roles
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
          
          const userRole = roleData?.role || '';
          
          if (profile?.company_id === restaurant.companyId && 
              ['pdv', 'caixa', 'admin', 'gerente'].includes(userRole)) {
            setIsAuthenticated(true);
          } else {
            // Wrong company or role
            await supabase.auth.signOut();
            setIsAuthenticated(false);
          }
        }
      }
      setIsCheckingAuth(false);
    };
    
    if (restaurant) {
      checkAuth();
    }
  }, [restaurant]);

  const handleRestaurantIdentified = useCallback((context: RestaurantContext) => {
    setRestaurant(context);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword || !restaurant) return;
    
    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      
      if (error) throw error;
      
      // Verify user belongs to this restaurant
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', data.user.id)
        .single();
      
      // Get role from user_roles
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();
      
      const userRole = roleData?.role || '';
      
      if (profile?.company_id !== restaurant.companyId) {
        await supabase.auth.signOut();
        toast.error('Você não tem acesso a este restaurante');
        return;
      }
      
      if (!['pdv', 'caixa', 'admin', 'gerente'].includes(userRole)) {
        await supabase.auth.signOut();
        toast.error('Você não tem permissão para acessar o PDV');
        return;
      }

      // Save context with user info
      const contextToSave: PWAContext = {
        restaurantSlug: restaurant.companySlug,
        restaurantId: restaurant.companyId,
        restaurantName: restaurant.companyName,
        function: 'pdv',
        userId: data.user.id,
        lastAccessedAt: new Date().toISOString(),
      };
      savePWAContext(contextToSave);
      
      setIsAuthenticated(true);
      toast.success('Login realizado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fazer login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // If no slug in URL, show identifier
  if (!slug) {
    return (
      <PWASlugIdentifier
        appType="pdv"
        onIdentified={handleRestaurantIdentified}
      />
    );
  }

  // If slug in URL but not identified yet
  if (!restaurant) {
    return (
      <PWASlugIdentifier
        appType="pdv"
        urlSlug={slug}
        onIdentified={handleRestaurantIdentified}
      />
    );
  }

  // Checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-xl text-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center space-y-4">
            {restaurant.logoUrl && (
              <img 
                src={restaurant.logoUrl} 
                alt={restaurant.companyName}
                className="h-16 w-auto mx-auto object-contain"
              />
            )}
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{restaurant.companyName}</CardTitle>
              <CardDescription className="text-base mt-2">
                PDV Loja - Faça login para continuar
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="h-12"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="h-12"
                  autoComplete="current-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated - render PDV Loja
  return <PDVLoja />;
}
