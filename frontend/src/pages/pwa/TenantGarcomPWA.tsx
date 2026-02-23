/**
 * TenantGarcomPWA - Unified PWA entry point for Garçom (Waiter)
 * 
 * Route: /:slug/garcom
 * 
 * Authentication Flow:
 * 1. Shows SlugEntryScreen FIRST if no slug in URL
 * 2. After slug is resolved, shows PIN entry screen
 * 3. PIN identifies the waiter (no waiter selection needed)
 * 4. Loads the waiter app after successful PIN validation
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Loader2, AlertCircle, UserRoundCheck, Lock, Download, KeyRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { SlugEntryScreen } from '@/components/pwa/SlugEntryScreen';
import { savePWAContext, PWAContext } from '@/lib/pwa/unifiedPersistence';

const SESSION_KEY = 'garcom_session_token';
const SLUG_KEY = 'garcom_restaurant_slug';

function GarcomContent({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Resolve company by slug
  const { data: companyData, isLoading: companyLoading, error: companyError } = useQuery({
    queryKey: ['garcom_company_pwa', slug],
    queryFn: async () => {
      const { data: company, error: companyErr } = await supabase
        .from('companies')
        .select('id, name, logo_url, slug')
        .eq('slug', slug)
        .maybeSingle();

      if (companyErr || !company) {
        throw new Error('Empresa não encontrada');
      }

      // Check if company has any waiters
      const { count } = await supabase
        .from('waiters')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('active', true);

      return { company, hasWaiters: (count || 0) > 0 };
    },
    enabled: !!slug,
    retry: 2
  });

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

  // Check for existing session
  useEffect(() => {
    const checkExistingSession = async () => {
      const token = localStorage.getItem(SESSION_KEY);
      if (!token) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const { data } = await supabase.functions.invoke('waiter-auth', {
          body: { action: 'validate', session_token: token }
        });

        if (data?.valid) {
          // Store slug for context restoration
          localStorage.setItem(SLUG_KEY, slug);
          navigate(`/${slug}/garcom/app`, { replace: true });
        } else {
          localStorage.removeItem(SESSION_KEY);
          setIsCheckingSession(false);
        }
      } catch (error) {
        console.error('Session validation error:', error);
        localStorage.removeItem(SESSION_KEY);
        setIsCheckingSession(false);
      }
    };

    if (companyData) {
      checkExistingSession();
    }
  }, [navigate, slug, companyData]);

  // Persist context when company loads
  useEffect(() => {
    if (companyData?.company) {
      const contextToSave: PWAContext = {
        restaurantSlug: slug,
        restaurantId: companyData.company.id,
        restaurantName: companyData.company.name,
        function: 'garcom',
        lastAccessedAt: new Date().toISOString(),
      };
      savePWAContext(contextToSave);
      localStorage.setItem(SLUG_KEY, slug);
    }
  }, [companyData, slug]);

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

  const handleLogin = async () => {
    if (!pin || pin.length < 4) {
      toast.error('Digite seu PIN de 4-6 dígitos');
      return;
    }

    setIsLoggingIn(true);

    try {
      const { data, error } = await supabase.functions.invoke('waiter-auth', {
        body: {
          action: 'login_by_pin',
          company_slug: slug,
          pin
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.success && data?.session_token) {
        localStorage.setItem(SESSION_KEY, data.session_token);
        localStorage.setItem(SLUG_KEY, slug);
        toast.success(`Bem-vindo, ${data.waiter.name}!`);
        navigate(`/${slug}/garcom/app`, { replace: true });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length >= 4) {
      handleLogin();
    }
  };

  if (companyLoading || isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-xl text-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!companyData || companyError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/30">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Empresa não encontrada</h2>
            <p className="text-muted-foreground">O link informado é inválido ou a empresa não existe.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                localStorage.removeItem(SLUG_KEY);
                navigate('/pwa/garcom', { replace: true });
              }}
            >
              Tentar outro restaurante
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { company, hasWaiters } = companyData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-background flex flex-col">
      {showInstallPrompt && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg flex items-center gap-3">
          <Download className="w-6 h-6 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Instalar App Garçom</p>
            <p className="text-sm opacity-80">Acesso rápido pela tela inicial</p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleInstall}>Instalar</Button>
          <Button size="sm" variant="ghost" className="text-primary-foreground" onClick={() => setShowInstallPrompt(false)}>×</Button>
        </div>
      )}

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.15)]">
          <CardHeader className="text-center space-y-4">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-16 w-auto mx-auto object-contain" />
            ) : (
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/30">
                <UserRoundCheck className="w-10 h-10 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-2xl">App do Garçom</CardTitle>
              <CardDescription className="text-lg mt-1">{company.name}</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {!hasWaiters ? (
              <div className="text-center py-4">
                <AlertCircle className="w-12 h-12 mx-auto text-warning mb-3" />
                <p className="text-muted-foreground">Nenhum garçom cadastrado nesta empresa.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  O administrador precisa cadastrar os garçons em Gestão RH → Garçons.
                </p>
              </div>
            ) : (
              <>
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
                      id="pin"
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
                  onClick={handleLogin}
                  disabled={isLoggingIn || pin.length < 4}
                  className="w-full h-12 text-lg"
                >
                  {isLoggingIn ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Entrando...</>
                  ) : (
                    <><UserRoundCheck className="w-5 h-5 mr-2" />Entrar</>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    localStorage.removeItem(SLUG_KEY);
                    navigate('/pwa/garcom', { replace: true });
                  }}
                >
                  Trocar restaurante
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="p-4 text-center text-xs text-muted-foreground">
        <p>Zoopi Tecnologia © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default function TenantGarcomPWA() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [needsSlugEntry, setNeedsSlugEntry] = useState(!slug);

  // Try to restore slug from localStorage on mount
  useEffect(() => {
    if (!slug && !needsSlugEntry) {
      const storedSlug = localStorage.getItem(SLUG_KEY);
      if (storedSlug) {
        navigate(`/${storedSlug}/garcom`, { replace: true });
      } else {
        setNeedsSlugEntry(true);
      }
    }
  }, [slug, needsSlugEntry, navigate]);

  if (needsSlugEntry) {
    return (
      <SlugEntryScreen
        appName="App do Garçom"
        appIcon={<UserRoundCheck className="w-10 h-10 text-primary" />}
        onSlugValidated={(validatedSlug) => {
          localStorage.setItem(SLUG_KEY, validatedSlug);
          setNeedsSlugEntry(false);
          navigate(`/${validatedSlug}/garcom`, { replace: true });
        }}
      />
    );
  }

  if (!slug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-background flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  return <GarcomContent slug={slug} />;
}
