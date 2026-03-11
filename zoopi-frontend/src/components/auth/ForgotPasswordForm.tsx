import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  Mail, 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  ChevronRight,
  ShieldQuestion
} from "lucide-react";

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulando chamada ao NestJS para reset de senha
    // No futuro: await api.post('/auth/forgot-password', { email })
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    setIsSent(true);
  };

  return (
    <div className="min-h-[320px] flex flex-col justify-center">
      <AnimatePresence mode="wait">
        {!isSent ? (
          <motion.div
            key="request-form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <ShieldQuestion className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-white">Recuperação de Acesso</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Sua segurança em primeiro lugar</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Informe o e-mail cadastrado na sua unidade. Enviaremos um link seguro para a criação de uma nova credencial.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">
                  E-mail de Trabalho
                </Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input 
                    type="email" 
                    placeholder="exemplo@restaurante.com" 
                    className="h-12 pl-12 bg-white/5 border-white/10 rounded-2xl focus:border-primary/50 transition-all text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <Button 
                  type="submit" 
                  className="w-full h-14 btn-neon rounded-2xl font-black uppercase tracking-widest text-xs group"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      Enviar Link de Resgate
                      <Send className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </span>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={onBack}
                  className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors py-2"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Voltar para o Login
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="success-message"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
              <div className="relative h-20 w-20 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase tracking-tight text-white">E-mail Enviado</h3>
              <p className="text-xs text-muted-foreground font-medium max-w-[280px] mx-auto leading-relaxed">
                As instruções de recuperação foram enviadas para <span className="text-white font-bold">{email}</span>. Verifique também sua caixa de spam.
              </p>
            </div>

            <div className="pt-4 space-y-4">
              <Button 
                onClick={onBack}
                className="w-full h-14 bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] text-white rounded-2xl font-black uppercase tracking-widest text-xs group"
              >
                Retornar ao Login
              </Button>
              
              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">
                Não recebeu? <button onClick={() => setIsSent(false)} className="text-primary hover:underline">Tentar outro e-mail</button>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}