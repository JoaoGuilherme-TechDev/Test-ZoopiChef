import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronRight, Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuthHeaderV2Props {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

const NAV_ITEMS = [
  { label: "Ecossistema", anchor: "ecossistema" },
  { label: "Inteligência", anchor: "inteligência" },
  { label: "Planos", anchor: "planos" },
];

// ─────────────────────────────────────────────────────────────────────────────
// SISTEMA DE CAMADAS — Liquid Water 3D (Landing Header)
//
// Camada 0 | Header blade   → placa de vidro espessa, aparece no scroll
//                             luz de cima-esquerda, bordas com halos
// Camada 1 | Nav pill       → bolha convexa flutuando no vidro
//                             física invertida: borda inferior brilha mais
// Camada 2 | Botões / Logo  → gotas individuais
// Camada 3 | Drawer mobile  → painel de vidro mais espesso (mais elevado)
// ─────────────────────────────────────────────────────────────────────────────

// CAMADA 0 — Header blade (placa de vidro horizontal)
const HEADER_GLASS = {
  background: `linear-gradient(
    160deg,
    rgba(255,255,255,0.07) 0%,
    rgba(255,255,255,0.02) 50%,
    rgba(255,255,255,0.05) 100%
  )`,
  backdropFilter: "blur(28px) saturate(200%) brightness(1.05)",
  WebkitBackdropFilter: "blur(28px) saturate(200%) brightness(1.05)",
  borderBottom: "1px solid rgba(255,255,255,0.10)",
  boxShadow: [
    // INSET — highlight borda superior (quina recebe luz direta)
    "inset 0 1.5px 0 0 rgba(255,255,255,0.45)",
    // INSET — borda inferior (sombra da espessura do vidro)
    "inset 0 -1px 0 0 rgba(255,255,255,0.04)",
    // INSET — lateral esquerda (fonte de luz)
    "inset 1.5px 0 0 0 rgba(255,255,255,0.12)",
    // INSET — lateral direita (reflexo difuso)
    "inset -1px 0 0 0 rgba(255,255,255,0.04)",
    // INSET — gradiente de profundidade (espessura do vidro)
    "inset 0 3px 14px 0 rgba(255,255,255,0.06)",
    "inset 0 -4px 16px 0 rgba(0,0,0,0.18)",
    // INSET — vinheta central (curvatura sutil — não é flat)
    "inset 0 0 32px 6px rgba(0,0,0,0.04)",
    // EXTERNA — micro-linha de luz no topo (Apple highlight)
    "0 -0.5px 0 0.5px rgba(255,255,255,0.22)",
    // EXTERNA — sombra de elevação multicamada
    "0 2px 8px rgba(0,0,0,0.18)",
    "0 8px 28px rgba(0,0,0,0.16)",
    "0 20px 56px rgba(0,0,0,0.10)",
    // EXTERNA — distorção lateral (líquido curva a luz nas bordas)
    "4px 0 16px -2px rgba(255,255,255,0.04)",
    "-4px 0 12px -2px rgba(255,255,255,0.03)",
    // EXTERNA — glow de marca violeta
    "0 0 0 0.5px rgba(120,80,255,0.10)",
    "0 0 32px rgba(120,80,255,0.06)",
  ].join(", "),
} as const;

// CAMADA 1 — Nav pill (bolha convexa dentro do vidro)
// Física invertida: topo escuro + borda inferior brilhante
const NAV_PILL_GLASS = {
  background: `linear-gradient(
    185deg,
    rgba(0,0,0,0.08) 0%,
    rgba(0,0,0,0.02) 45%,
    rgba(255,255,255,0.04) 100%
  )`,
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: [
    "inset 0 2.5px 5px 0 rgba(0,0,0,0.15)",
    "inset 0 -1.5px 0 0 rgba(255,255,255,0.28)",
    "inset 0 -3px 7px 0 rgba(255,255,255,0.07)",
    "inset 1.5px 0 4px 0 rgba(255,255,255,0.10)",
    "inset -1px 0 3px 0 rgba(255,255,255,0.05)",
    "0 1px 3px rgba(0,0,0,0.14)",
    "0 3px 10px rgba(0,0,0,0.08)",
    "2px 0 8px -1px rgba(255,255,255,0.04)",
    "-2px 0 8px -1px rgba(255,255,255,0.04)",
  ].join(", "),
} as const;

// CAMADA 3 — Drawer mobile (painel mais elevado — mais blur, mais espesso)
const DRAWER_GLASS = {
  background: `linear-gradient(
    150deg,
    rgba(12,10,22,0.92) 0%,
    rgba(10,8,20,0.88) 100%
  )`,
  backdropFilter: "blur(32px) saturate(200%) brightness(1.06)",
  WebkitBackdropFilter: "blur(32px) saturate(200%) brightness(1.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: [
    // Highlight superior muito intenso (drawer é objeto mais próximo)
    "inset 0 1.5px 0 0 rgba(255,255,255,0.55)",
    "inset 0 -1px 0 0 rgba(255,255,255,0.06)",
    "inset 1.5px 0 0 0 rgba(255,255,255,0.18)",
    "inset -1px 0 0 0 rgba(255,255,255,0.06)",
    "inset 0 4px 18px 0 rgba(255,255,255,0.06)",
    "inset 0 -6px 20px 0 rgba(0,0,0,0.25)",
    "inset 0 0 36px 6px rgba(0,0,0,0.05)",
    "0 -0.5px 0 0.5px rgba(255,255,255,0.25)",
    "0 2px 8px rgba(0,0,0,0.25)",
    "0 12px 40px rgba(0,0,0,0.30)",
    "0 32px 80px rgba(0,0,0,0.20)",
    "0 0 0 0.5px rgba(120,80,255,0.15)",
    "0 0 40px rgba(120,80,255,0.08)",
  ].join(", "),
} as const;

