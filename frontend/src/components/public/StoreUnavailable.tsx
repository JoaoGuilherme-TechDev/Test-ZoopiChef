import { Store } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StoreUnavailableProps {
  companyName?: string;
}

export function StoreUnavailable({ companyName }: StoreUnavailableProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Store className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Loja Temporariamente Indisponível</CardTitle>
          <CardDescription className="text-base mt-2">
            {companyName ? (
              <>
                A loja <strong>{companyName}</strong> está temporariamente fora do ar.
              </>
            ) : (
              'Esta loja está temporariamente fora do ar.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Por favor, tente novamente mais tarde ou entre em contato diretamente com o estabelecimento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
