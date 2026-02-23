/**
 * PWASlugIdentifier - Unified Slug/QR Code Entry Component
 * 
 * This component is used by ALL operational PWAs to identify the restaurant
 * on first access. It enforces the rule that no PWA can operate without
 * knowing exactly which restaurant it belongs to.
 * 
 * Flow:
 * 1. Check for persisted context
 * 2. If found and valid, auto-restore
 * 3. If not found, show slug input or QR scanner
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  Store, 
  QrCode, 
  ArrowRight, 
  AlertTriangle,
  Monitor,
  Tablet,
  User,
  CreditCard,
  Settings,
  Truck
} from 'lucide-react';
import { 
  loadPWAContext, 
  savePWAContext, 
  buildPWAUrl,
  PWAFunction,
  PWAContext 
} from '@/lib/pwa/unifiedPersistence';

interface PWASlugIdentifierProps {
  /** The PWA function type (totem, tablet, garcom, pdv, terminal, entregador) */
  appType: PWAFunction;
  /** Called when restaurant is identified and validated */
  onIdentified: (context: {
    companyId: string;
    companySlug: string;
    companyName: string;
    logoUrl?: string;
  }) => void;
  /** Optional: If slug is already in URL params */
  urlSlug?: string;
  /** Optional: Additional device token (for totem) */
  deviceToken?: string;
}

const APP_LABELS: Record<PWAFunction, { label: string; icon: any; description: string }> = {
  totem: { 
    label: 'Totem Autoatendimento', 
    icon: Monitor,
    description: 'Terminal de pedidos para clientes'
  },
  tablet: { 
    label: 'Tablet Autoatendimento', 
    icon: Tablet,
    description: 'Cardápio digital na mesa'
  },
  garcom: { 
    label: 'App do Garçom', 
    icon: User,
    description: 'Gestão de mesas e pedidos'
  },
  pdv: { 
    label: 'PDV Loja', 
    icon: CreditCard,
    description: 'Ponto de venda e fechamento'
  },
  terminal: { 
    label: 'Terminal do Operador', 
    icon: Settings,
    description: 'Gestão operacional completa'
  },
  entregador: { 
    label: 'App do Entregador', 
    icon: Truck,
    description: 'Gerenciamento de entregas'
  },
};

export function PWASlugIdentifier({ 
  appType, 
  onIdentified, 
  urlSlug,
  deviceToken 
}: PWASlugIdentifierProps) {
  const navigate = useNavigate();
  const [slug, setSlug] = useState('');
  const [isRestoring, setIsRestoring] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appInfo = APP_LABELS[appType] || APP_LABELS.terminal;
  const AppIcon = appInfo.icon;

  // Check for stored context on mount
  useEffect(() => {
    const storedContext = loadPWAContext();
    
    // If URL has slug, use it directly
    if (urlSlug) {
      setSlug(urlSlug);
      setIsRestoring(false);
      return;
    }
    
    // If stored context matches our app type, try to restore
    if (storedContext && storedContext.function === appType) {
      const targetUrl = buildPWAUrl(storedContext);
      console.log(`[PWA:${appType}] Restoring from storage:`, targetUrl);
      navigate(targetUrl, { replace: true });
      return;
    }
    
    // No context to restore
    setIsRestoring(false);
  }, [urlSlug, appType, navigate]);

  // Query to validate the slug
  const { data: company, isLoading: isValidating, error: validationError } = useQuery({
    queryKey: ['pwa_company_validation', slug, appType],
    queryFn: async () => {
      if (!slug) return null;
      
      const { data, error } = await supabase
        .from('public_companies')
        .select('id, name, slug, logo_url, is_active, is_blocked')
        .eq('slug', slug.toLowerCase().trim())
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Empresa não encontrada');
      if (data.is_blocked) throw new Error('Empresa bloqueada');
      if (!data.is_active) throw new Error('Empresa inativa');
      
      return data;
    },
    enabled: !!slug && !isRestoring,
    retry: false,
  });

  // When company is validated, save context and notify parent
  useEffect(() => {
    if (company && slug) {
      const contextToSave: PWAContext = {
        restaurantSlug: slug.toLowerCase().trim(),
        restaurantId: company.id,
        restaurantName: company.name,
        function: appType,
        deviceToken: deviceToken,
        lastAccessedAt: new Date().toISOString(),
      };
      
      savePWAContext(contextToSave);
      
      onIdentified({
        companyId: company.id,
        companySlug: slug.toLowerCase().trim(),
        companyName: company.name,
        logoUrl: company.logo_url,
      });
    }
  }, [company, slug, appType, deviceToken, onIdentified]);

  // Handle validation error
  useEffect(() => {
    if (validationError) {
      setError((validationError as Error).message || 'Erro ao validar empresa');
    } else {
      setError(null);
    }
  }, [validationError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) {
      setError('Digite o código do restaurante');
      return;
    }
    setError(null);
    // Trigger query by setting the slug
    setSlug(slug.trim().toLowerCase());
  };

  const handleQRScan = (scannedData: string) => {
    // Extract slug from QR code URL
    // Expected formats:
    // - https://domain.com/slug/appType
    // - slug
    try {
      let extractedSlug = scannedData;
      
      if (scannedData.includes('/')) {
        const url = new URL(scannedData);
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          extractedSlug = pathParts[0];
        }
      }
      
      setSlug(extractedSlug.toLowerCase().trim());
      setShowScanner(false);
    } catch {
      setError('QR Code inválido');
    }
  };

  // Loading state during restoration
  if (isRestoring) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-xl text-foreground">Restaurando sessão...</p>
        </div>
      </div>
    );
  }

  // If we have a slug from URL and it's being validated
  if (urlSlug && isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-xl text-foreground">Validando restaurante...</p>
        </div>
      </div>
    );
  }

  // Error state for URL slug
  if (urlSlug && error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <CardTitle>{error}</CardTitle>
            <CardDescription>
              O link acessado não corresponde a um restaurante válido.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If URL has valid slug and company is loaded, the parent will handle rendering
  if (urlSlug && company) {
    return null;
  }

  // Show slug input form
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <AppIcon className="w-10 h-10 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">{appInfo.label}</CardTitle>
            <CardDescription className="text-base mt-2">
              {appInfo.description}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-base font-medium">
                Código do Restaurante
              </Label>
              <Input
                id="slug"
                type="text"
                placeholder="Digite o código ou slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-12 text-lg"
                autoFocus
                autoComplete="off"
              />
              {error && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </p>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 text-lg gap-2"
              disabled={isValidating}
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  Acessar
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-lg gap-2"
            onClick={() => setShowScanner(true)}
          >
            <QrCode className="w-5 h-5" />
            Escanear QR Code
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Acesse através do link fornecido pelo estabelecimento
            ou escaneie o QR Code disponível no local.
          </p>
        </CardContent>
      </Card>

      {/* QR Scanner Modal - simplified for now */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Escanear QR Code
              </CardTitle>
              <CardDescription>
                Posicione o QR Code do restaurante na câmera
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground text-center p-4">
                  Scanner de QR Code será implementado aqui.
                  <br />
                  Por enquanto, digite o código manualmente.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowScanner(false)}
              >
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