// ─────────────────────────────────────────────────────────────────────────────

export function AuthHeaderV2({ onLoginClick, onRegisterClick }: AuthHeaderV2Props) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (anchor: string) => {
    const el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed top-0 left-0 w-full z-50 transition-all duration-500 px-6",
          isScrolled ? "py-3" : "py-5",
        )}
      >
        {/* ── CAMADA 0: Blade de vidro líquido (aparece no scroll) ────────── */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: isScrolled ? 1 : 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={HEADER_GLASS}
        />

        {/* Barra de progresso neon na borda inferior */}
        <motion.div
          className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent pointer-events-none"
          animate={{ width: isScrolled ? "100%" : "0%", opacity: isScrolled ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        />

        {/* ── Conteúdo do header ──────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10">

          {/* Logo — CAMADA 2 (gota) */}
          <motion.div
            className="flex items-center gap-3 group cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <div className="relative">
              {/* Halo de glow ao redor do ícone */}
              <div className="absolute -inset-2 bg-primary/25 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {/* Ícone — bolha convexa pequena */}
              <div
                className="relative h-9 w-9 bg-primary rounded-xl flex items-center justify-center"
                style={{
                  boxShadow: [
                    "inset 0 1.5px 0 rgba(255,255,255,0.35)",
                    "inset 0 -1px 0 rgba(0,0,0,0.20)",
                    "0 0 20px rgba(120,80,255,0.45)",
                    "0 4px 12px rgba(0,0,0,0.25)",
                  ].join(", "),
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                <Zap className="h-5 w-5 text-white fill-white group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter uppercase leading-none text-white">
                Zoopi<span className="text-primary">.</span>
              </span>
            </div>
          </motion.div>

          {/* ── CAMADA 1: Nav pill (bolha convexa) ──────────────────────── */}
          <nav
            className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-full"
            style={NAV_PILL_GLASS}
          >
            {NAV_ITEMS.map((item) => (
              <NavButton key={item.label} onClick={() => scrollTo(item.anchor)}>
                {item.label}
              </NavButton>
            ))}
          </nav>

          {/* ── Actions ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">

            {/* Botão Login — CAMADA 2 (gota com highlight interno) */}
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="hidden sm:block"
            >
              <Button
                onClick={onRegisterClick}
                className="h-9 px-5 rounded-full bg-primary hover:bg-primary/85 text-white font-black uppercase text-[9px] tracking-[0.2em] relative overflow-hidden border-0"
                style={{
                  boxShadow: [
                    "inset 0 1.5px 0 rgba(255,255,255,0.35)",
                    "inset 0 -1px 0 rgba(0,0,0,0.18)",
                    "inset 0 2px 8px rgba(255,255,255,0.10)",
                    "0 0 20px rgba(120,80,255,0.40)",
                    "0 4px 14px rgba(0,0,0,0.22)",
                  ].join(", "),
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                {/* Shimmer interno (gota inflando no hover) */}
                <span
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: `radial-gradient(
                      ellipse at 50% 0%,
                      rgba(255,255,255,0.25) 0%,
                      transparent 65%
                    )`,
                  }}
                />
                Login
                <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </motion.div>

            {/* Botão mobile — CAMADA 2 */}
            <motion.button
              onClick={() => setMobileOpen((v) => !v)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="lg:hidden flex items-center justify-center h-9 w-9 rounded-xl text-white relative overflow-hidden"
              style={{
                background: `linear-gradient(185deg, rgba(0,0,0,0.08) 0%, rgba(255,255,255,0.04) 100%)`,
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: [
                  "inset 0 2px 4px rgba(0,0,0,0.15)",
                  "inset 0 -1.5px 0 rgba(255,255,255,0.22)",
                  "0 2px 8px rgba(0,0,0,0.15)",
                ].join(", "),
              }}
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.span key="x"
                    initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}
                  >
                    <X size={18} />
                  </motion.span>
                ) : (
                  <motion.span key="menu"
                    initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}
                  >
                    <Menu size={18} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ── CAMADA 3: Drawer mobile (painel mais espesso e elevado) ───────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="fixed top-20 left-4 right-4 z-50 lg:hidden rounded-[2rem] overflow-hidden"
            style={DRAWER_GLASS}
          >
            {/* Reflexo especular interno no topo do drawer */}
            <div
              className="pointer-events-none absolute left-[10%] right-[10%] top-0 h-[1px]"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
              }}
            />
            {/* Reflexo especular inferior (barriga do vidro) */}
            <div
              className="pointer-events-none absolute left-[20%] right-[20%] bottom-0 h-[1px]"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
              }}
            />

            <div className="p-6 space-y-1">
              {NAV_ITEMS.map((item, i) => (
                <motion.button
                  key={item.label}
                  initial={{ x: -12, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.06, duration: 0.22 }}
                  onClick={() => scrollTo(item.anchor)}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white/65 hover:text-white transition-colors duration-150 group"
                  style={{
                    // Cada item é uma Camada 2 (gota) dentro do drawer
                    background: "transparent",
                    border: "1px solid transparent",
                  }}
                  onMouseEnter={e => {
                    const t = e.currentTarget;
                    t.style.background = `linear-gradient(185deg, rgba(0,0,0,0.08) 0%, rgba(255,255,255,0.03) 100%)`;
                    t.style.borderColor = "rgba(255,255,255,0.10)";
                    t.style.boxShadow = [
                      "inset 0 1.5px 3px rgba(0,0,0,0.12)",
                      "inset 0 -1.5px 0 rgba(255,255,255,0.18)",
                      "0 1px 4px rgba(0,0,0,0.10)",
                    ].join(", ");
                  }}
                  onMouseLeave={e => {
                    const t = e.currentTarget;
                    t.style.background = "transparent";
                    t.style.borderColor = "transparent";
                    t.style.boxShadow = "none";
                  }}
                >
                  {item.label}
                  <ArrowRight size={13} className="text-primary opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150" />
                </motion.button>
              ))}

              {/* Divisor — linha de vidro */}
              <div
                className="my-3 h-px"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                }}
              />

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: NAV_ITEMS.length * 0.06 + 0.05 }}
              >
                <Button
                  className="w-full h-11 rounded-xl font-black uppercase text-[10px] tracking-widest relative overflow-hidden border-0"
                  onClick={onLoginClick}
                  style={{
                    background: "hsl(var(--primary))",
                    boxShadow: [
                      "inset 0 1.5px 0 rgba(255,255,255,0.35)",
                      "inset 0 -1px 0 rgba(0,0,0,0.18)",
                      "inset 0 2px 10px rgba(255,255,255,0.10)",
                      "0 0 24px rgba(120,80,255,0.45)",
                      "0 4px 16px rgba(0,0,0,0.25)",
                    ].join(", "),
                    border: "1px solid rgba(255,255,255,0.18)",
                  }}
                >
                  {/* Highlight radial interno */}
                  <span
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      background: `radial-gradient(
                        ellipse at 50% 0%,
                        rgba(255,255,255,0.22) 0%,
                        transparent 65%
                      )`,
                    }}
                  />
                  Entrar agora
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NavButton — CAMADA 2 (gota dentro do pill de nav)
// ─────────────────────────────────────────────────────────────────────────────
function NavButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => { setHovered(false); setPressed(false); }}
      onTapStart={() => setPressed(true)}
      onTap={() => setPressed(false)}
      onTapCancel={() => setPressed(false)}
      animate={{ scale: pressed ? 0.93 : hovered ? 1.05 : 1 }}
      transition={{ type: "spring", stiffness: 550, damping: 30 }}
      className="relative px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.18em] overflow-hidden transition-colors duration-150"
      style={{
        color: hovered ? "white" : "rgba(255,255,255,0.55)",
        background: hovered
          ? pressed
            ? `radial-gradient(ellipse at 50% 60%, rgba(0,0,0,0.12) 0%, rgba(255,255,255,0.03) 100%)`
            : `radial-gradient(ellipse at 50% 25%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 55%, transparent 100%)`
          : "transparent",
        border: hovered ? "1px solid rgba(255,255,255,0.16)" : "1px solid transparent",
        boxShadow: hovered && !pressed ? [
          "inset 0 1px 0 rgba(255,255,255,0.32)",
          "inset 0 -1px 0 rgba(0,0,0,0.08)",
          "0 1px 6px rgba(0,0,0,0.10)",
        ].join(", ") : "none",
      }}
    >
      {/* Reflexo especular (núcleo da gota no hover) */}
      {hovered && !pressed && (
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: "10% 18% auto 18%",
            height: "28%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.00) 100%)",
            filter: "blur(2px)",
          }}
        />
      )}
      {children}
    </motion.button>
  );
}