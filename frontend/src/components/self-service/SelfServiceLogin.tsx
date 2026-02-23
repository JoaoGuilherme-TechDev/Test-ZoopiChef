import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Scale, User, Lock, Loader2 } from "lucide-react";
import { supabase } from '@/lib/supabase-shim';
import { toast } from "sonner";

interface SelfServiceLoginProps {
  company: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  onLogin: (operatorName: string) => void;
}

export function SelfServiceLogin({ company, onLogin }: SelfServiceLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }

    setIsLoading(true);

    try {
      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Email ou senha inválidos");
        setIsLoading(false);
        return;
      }

      // Check if user belongs to this company
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id, full_name")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        toast.error("Usuário não encontrado");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      if (profile.company_id !== company.id) {
        toast.error("Usuário não pertence a esta empresa");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // Sign out from Supabase (we just validated credentials)
      // The terminal will work in "session mode" without full auth
      await supabase.auth.signOut();

      toast.success(`Bem-vindo, ${profile.full_name || email}!`);
      onLogin(profile.full_name || email.split("@")[0]);
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.name}
              className="h-16 mx-auto object-contain"
            />
          ) : (
            <Scale className="h-16 w-16 mx-auto text-primary" />
          )}
          <div>
            <CardTitle className="text-2xl">{company.name}</CardTitle>
            <p className="text-muted-foreground mt-1">Self Service - Login do Operador</p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="operador@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Entrando...
                </>
              ) : (
                <>
                  <Scale className="h-4 w-4 mr-2" />
                  Entrar no Terminal
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
