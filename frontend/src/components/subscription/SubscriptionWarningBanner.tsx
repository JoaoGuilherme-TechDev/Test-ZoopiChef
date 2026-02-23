import { useSubscriptionWarning } from '@/hooks/useSubscriptionWarning';
import { AlertTriangle, XCircle, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function SubscriptionWarningBanner() {
  const { showWarning, daysRemaining, message, isBlocked, blockedReason } = useSubscriptionWarning();
  const [dismissed, setDismissed] = useState(false);

  // Se bloqueado, sempre mostrar
  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-destructive/10 border border-destructive rounded-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-destructive/20 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-destructive">Sistema Bloqueado</h2>
          <p className="text-muted-foreground">
            {blockedReason || 'Sua conta está bloqueada por inadimplência. Entre em contato com o suporte para regularizar sua situação.'}
          </p>
          <div className="pt-4">
            <Button variant="outline" asChild>
              <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
                Entrar em Contato
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Se não precisa mostrar aviso ou foi dispensado
  if (!showWarning || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-warning/95 text-warning-foreground px-4 py-3 shadow-lg">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">
            {message}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 hover:bg-warning-foreground/10"
          onClick={() => setDismissed(true)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
