/**
 * UniversalAccessPage - Universal QR Code Entry Point
 * 
 * Route: /access/:slug
 * 
 * This page is the SINGLE entry point for all QR code scans.
 * It validates the restaurant and allows the user to choose which PWA to access.
 * 
 * Flow:
 * 1. Validate restaurant slug exists and is active
 * 2. Store slug in localStorage for future use
 * 3. Show menu of available PWA apps
 * 4. Redirect to chosen app with slug context
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  AlertTriangle, 
  Monitor, 
  Tablet, 
  User, 
  CreditCard, 
  Settings, 
  Truck,
  Store,
  ChefHat
} from 'lucide-react';
import { 
  savePWAContext, 
  PWAFunction, 
  PWAContext 
} from '@/lib/pwa/unifiedPersistence';

interface PWAOption {
  function: PWAFunction;
  label: string;
  description: string;
  icon: typeof Monitor;
  color: string;
  bgColor: string;
  requiresAuth: boolean;
}

const PWA_OPTIONS: PWAOption[] = [
  {
    function: 'totem',
    label: 'Totem Autoatendimento',
    description: 'Faça seu pedido diretamente',
    icon: Monitor,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    requiresAuth: false,
  },
  {
    function: 'tablet',
    label: 'Tablet de Mesa',
    description: 'Cardápio digital na mesa',
    icon: Tablet,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    requiresAuth: false,
  },
  {
    function: 'garcom',
    label: 'App do Garçom',
    description: 'Acesso para funcionários',
    icon: User,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    requiresAuth: true,
  },
  {
    function: 'entregador',
    label: 'App do Entregador',
    description: 'Gerenciar entregas',
    icon: Truck,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    requiresAuth: true,
  },
  {
    function: 'pdv',
    label: 'PDV Loja',
    description: 'Ponto de venda',
    icon: CreditCard,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    requiresAuth: true,
  },
  {
    function: 'terminal',
    label: 'Terminal do Operador',
    description: 'Gestão operacional',
    icon: Settings,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    requiresAuth: true,
  },
];

// Separate public and staff apps
const PUBLIC_APPS = PWA_OPTIONS.filter(app => !app.requiresAuth);
const STAFF_APPS = PWA_OPTIONS.filter(app => app.requiresAuth);

export default function UniversalAccessPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  // Validate the restaurant
  const { data: company, isLoading, error } = useQuery({
    queryKey: ['universal_access_company', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Código do restaurante não informado');
      
      const { data, error } = await supabase
        .from('public_companies')
        .select('id, name, slug, address, whatsapp')
        .eq('slug', slug.toLowerCase().trim())
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Restaurante não encontrado');
      
      return data;
    },
    enabled: !!slug,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Store the slug in localStorage for future use across all PWAs
  useEffect(() => {
    if (company) {
      localStorage.setItem('universal_access_slug', company.slug);
      localStorage.setItem('universal_access_company_id', company.id);
      localStorage.setItem('universal_access_company_name', company.name);
    }
  }, [company]);

  const handleSelectApp = (pwaFunction: PWAFunction) => {
    if (!company) return;
    
    setIsNavigating(true);
    
    // Save PWA context for the selected app
    const context: PWAContext = {
      restaurantSlug: company.slug,
      restaurantId: company.id,
      restaurantName: company.name,
      function: pwaFunction,
      lastAccessedAt: new Date().toISOString(),
    };
    
    savePWAContext(context);
    
    // Navigate to the app
    const targetUrl = `/${company.slug}/${pwaFunction}`;
    console.log(`[UniversalAccess] Navigating to ${targetUrl}`);
    navigate(targetUrl, { replace: true });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
          <p className="text-xl font-medium">Carregando restaurante...</p>
          <p className="text-muted-foreground">Validando código: {slug}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Restaurante não encontrado</CardTitle>
            <CardDescription className="text-base mt-2">
              O código "{slug}" não corresponde a nenhum restaurante cadastrado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Verifique se o QR Code foi escaneado corretamente ou entre em contato com o estabelecimento.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/')}
            >
              Ir para página inicial
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Navigating state
  if (isNavigating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
          <p className="text-xl font-medium">Abrindo aplicativo...</p>
        </div>
      </div>
    );
  }

  // Success - show app selection
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ChefHat className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">{company.name}</CardTitle>
          <CardDescription className="text-base mt-1">
            Bem-vindo! Escolha como deseja acessar.
          </CardDescription>
          <Badge variant="secondary" className="mt-3 font-mono">
            {company.slug}
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-4">
          {/* Public Apps - Customers */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Para Clientes
            </h3>
            <div className="grid gap-3">
              {PUBLIC_APPS.map((app) => {
                const Icon = app.icon;
                return (
                  <Button
                    key={app.function}
                    variant="outline"
                    className="h-auto p-4 justify-start gap-4 hover:border-primary/50 transition-colors"
                    onClick={() => handleSelectApp(app.function)}
                  >
                    <div className={`w-12 h-12 rounded-xl ${app.bgColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-6 h-6 ${app.color}`} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{app.label}</div>
                      <div className="text-sm text-muted-foreground">{app.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Staff Apps - Requires auth */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              Para Funcionários
              <Badge variant="outline" className="text-xs">Requer login</Badge>
            </h3>
            <div className="grid gap-2">
              {STAFF_APPS.map((app) => {
                const Icon = app.icon;
                return (
                  <Button
                    key={app.function}
                    variant="ghost"
                    className="h-auto p-3 justify-start gap-3 hover:bg-muted/50"
                    onClick={() => handleSelectApp(app.function)}
                  >
                    <div className={`w-10 h-10 rounded-lg ${app.bgColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${app.color}`} />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-sm">{app.label}</div>
                      <div className="text-xs text-muted-foreground">{app.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            Powered by <span className="font-semibold">Zoopi</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
