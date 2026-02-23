/**
 * EntregadorLogin - Isolated PIN-based login for Delivery PWA
 * 
 * Route: /entregador/:companySlug
 * 
 * This is a completely isolated authentication flow that does NOT share
 * any state with the main app, waiter PWA, or any other module.
 * 
 * Uses deliverer_sessions table for session management.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bike, Lock, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';

const SESSION_KEY = 'entregador_session_token';

export default function EntregadorLogin() {
  const { companySlug } = useParams<{ companySlug: string }>();
  const navigate = useNavigate();
  
  const [selectedDelivererId, setSelectedDelivererId] = useState('');
  const [pin, setPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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

  // Check for existing session
  useEffect(() => {
    const checkExistingSession = async () => {
      const token = localStorage.getItem(SESSION_KEY);
      if (!token) return;

      try {
        const { data } = await supabase.functions.invoke('entregador-auth', {
          body: { action: 'validate', session_token: token }
        });

        if (data?.valid) {
          // Session is valid - redirect to app
          navigate(`/entregador/app`, { replace: true });
        } else {
          // Invalid session - clear it
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (error) {
        console.error('Session validation error:', error);
        localStorage.removeItem(SESSION_KEY);
      }
    };

    checkExistingSession();
  }, [navigate]);

  // Fetch company and deliverers
  const { data: companyData, isLoading: isLoadingCompany, error: companyError } = useQuery({
    queryKey: ['entregador-login-company', companySlug],
    queryFn: async () => {
      if (!companySlug) throw new Error('Slug não fornecido');

      // Get company by slug
      const { data: company, error: companyErr } = await supabase
        .from('companies')
        .select('id, name, logo_url, slug')
        .eq('slug', companySlug)
        .maybeSingle();

      if (companyErr || !company) {
        throw new Error('Empresa não encontrada');
      }

      // Get active deliverers for this company
      const { data: deliverers, error: deliverersErr } = await supabase
        .from('deliverers')
        .select('id, name')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name');

      if (deliverersErr) {
        throw new Error('Erro ao carregar entregadores');
      }

      return { company, deliverers: deliverers || [] };
    },
    enabled: !!companySlug,
    retry: 2
  });

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
    if (!selectedDelivererId || !pin || !companySlug) {
      toast.error('Selecione um entregador e informe o PIN');
      return;
    }

    setIsLoggingIn(true);

    try {
      const { data, error } = await supabase.functions.invoke('entregador-auth', {
        body: {
          action: 'login',
          company_slug: companySlug,
          deliverer_id: selectedDelivererId,
          pin
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.success && data?.session_token) {
        // Store session token in localStorage (isolated from main auth)
        localStorage.setItem(SESSION_KEY, data.session_token);
        
        toast.success(`Bem-vindo, ${data.deliverer.name}!`);
        
        // Navigate to the app
        navigate('/entregador/app', { replace: true });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Loading state
  if (isLoadingCompany) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-950 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  // Error state
  if (companyError || !companyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-950 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-500/30">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Empresa não encontrada</h2>
            <p className="text-muted-foreground">
              O link informado é inválido ou a empresa não existe.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { company, deliverers } = companyData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 to-background flex flex-col">
      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-green-600 text-white p-4 rounded-lg shadow-lg flex items-center gap-3">
          <Download className="w-6 h-6 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Instalar App Entregador</p>
            <p className="text-sm opacity-80">Acesso rápido pela tela inicial</p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleInstall}>
            Instalar
          </Button>
          <Button size="sm" variant="ghost" className="text-white" onClick={() => setShowInstallPrompt(false)}>
            ×
          </Button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.15)]">
          <CardHeader className="text-center space-y-4">
            {/* Company Logo */}
            {company.logo_url ? (
              <img 
                src={company.logo_url} 
                alt={company.name} 
                className="h-16 w-auto mx-auto object-contain"
              />
            ) : (
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center border border-green-500/30">
                <Bike className="w-10 h-10 text-green-500" />
              </div>
            )}
            
            <div>
              <CardTitle className="text-2xl">App do Entregador</CardTitle>
              <CardDescription className="text-lg mt-1">
                {company.name}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {deliverers.length === 0 ? (
              <div className="text-center py-4">
                <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
                <p className="text-muted-foreground">
                  Nenhum entregador cadastrado nesta empresa.
                </p>
              </div>
            ) : (
              <>
                {/* Deliverer Selection */}
                <div className="space-y-2">
                  <Label htmlFor="deliverer">Selecione seu nome</Label>
                  <Select value={selectedDelivererId} onValueChange={setSelectedDelivererId}>
                    <SelectTrigger id="deliverer" className="h-12">
                      <SelectValue placeholder="Escolha um entregador" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliverers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* PIN Input */}
                <div className="space-y-2">
                  <Label htmlFor="pin">PIN de acesso</Label>
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
                      className="pl-10 h-12 text-center text-lg tracking-widest"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLogin();
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Digite o PIN de 4-6 dígitos fornecido pela empresa
                  </p>
                </div>

                {/* Login Button */}
                <Button 
                  onClick={handleLogin}
                  disabled={isLoggingIn || !selectedDelivererId || pin.length < 4}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-lg"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <Bike className="w-5 h-5 mr-2" />
                      Entrar
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-muted-foreground">
        <p>Zoopi Tecnologia © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
