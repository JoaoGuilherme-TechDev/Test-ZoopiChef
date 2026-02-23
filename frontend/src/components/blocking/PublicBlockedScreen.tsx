import { Store, AlertCircle } from 'lucide-react';

interface PublicBlockedScreenProps {
  companyName?: string;
  reason?: string | null;
}

export function PublicBlockedScreen({ companyName, reason }: PublicBlockedScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <Store className="w-10 h-10 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">
            {companyName || 'Estabelecimento'}
          </h1>
          <div className="flex items-center justify-center gap-2 text-amber-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Temporariamente Indisponível</span>
          </div>
        </div>
        
        <p className="text-muted-foreground">
          {reason || 'Este estabelecimento está temporariamente fora do ar. Por favor, tente novamente mais tarde.'}
        </p>
        
        <p className="text-xs text-muted-foreground">
          Se você é o proprietário, entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
}
