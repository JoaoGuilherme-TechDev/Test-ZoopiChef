import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/pages/Dashboard";
import Auth from "@/pages/Auth";
import { Loader2 } from "lucide-react";


/**
 * Entrada raiz - Root Entry Point
 *
 * Comportamento:
 * 1. Se usuário está logado, mostra Dashboard
 * 2. Se não está logado, mostra tela de Auth
 */
export default function RootEntry() {
  const { user, loading } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Não forçamos redirecionamento para /waiter aqui.
    // O PWA do garçom já abre direto em /waiter via start_url do manifesto.
    setChecked(true);
  }, []);


  // Aguarda verificação inicial
  if (!checked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não está logado, mostra tela de login
  if (!user) {
    return <Auth />;
  }

  // Usuário logado - mostra Dashboard
  return <Dashboard />;
}
