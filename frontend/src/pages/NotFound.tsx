import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, AlertCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Rota não encontrada:", location.pathname);
  }, [location.pathname]);

  // Check if this looks like a public slug route (could be a company that doesn't exist)
  const segments = location.pathname.split('/').filter(Boolean);
  const couldBeCompanySlug = segments.length === 1 && !segments[0].includes('.');
  const couldBeTenantRoute = segments.length >= 2;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            {couldBeCompanySlug || couldBeTenantRoute ? (
              <Store className="w-10 h-10 text-muted-foreground" />
            ) : (
              <AlertCircle className="w-10 h-10 text-destructive" />
            )}
          </div>
        </div>
        
        {couldBeCompanySlug ? (
          <>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Empresa não encontrada</h1>
            <p className="mb-6 text-muted-foreground">
              Não encontramos nenhuma empresa com o link <code className="bg-muted px-2 py-1 rounded text-sm">/{segments[0]}</code>.
              Verifique se o endereço está correto.
            </p>
          </>
        ) : couldBeTenantRoute ? (
          <>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Página não encontrada</h1>
            <p className="mb-6 text-muted-foreground">
              O link <code className="bg-muted px-2 py-1 rounded text-sm">{location.pathname}</code> não existe ou a empresa não oferece esse serviço.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-6xl font-bold text-foreground">404</h1>
            <h2 className="mb-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
            <p className="mb-6 text-muted-foreground">
              A página <code className="bg-muted px-2 py-1 rounded text-sm">{location.pathname}</code> não existe ou foi movida.
            </p>
          </>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link to="/" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Ir para Início
            </Link>
          </Button>
          <Button onClick={() => window.history.back()} variant="ghost" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
