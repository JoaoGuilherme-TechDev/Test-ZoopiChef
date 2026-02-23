import React, { useState } from 'react';
import { usePizzaKdsV2Session } from '@/contexts/PizzaKdsV2SessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pizza, Loader2, AlertCircle } from 'lucide-react';

/**
 * Pizza KDS V2 - Slug Entry Screen
 * 
 * First step of authentication: enter restaurant slug
 */
export function PizzaKdsV2SlugScreen() {
  const { validateSlug, setRestaurantContext } = usePizzaKdsV2Session();
  const [slug, setSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return;

    setIsLoading(true);
    setError(null);

    const result = await validateSlug(slug.trim().toLowerCase());

    if (!result.valid) {
      setError(result.error || 'Restaurante não encontrado');
      setIsLoading(false);
      return;
    }

    if (!result.pizzaKdsV2Enabled) {
      setError('O KDS Multi-Etapa V2 não está habilitado para este restaurante');
      setIsLoading(false);
      return;
    }

    setRestaurantContext(
      result.companyId!,
      result.name!,
      result.logo || null,
      slug.trim().toLowerCase(),
      result.pizzaKdsV2Enabled!
    );

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
            <Pizza className="w-12 h-12 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Pizza KDS V2</CardTitle>
            <p className="text-muted-foreground mt-2">
              Sistema Multi-Etapa de Produção
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-medium">
                Código do Restaurante
              </label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="ex: pizzaria-central"
                disabled={isLoading}
                className="h-12 text-lg"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !slug.trim()}
              className="w-full h-12 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Continuar'
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Entre com o código do restaurante para acessar o sistema de produção de pizzas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
