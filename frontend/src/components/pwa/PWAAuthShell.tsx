/**
 * PWAAuthShell - Unified PWA Access Shell
 * 
 * This component wraps any PWA and handles:
 * 1. Slug entry (manual + QR scanner)
 * 2. PIN authentication (if required)
 * 3. Loading states
 * 4. Error handling
 * 
 * Usage:
 * <PWAAuthShell config={pwaConfig}>
 *   {(context) => <YourAppComponent {...context} />}
 * </PWAAuthShell>
 */

import { ReactNode, useState, useEffect } from 'react';
import { Loader2, AlertCircle, Lock, KeyRound, Download, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { SlugEntryScreen } from '@/components/pwa/SlugEntryScreen';
import { 
  usePWAAccessFlow, 
  PWAConfig, 
  RestaurantData, 
  AuthenticatedUser 
} from '@/hooks/usePWAAccessFlow';

// ============================================
// TYPES
// ============================================

export interface PWAShellContext {
  restaurant: RestaurantData;
  user: AuthenticatedUser | null;
  logout: () => Promise<void>;
  reset: () => void;
}

interface PWAAuthShellProps {
  config: PWAConfig;
  appIcon: ReactNode;
  children: (context: PWAShellContext) => ReactNode;
}

// ============================================
// COMPONENT
// ============================================

export function PWAAuthShell({ config, appIcon, children }: PWAAuthShellProps) {
  const flow = usePWAAccessFlow(config);
  
  const [pin, setPin] = useState('');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('App instalado com sucesso!');
    }
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handlePinSubmit = async () => {
    const success = await flow.authenticate(pin);
    if (success) {
      toast.success(`Bem-vindo, ${flow.user?.name}!`);
      setPin('');
    } else if (flow.error) {
      toast.error(flow.error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length >= 4) {
      handlePinSubmit();
    }
  };

  // ============================================
  // RENDER: SLUG ENTRY
  // ============================================
  
  if (flow.needsSlugEntry) {
    return (
      <SlugEntryScreen
        appName={config.appName}
        appIcon={appIcon}
        accentColor={config.accentColor}
        onSlugValidated={(slug) => {
          flow.validateSlug(slug);
        }}
      />
    );
  }

  // ============================================
  // RENDER: LOADING
  // ============================================
  
  if (flow.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-xl text-foreground">
            {flow.state === 'validating_slug' && 'Validando restaurante...'}
            {flow.state === 'checking_session' && 'Verificando sessão...'}
            {flow.state === 'authenticating' && 'Autenticando...'}
            {flow.state === 'init' && 'Carregando...'}
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: ERROR
  // ============================================
  
  if (flow.state === 'error' && !flow.restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/30">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Erro</h2>
            <p className="text-muted-foreground">{flow.error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={flow.reset}
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================
  // RENDER: PIN ENTRY (for auth-required apps)
  // ============================================
  
  if (flow.needsPinEntry && flow.restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-background flex flex-col">
        {/* Install prompt */}
        {showInstallPrompt && (
          <div className="fixed top-4 left-4 right-4 z-50 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg flex items-center gap-3">
            <Download className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Instalar {config.appName}</p>
              <p className="text-sm opacity-80">Acesso rápido pela tela inicial</p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleInstall}>Instalar</Button>
            <Button size="sm" variant="ghost" className="text-primary-foreground" onClick={() => setShowInstallPrompt(false)}>×</Button>
          </div>
        )}

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.15)]">
            <CardHeader className="text-center space-y-4">
              {flow.restaurant.logo_url ? (
                <img 
                  src={flow.restaurant.logo_url} 
                  alt={flow.restaurant.name} 
                  className="h-16 w-auto mx-auto object-contain" 
                />
              ) : (
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/30">
                  {appIcon}
                </div>
              )}
              <div>
                <CardTitle className="text-2xl">{config.appName}</CardTitle>
                <CardDescription className="text-lg mt-1">{flow.restaurant.name}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {flow.error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{flow.error}</p>
                </div>
              )}

              <div className="text-center pb-2">
                <KeyRound className="w-12 h-12 mx-auto text-primary/60 mb-3" />
                <p className="text-muted-foreground">
                  Digite seu PIN de acesso para entrar
                </p>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={handleKeyDown}
                    className="pl-10 h-14 text-center text-2xl tracking-[0.5em] font-mono"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  PIN de 4-6 dígitos fornecido pela empresa
                </p>
              </div>

              <Button
                onClick={handlePinSubmit}
                disabled={flow.state === 'authenticating' || pin.length < 4}
                className="w-full h-12 text-lg"
              >
                {flow.state === 'authenticating' ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Entrando...</>
                ) : (
                  <>Entrar</>
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={flow.reset}
              >
                Trocar restaurante
              </Button>
            </CardContent>
          </Card>
        </main>

        <footer className="p-4 text-center text-xs text-muted-foreground">
          <p>Zoopi Tecnologia © {new Date().getFullYear()}</p>
        </footer>
      </div>
    );
  }

  // ============================================
  // RENDER: APP (ready state)
  // ============================================
  
  if (flow.isReady && flow.restaurant) {
    const context: PWAShellContext = {
      restaurant: flow.restaurant,
      user: flow.user,
      logout: flow.logout,
      reset: flow.reset,
    };

    return <>{children(context)}</>;
  }

  // Fallback loading
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-background flex items-center justify-center">
      <Loader2 className="w-16 h-16 animate-spin text-primary" />
    </div>
  );
}

// ============================================
// PRE-CONFIGURED SHELLS
// ============================================

export const PWA_CONFIGS: Record<string, PWAConfig> = {
  totem: {
    function: 'totem',
    appName: 'Totem Autoatendimento',
    requiresAuth: false,
    role: 'PUBLIC',
    accentColor: 'orange',
  },
  tablet: {
    function: 'tablet',
    appName: 'Tablet de Mesa',
    requiresAuth: false,
    role: 'PUBLIC',
    accentColor: 'purple',
  },
  garcom: {
    function: 'garcom',
    appName: 'App do Garçom',
    requiresAuth: true,
    role: 'WAITER',
    authEdgeFunction: 'waiter-auth',
    sessionStorageKey: 'garcom_session_token',
    accentColor: 'blue',
  },
  entregador: {
    function: 'entregador',
    appName: 'App do Entregador',
    requiresAuth: true,
    role: 'DELIVERY',
    authEdgeFunction: 'entregador-auth',
    sessionStorageKey: 'entregador_session_token',
    accentColor: 'green',
  },
  pdv: {
    function: 'pdv',
    appName: 'PDV Loja',
    requiresAuth: true,
    role: 'CASHIER',
    authEdgeFunction: 'pdv-auth',
    sessionStorageKey: 'pdv_session_token',
    accentColor: 'emerald',
  },
  terminal: {
    function: 'terminal',
    appName: 'Terminal do Operador',
    requiresAuth: true,
    role: 'OPERATOR',
    authEdgeFunction: 'terminal-auth',
    sessionStorageKey: 'terminal_session_token',
    accentColor: 'indigo',
  },
};
