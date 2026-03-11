import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Cpu, Zap, Sparkles } from "lucide-react";
import { AuthMode } from "@/pages/Auth";

interface AuthCardProps {
  children: ReactNode;
  activeTab: AuthMode;
  onTabChange: (tab: "login" | "register") => void;
}

export function AuthCard({ children, activeTab, onTabChange }: AuthCardProps) {
  
  // Títulos dinâmicos baseados no estado
  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'register':
        return {
          title: "Novo Credenciamento",
          subtitle: "Inicie sua jornada tecnológica no Zoopi",
          icon: <UserPlusIcon className="h-5 w-5" />
        };
      case 'forgot-password':
        return {
          title: "Recuperar Acesso",
          subtitle: "Validaremos sua identidade em instantes",
          icon: <Zap className="h-5 w-5" />
        };
      default:
        return {
          title: "Acesso Restrito",
          subtitle: "Identifique-se para gerenciar sua operação",
          icon: <Cpu className="h-5 w-5" />
        };
    }
  };

  const info = getHeaderInfo();

  return (
    <div className="relative w-full group">
      
      {/* --- Efeito de Brilho de Fundo (Glow Dinâmico) --- */}
      <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 rounded-[3rem] blur-2xl opacity-40 group-hover:opacity-60 transition duration-1000" />
      
      {/* --- Main Card Container (Glassmorphism) --- */}
      <div className="relative overflow-hidden bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl shadow-black/50">
        
        {/* Camada de Gradiente Interna sutil */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

        {/* --- HEADER DO CARD --- */}
        <div className="p-8 sm:p-10 pb-4 text-center relative z-10">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="h-[1px] w-6 bg-primary/30" />
              <div className="text-primary animate-pulse">
                {info.icon}
              </div>
              <span className="h-[1px] w-6 bg-primary/30" />
            </div>
            
            <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-none">
              {info.title}
            </h2>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] max-w-[240px] mx-auto leading-relaxed opacity-70">
              {info.subtitle}
            </p>
          </motion.div>
        </div>

        {/* --- TABS SELECTOR (Somente se não estiver em recuperação de senha) --- */}
        <AnimatePresence mode="wait">
          {activeTab !== 'forgot-password' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-8 sm:px-10 pb-6 relative z-10"
            >
              <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/5 relative">
                {/* Background deslizante (Pill) */}
                <motion.div
                  className="absolute inset-y-1.5 rounded-xl bg-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]"
                  initial={false}
                  animate={{
                    x: activeTab === "login" ? "0%" : "100%",
                    width: "calc(50% - 6px)"
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
                
                <button
                  type="button"
                  onClick={() => onTabChange("login")}
                  className={cn(
                    "relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500",
                    activeTab === "login" ? "text-white" : "text-muted-foreground hover:text-white"
                  )}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange("register")}
                  className={cn(
                    "relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500",
                    activeTab === "register" ? "text-white" : "text-muted-foreground hover:text-white"
                  )}
                >
                  Registrar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- CONTEÚDO DO FORMULÁRIO (RENDERIZAÇÃO) --- */}
        <div className="px-8 sm:px-10 pb-10 relative z-10">
          {children}
        </div>

        {/* Linha Neon de Carregamento Inferior */}
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </div>

      {/* --- ELEMENTO DECORATIVO EXTERNO --- */}
      <div className="hidden xl:block absolute -right-8 -bottom-8 pointer-events-none">
        <motion.div
          animate={{ 
            rotate: [0, 360],
            y: [0, -10, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="opacity-20"
        >
          <Sparkles className="h-16 w-16 text-primary/50" />
        </motion.div>
      </div>
    </div>
  );
}

// Pequeno helper local para ícone
function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}