import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  AlertCircle,
  Fingerprint
} from "lucide-react";

interface LoginFormProps {
  onForgotPassword: () => void;
}

export function LoginForm({ onForgotPassword }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Pequeno delay artificial para dar sensação de validação de segurança
    const result = await signIn(email, password);
    
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      // Animação de sucesso antes de navegar
      setTimeout(() => navigate("/"), 400);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Campo de E-mail */}
      <div className="space-y-2 text-left">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-muted-foreground/80">
          Identificação Corporativa
        </Label>
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-300">
            <Mail className="h-4 w-4" />
          </div>
          <Input 
            type="email" 
            placeholder="seu@email.com" 
            className="h-13 pl-12 bg-white/[0.03] border-white/10 rounded-2xl focus:border-primary/50 focus:ring-primary/20 transition-all text-sm font-medium"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>
      </div>

      {/* Campo de Senha */}
      <div className="space-y-2 text-left">
        <div className="flex justify-between items-end px-1">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
            Chave de Acesso
          </Label>
          <button 
            type="button" 
            onClick={onForgotPassword}
            className="text-[9px] font-black uppercase text-primary/60 hover:text-primary transition-colors tracking-tighter"
          >
            Esqueceu sua chave?
          </button>
        </div>
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-300">
            <Lock className="h-4 w-4" />
          </div>
          <Input 
            type={showPassword ? "text" : "password"} 
            placeholder="••••••••" 
            className="h-13 pl-12 pr-12 bg-white/[0.03] border-white/10 rounded-2xl focus:border-primary/50 focus:ring-primary/20 transition-all text-sm font-mono tracking-widest"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors p-1"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mensagem de Erro Dinâmica */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-bold flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão Submit */}
      <div className="pt-2">
        <Button 
          type="submit" 
          className="w-full h-14 btn-neon rounded-2xl font-black uppercase tracking-widest text-xs group relative overflow-hidden"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Autenticando...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Fingerprint className="h-4 w-4 opacity-70 group-hover:scale-110 transition-transform" />
              <span>Acessar Painel Zoopi</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </Button>
      </div>

      {/* Opção Extra / Segurança */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          Ambiente Seguro com Criptografia de Ponta
        </span>
      </div>
    </form>
  );
}