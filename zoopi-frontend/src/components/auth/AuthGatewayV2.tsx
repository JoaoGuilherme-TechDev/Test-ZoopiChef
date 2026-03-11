/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Mail,
  Fingerprint,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  UserPlus,
  ArrowLeft,
  User,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type GatewayTab = "login" | "register" | "forgot";

export function AuthGatewayV2() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<GatewayTab>("login");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  // Forgot password field
  const [forgotEmail, setForgotEmail] = useState("");

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const switchTab = (tab: GatewayTab) => {
    clearMessages();
    setActiveTab(tab);
  };

  // ── LOGIN ──────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    const result = await signIn(email, password);

    if (result.error) {
      setIsLoading(false);
      const msg = (result.error as any)?.message || "";
      if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credentials")) {
        setError("E-mail ou senha incorretos. Verifique suas credenciais.");
      } else if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
        setError("Sem conexão com o servidor. Tente novamente.");
      } else {
        setError("Não foi possível acessar. Tente novamente.");
      }
    } else {
      setTimeout(() => navigate("/"), 300);
    }
  };

  // ── REGISTER ───────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (registerPassword !== registerConfirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (registerPassword.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setIsLoading(true);
    // Aqui conecta ao seu endpoint de registro quando disponível
    // Por ora simula e mostra mensagem de contato
    setTimeout(() => {
      setIsLoading(false);
      setError(null);
      setSuccessMessage("Solicitação enviada! Nossa equipe entrará em contato em breve para ativar seu acesso.");
    }, 1200);
  };

  // ── FORGOT PASSWORD ────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    // Aqui conecta ao endpoint de recuperação de senha
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage(`Instruções de recuperação enviadas para ${forgotEmail}`);
    }, 1200);
  };

  return (
    <section id="login" className="py-16 px-6 relative flex flex-col items-center">

      {/* Título */}
      <div className="text-center mb-8 space-y-3">
        
        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white">
          login e <span className="text-primary">registro</span>
        </h2>
      </div>

      <div className="w-full max-w-[480px] relative group">

        {/* Moldura de brilho */}
        <div className="absolute -inset-1 bg-gradient-to-b from-white/20 via-primary/40 to-white/5 rounded-[3rem] blur-[2px] opacity-50 group-hover:opacity-100 transition-opacity duration-700" />

        {/* Card principal */}
        <div className="relative bg-[#05070a]/90 backdrop-blur-3xl border border-white/20 rounded-[2.8rem] shadow-2xl p-8 sm:-5 overflow-hidden">

          {/* Scanline */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(99,102,241,0.05)_50%,transparent_100%)] bg-[length:100%_400%] animate-[scanline_8s_linear_infinite] pointer-events-none" />

          <div className="relative z-10">

            {/* ── TABS (login / register) ── */}
            <AnimatePresence mode="wait">
              {activeTab !== "forgot" && (
                <motion.div
                  key="tabs"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex bg-white/[0.04] p-1.5 rounded-2xl border border-white/5 mb-6 relative"
                >
                  <motion.div
                    className="absolute inset-y-1.5 rounded-xl bg-primary shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                    initial={false}
                    animate={{
                      x: activeTab === "login" ? "0%" : "100%",
                      width: "calc(50% - 6px)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                  <button
                    onClick={() => switchTab("login")}
                    className={cn(
                      "relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors",
                      activeTab === "login" ? "text-white" : "text-muted-foreground"
                    )}
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => switchTab("register")}
                    className={cn(
                      "relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors",
                      activeTab === "register" ? "text-white" : "text-muted-foreground"
                    )}
                  >
                    Registrar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── FEEDBACK: ERRO ── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs font-semibold text-red-300 leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── FEEDBACK: SUCESSO ── */}
            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-xs font-semibold text-emerald-300 leading-relaxed">{successMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════
                CONTEÚDO ANIMADO — troca entre login / register / forgot
            ══════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">

              {/* ── FORMULÁRIO: LOGIN ── */}
              {activeTab === "login" && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
                  {/* Email */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">
                      E-mail Corporativo
                    </Label>
                    <div className="relative group/input">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                      <Input
                        type="email"
                        placeholder="nome@empresa.com"
                        className="h-11 pl-12 bg-white/[0.04] border-white/20 rounded-2xl focus:border-primary/50 transition-all text-sm font-medium placeholder:text-white/40"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); clearMessages(); }}
                        required
                      />
                    </div>
                  </div>

                  {/* Senha */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end px-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Chave de Segurança
                      </Label>
                      <button
                        type="button"
                        onClick={() => switchTab("forgot")}
                        className="text-[9px] font-bold text-primary/60 hover:text-primary transition-colors uppercase tracking-wider"
                      >
                        Esqueceu?
                      </button>
                    </div>
                    <div className="relative group/input">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-11 pl-12 pr-12 bg-white/[0.04] border-white/20 rounded-2xl focus:border-primary/50 transition-all text-sm font-mono tracking-widest placeholder:text-white/40"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); clearMessages(); }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* CTA */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-2">
                    <Button
                      type="submit"
                      className="w-full h-11 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] text-xs shadow-[0_0_30px_rgba(99,102,241,0.3)] relative overflow-hidden group/btn"
                      disabled={isLoading}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.15)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none" />
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <div className="flex items-center gap-3">
                          <Fingerprint className="h-5 w-5 opacity-70 group-hover/btn:scale-110 transition-transform" />
                          <span>Ativar Acesso</span>
                          <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </Button>
                  </motion.div>
                </motion.form>
              )}

              {/* ── FORMULÁRIO: REGISTER ── */}
              {activeTab === "register" && (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  {/* Nome */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">
                      Nome do Responsável
                    </Label>
                    <div className="relative group/input">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                      <Input
                        type="text"
                        placeholder="Seu nome completo"
                        className="h-11 pl-12 bg-white/[0.04] border-white/20 rounded-2xl focus:border-primary/50 transition-all text-sm font-medium placeholder:text-white/40"
                        value={registerName}
                        onChange={(e) => { setRegisterName(e.target.value); clearMessages(); }}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">
                      E-mail Corporativo
                    </Label>
                    <div className="relative group/input">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                      <Input
                        type="email"
                        placeholder="nome@empresa.com"
                        className="h-11 pl-12 bg-white/[0.04] border-white/20 rounded-2xl focus:border-primary/50 transition-all text-sm font-medium placeholder:text-white/40"
                        value={registerEmail}
                        onChange={(e) => { setRegisterEmail(e.target.value); clearMessages(); }}
                        required
                      />
                    </div>
                  </div>

                  {/* Senha */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">
                      Criar Senha
                    </Label>
                    <div className="relative group/input">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        className="h-11 pl-12 pr-12 bg-white/[0.04] border-white/20 rounded-2xl focus:border-primary/50 transition-all text-sm placeholder:text-white/40"
                        value={registerPassword}
                        onChange={(e) => { setRegisterPassword(e.target.value); clearMessages(); }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Senha */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">
                      Confirmar Senha
                    </Label>
                    <div className="relative group/input">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Repita a senha"
                        className={cn(
                          "h-11 pl-12 pr-12 bg-white/[0.04] rounded-2xl focus:border-primary/50 transition-all text-sm placeholder:text-white/40",
                          registerConfirmPassword && registerPassword !== registerConfirmPassword
                            ? "border-red-500/50"
                            : "border-white/20"
                        )}
                        value={registerConfirmPassword}
                        onChange={(e) => { setRegisterConfirmPassword(e.target.value); clearMessages(); }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {registerConfirmPassword && registerPassword !== registerConfirmPassword && (
                      <p className="text-[10px] text-red-400 font-bold ml-1 uppercase tracking-wider">
                        As senhas não coincidem
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-2">
                    <Button
                      type="submit"
                      className="w-full h-11 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] text-xs shadow-[0_0_30px_rgba(99,102,241,0.3)] relative overflow-hidden group/btn"
                      disabled={isLoading || (!!registerConfirmPassword && registerPassword !== registerConfirmPassword)}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.15)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none" />
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <div className="flex items-center gap-3">
                          <UserPlus className="h-5 w-5 opacity-70" />
                          <span>Solicitar Acesso</span>
                          <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </Button>
                  </motion.div>
                </motion.form>
              )}

              {/* ── FORMULÁRIO: FORGOT PASSWORD ── */}
              {activeTab === "forgot" && (
                <motion.form
                  key="forgot"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  onSubmit={handleForgotPassword}
                  className="space-y-6"
                >
                  {/* Voltar */}
                  <button
                    type="button"
                    onClick={() => switchTab("login")}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Voltar ao login
                  </button>

                  <div className="space-y-1">
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">
                      Recuperar Acesso
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      Informe seu e-mail cadastrado. Enviaremos as instruções de recuperação.
                    </p>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">
                      E-mail Cadastrado
                    </Label>
                    <div className="relative group/input">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                      <Input
                        type="email"
                        placeholder="nome@empresa.com"
                        className="h-11 pl-12 bg-white/[0.04] border-white/20 rounded-2xl focus:border-primary/50 transition-all text-sm font-medium placeholder:text-white/40"
                        value={forgotEmail}
                        onChange={(e) => { setForgotEmail(e.target.value); clearMessages(); }}
                        required
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      className="w-full h-11 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] text-xs shadow-[0_0_30px_rgba(99,102,241,0.3)] relative overflow-hidden group/btn"
                      disabled={isLoading}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.15)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none" />
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 opacity-70" />
                          <span>Enviar Instruções</span>
                          <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </Button>
                  </motion.div>
                </motion.form>
              )}

            </AnimatePresence>

            

          </div>

          {/* Luz interna */}
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
        </div>
      </div>

      
    </section>
  );
}