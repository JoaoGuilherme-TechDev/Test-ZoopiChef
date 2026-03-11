import { motion, useScroll, useSpring } from "framer-motion";
import { AuthBackgroundV2 } from "@/components/auth/AuthBackgroundV2";
import { AuthHeaderV2 } from "@/components/auth/AuthHeaderV2";
import { AuthHeroV2 } from "@/components/auth/AuthHeroV2";
import { AuthBentoGridV2 } from "@/components/auth/AuthBentoGridV2";
import { AuthSocialProof } from "@/components/auth/AuthSocialProof";
import { AuthAISectionV2 } from "@/components/auth/AuthAISectionV2";
import { AuthPricingV2 } from "@/components/auth/AuthPricingV2";
import { AuthGatewayV2 } from "@/components/auth/AuthGatewayV2";
import { ChevronUp, Instagram, Twitter, Linkedin } from "lucide-react";
import { useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Por que o bug acontecia:
//
// O ThemeProvider do next-themes aplica `.dark` ou `.light` direto no <html>.
// O `landing-theme` só define variáveis CSS mas não bloqueia isso.
// Quando o usuário trocava pro light no sistema e voltava pra landing,
// o <html> tinha a classe `.light` — as variáveis do `.light {}` do globals.css
// sobrescreviam as do `.landing-theme {}`, quebrando cores hardcoded da landing.
//
// SOLUÇÃO:
// 1. Montar: força `dark` no <html> e remove `light` (a landing é sempre dark)
// 2. Desmontar: restaura o tema original que estava antes de entrar na landing
//
// Isso isola completamente a landing do sistema de temas sem tocar no
// ThemeProvider nem nos outros componentes.
// ─────────────────────────────────────────────────────────────────────────────

const FOOTER_LINKS = {
  Tecnologia: [
    { label: "Infraestrutura Cloud", anchor: "ecossistema" },
    { label: "Segurança de Dados", anchor: "ecossistema" },
    { label: "API para Desenvolvedores", anchor: null },
    { label: "Sistemas Offline", anchor: "ecossistema" },
  ],
  Empresa: [
    { label: "Sobre Nós", anchor: null },
    { label: "Carreiras", anchor: null },
    { label: "Blog Operacional", anchor: null },
    { label: "Contato", anchor: "login" },
  ],
  Suporte: [
    { label: "Central de Ajuda", anchor: null },
    { label: "Status do Servidor", anchor: null },
    { label: "Termos de Uso", anchor: null },
    { label: "Privacidade", anchor: null },
  ],
};

export default function Auth() {
  const { scrollYProgress } = useScroll();

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const scrollTo = (anchor: string | null) => {
    if (!anchor) return;
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
  };

  // ── Força dark na landing, independente do tema do sistema ──────────────
  //
  // Três camadas do problema:
  //  1. <html> recebe .light/.dark do ThemeProvider → força .dark
  //  2. body/  #root recebem background via `.light body {}` no globals.css
  //     → sobrescreve com background escuro diretamente no style
  //  3. AuthBackgroundV2 usa `bg-transparent` + `fixed` → depende do body
  //     → com o body escuro fixo, o fundo da landing sempre fica correto
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    // 1. Salva classes anteriores do <html>
    const previousClasses = Array.from(html.classList).filter(
      (c) => c === "light" || c === "dark"
    );

    // 2. Força .dark no <html>
    html.classList.remove("light", "dark");
    html.classList.add("dark");

    // 3. Força background escuro no body e #root via style inline
    //    (sobrescreve qualquer background vindo do globals.css)
    const LANDING_BG = "#050509"; // mesma cor base do landing-theme
    const prevBodyBg = body.style.background;
    const prevRootBg = root?.style.background ?? "";
    body.style.background = LANDING_BG;
    if (root) root.style.background = LANDING_BG;

    return () => {
      // Restaura tudo ao sair da landing
      html.classList.remove("light", "dark");
      previousClasses.forEach((cls) => html.classList.add(cls));
      // Se não havia tema salvo (primeira visita), volta pro dark (default do app)
      if (previousClasses.length === 0) html.classList.add("dark");

      body.style.background = prevBodyBg;
      if (root) root.style.background = prevRootBg;
    };
  }, []);

  return (
    <div className="landing-theme relative min-h-screen selection:bg-primary/30 selection:text-foreground overflow-x-hidden">

      {/* Barra de progresso */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-accent to-primary z-[60] origin-left"
        style={{ scaleX }}
      />

      {/* Background */}
      <AuthBackgroundV2 />

      {/* Header */}
      <AuthHeaderV2
        onLoginClick={() => scrollTo("login")}
        onRegisterClick={() => scrollTo("login")}
      />

      {/* Conteúdo principal */}
      <main className="relative z-10">
        <AuthHeroV2 />
        <AuthBentoGridV2 />
        <AuthAISectionV2 />
        <AuthSocialProof />
        <AuthPricingV2 />
        <AuthGatewayV2 />
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-black/30 border-t border-white/5 pt-14 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-xs">Z</span>
                </div>
                <span className="text-lg font-black uppercase tracking-tighter text-white">
                  Zoopi<span className="text-primary">.</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                A próxima geração em sistemas de gestão para o food service de alta performance.
              </p>
              <div className="flex gap-3">
                {[Instagram, Twitter, Linkedin].map((Icon, i) => (
                  <button
                    key={i}
                    onClick={() => scrollTo("login")}
                    className="p-2 rounded-full bg-white/5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                    aria-label="Rede social"
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>
            </div>

            {/* Links */}
            {Object.entries(FOOTER_LINKS).map(([category, links]) => (
              <div key={category} className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                  {category}
                </h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      <button
                        onClick={() => scrollTo(link.anchor)}
                        disabled={!link.anchor}
                        className={`text-[11px] font-medium uppercase tracking-wider transition-colors text-left ${
                          link.anchor
                            ? "text-muted-foreground hover:text-primary cursor-pointer"
                            : "text-muted-foreground/30 cursor-not-allowed"
                        }`}
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
              © 2026 Zoopi Intelligence Technologies. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                Global Operations — BR
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      <motion.button
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-xl bg-primary/20 backdrop-blur-xl border border-primary/30 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-xl"
        aria-label="Voltar ao topo"
      >
        <ChevronUp size={18} />
      </motion.button>
    </div>
  );
}