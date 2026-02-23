import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from '@/lib/supabase-shim';
import { Loader2 } from "lucide-react";
import { SelfServiceLogin } from "@/components/self-service/SelfServiceLogin";
import { SelfServiceTerminal } from "@/components/self-service/SelfServiceTerminal";

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function PublicSelfServiceByToken() {
  const { token } = useParams<{ token: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [operatorName, setOperatorName] = useState<string>("");

  useEffect(() => {
    async function fetchCompany() {
      if (!token) {
        setError("Token inválido");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch company by self_service_token or menu_token (using any to handle new column)
        const { data, error: fetchError } = await supabase
          .from("companies")
          .select("id, name, logo_url, menu_token")
          .or(`menu_token.eq.${token}`)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Empresa não encontrada");
          setIsLoading(false);
          return;
        }

        setCompany({
          id: data.id,
          name: data.name,
          logo_url: data.logo_url,
        });
      } catch (err) {
        console.error("Error fetching company:", err);
        setError("Erro ao carregar empresa");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompany();
  }, [token]);

  // Check for existing session
  useEffect(() => {
    const savedSession = sessionStorage.getItem(`selfservice_${token}`);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.operatorName && session.expiresAt > Date.now()) {
          setOperatorName(session.operatorName);
          setIsAuthenticated(true);
        } else {
          sessionStorage.removeItem(`selfservice_${token}`);
        }
      } catch {
        sessionStorage.removeItem(`selfservice_${token}`);
      }
    }
  }, [token]);

  const handleLogin = (name: string) => {
    setOperatorName(name);
    setIsAuthenticated(true);
    
    // Save session for 8 hours
    sessionStorage.setItem(
      `selfservice_${token}`,
      JSON.stringify({
        operatorName: name,
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      })
    );
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setOperatorName("");
    sessionStorage.removeItem(`selfservice_${token}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Erro</h1>
          <p className="text-muted-foreground">{error || "Empresa não encontrada"}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <SelfServiceLogin
        company={company}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <SelfServiceTerminal
      company={company}
      operatorName={operatorName}
      onLogout={handleLogout}
    />
  );
}
