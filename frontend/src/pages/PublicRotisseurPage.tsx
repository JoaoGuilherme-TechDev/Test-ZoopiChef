import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { RotisseurFlow } from '@/modules/rotisseur';
import { Loader2 } from 'lucide-react';

export default function PublicRotisseurPage() {
  const { token } = useParams<{ token: string }>();

  // Fetch company from public_companies view by token/slug
  const { data: company, isLoading, error } = useQuery({
    queryKey: ['rotisseur-company-by-token', token],
    queryFn: async () => {
      if (!token) throw new Error('Token não fornecido');

      // Use public_companies view which is accessible without auth
      // First try to find company by slug (token might be the slug)
      const { data: companyBySlug, error: slugError } = await supabase
        .from('public_companies')
        .select('id, name, logo_url, slug')
        .eq('slug', token)
        .maybeSingle();

      if (companyBySlug) {
        return companyBySlug;
      }

      // If not found by slug, the token format is not supported
      // For token-based access, a dedicated RPC would be needed
      throw new Error('Estabelecimento não encontrado');

      throw new Error('Token inválido ou expirado');
    },
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">🥩</div>
          <h1 className="text-2xl font-bold text-foreground">
            Maître Rôtisseur
          </h1>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Link inválido ou expirado'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <RotisseurFlow
      companyId={company.id}
      companyName={company.name}
      logoUrl={company.logo_url}
    />
  );
}
