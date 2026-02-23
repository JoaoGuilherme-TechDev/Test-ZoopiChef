import { AlertTriangle, CreditCard, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BlockedCompanyScreenProps {
  reason?: string | null;
  planExpiresAt?: string | null;
  showContactSupport?: boolean;
}

export function BlockedCompanyScreen({ 
  reason, 
  planExpiresAt,
  showContactSupport = true 
}: BlockedCompanyScreenProps) {
  const handleContactSupport = () => {
    window.open('https://wa.me/5511999999999?text=Olá, preciso de ajuda com minha conta bloqueada', '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="max-w-md w-full shadow-xl border-destructive/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-display">Acesso Suspenso</CardTitle>
          <CardDescription className="text-base">
            {reason || 'Sua conta está temporariamente suspensa.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {planExpiresAt && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">Detalhes:</p>
              <p className="text-sm text-muted-foreground">
                Plano expirou em: {new Date(planExpiresAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => window.location.href = '/settings/billing'}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Regularizar Pagamento
            </Button>

            {showContactSupport && (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleContactSupport}
              >
                <Phone className="w-4 h-4 mr-2" />
                Falar com Suporte
              </Button>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground pt-4">
            Após regularização, o acesso será restabelecido automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
