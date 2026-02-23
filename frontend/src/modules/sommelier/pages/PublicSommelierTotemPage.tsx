import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { SommelierFlow } from '../components/SommelierFlow';
import { useCompanyByToken } from '@/hooks/useCompanyPublicLinks';

export default function PublicSommelierTotemPage() {
  const { token } = useParams<{ token: string }>();
  const { data: company, isLoading } = useCompanyByToken(token, 'menu');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Enólogo não encontrado</h1>
        <p className="text-muted-foreground">Verifique se o link está correto</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SommelierFlow
        companyId={company.id}
        companyName={company.name}
        logoUrl={company.logo_url}
      />
    </div>
  );
}
