import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  User, 
  Building2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  UtensilsCrossed,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: "",
    companyId: "", // Identificação da unidade
    email: "",
    password: "",
    segment: "pizzaria"
  });

  const { signUp } = useAuth();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await signUp(
      formData.email, 
      formData.password, 
      formData.fullName, 
      formData.companyId
    );
    
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      setSuccess(true);
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-10 space-y-6"
      >
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
          <div className="relative h-24 w-24 bg-primary/10 rounded-[2.5rem] border border-primary/30 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-12 w-12 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-black uppercase tracking-tight text-white">Solicitação Recebida</h3>
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest leading-relaxed max-w-[300px] mx-auto">
            Sua credencial mestre foi gerada. Agora, valide seu e-mail para desbloquear o acesso total ao painel.
          </p>
        </div>

        <div className="pt-4">
          <Button 
            onClick={() => window.location.reload()}
            className="w-full h-14 bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] rounded-2xl font-black uppercase tracking-widest text-xs"
          >
            Ir para o Login
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSignUp} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* SEÇÃO: IDENTIFICAÇÃO PESSOAL */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-4 bg-primary rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Gestor da Conta</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 text-left">
            <Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-muted-foreground/70">Nome Completo</Label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <User className="h-4 w-4" />
              </div>
              <Input 
                placeholder="Ex: Carlos Mendes" 
                className="h-12 pl-11 bg-white/[0.03] border-white/10 rounded-xl focus:border-primary/50 transition-all text-sm"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                required 
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-muted-foreground/70">E-mail Corporativo</Label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <Mail className="h-4 w-4" />
              </div>
              <Input 
                type="email" 
                placeholder="nome@empresa.com" 
                className="h-12 pl-11 bg-white/[0.03] border-white/10 rounded-xl focus:border-primary/50 transition-all text-sm"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required 
              />
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: DADOS DO ESTABELECIMENTO */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-4 bg-accent rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Unidade Operacional</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 text-left">
            <Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-muted-foreground/70">Código de Ativação</Label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors">
                <Building2 className="h-4 w-4" />
              </div>
              <Input 
                placeholder="ID da Empresa" 
                className="h-12 pl-11 bg-white/[0.03] border-white/10 rounded-xl focus:border-accent/50 transition-all text-sm font-mono"
                value={formData.companyId}
                onChange={(e) => setFormData({...formData, companyId: e.target.value})}
                required 
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-muted-foreground/70">Senha Mestra</Label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <Lock className="h-4 w-4" />
              </div>
              <Input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                className="h-12 pl-11 pr-12 bg-white/[0.03] border-white/10 rounded-xl focus:border-primary/50 transition-all text-sm font-mono tracking-widest"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ERROS E VALIDAÇÕES */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }} 
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-bold flex items-center gap-2 uppercase tracking-tight"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-2">
        <Button 
          type="submit" 
          className="w-full h-14 btn-neon rounded-2xl font-black uppercase tracking-[0.1em] text-xs group"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Configurando Unidade...</span>
            </div>
          ) : (
            <span className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Finalizar Credenciamento
            </span>
          )}
        </Button>
      </div>

      <p className="text-[8px] text-muted-foreground/60 text-center uppercase font-black tracking-[0.2em] px-4">
        Ao registrar, você concorda com nossos <a href="#" className="text-primary hover:underline">Termos de Serviço</a> e políticas de privacidade Zoopi.
      </p>
    </form>
  );
}