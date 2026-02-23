/**
 * EntregadorIndex - Entry point for Entregador PWA
 * 
 * Route: /entregador
 * 
 * MANDATORY: Entregador app MUST be linked to a restaurant.
 * If no persisted context exists, shows a prompt to enter the company slug
 * or scan a QR code from the company.
 * 
 * Once linked, the app auto-restores on next open.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bike, QrCode, ArrowRight, Loader2 } from 'lucide-react';
import { 
  loadEntregadorContext, 
  hasPersistedEntregadorContext,
  getPersistedCompanySlug,
  getPersistedToken
} from '@/lib/pwa/entregadorPersistence';

export default function EntregadorIndex() {
  const navigate = useNavigate();
  const [companySlug, setCompanySlug] = useState('');
  const [isCheckingPersistence, setIsCheckingPersistence] = useState(true);

  // Check for persisted context on mount
  useEffect(() => {
    const checkPersistence = () => {
      if (hasPersistedEntregadorContext()) {
        const slug = getPersistedCompanySlug();
        const token = getPersistedToken();
        
        if (slug && token) {
          // Auto-redirect to the persisted restaurant's entregador app
          console.log('[EntregadorIndex] Auto-restoring context for:', slug);
          navigate(`/entregador/${slug}/app/${token}`, { replace: true });
          return;
        }
      }
      setIsCheckingPersistence(false);
    };

    checkPersistence();
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (companySlug.trim()) {
      navigate(`/entregador/${companySlug.trim().toLowerCase()}`);
    }
  };

  // Show loading while checking for persisted context
  if (isCheckingPersistence) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-950 to-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 to-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.15)]">
        <CardHeader className="text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center border border-green-500/30 mb-4">
            <Bike className="w-10 h-10 text-green-500" />
          </div>
          <CardTitle className="text-2xl">App do Entregador</CardTitle>
          <CardDescription>
            Acesse o app da sua empresa de entrega
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Código da Empresa</Label>
              <div className="flex gap-2">
                <Input
                  id="company"
                  type="text"
                  placeholder="ex: pizzaria-do-ze"
                  value={companySlug}
                  onChange={(e) => setCompanySlug(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={!companySlug.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Digite o código que sua empresa forneceu
              </p>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-lg bg-muted flex items-center justify-center mb-2">
              <QrCode className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Peça à sua empresa o link ou QR Code de acesso ao app do entregador
            </p>
          </div>
        </CardContent>
      </Card>

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <p>Zoopi Tecnologia © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
