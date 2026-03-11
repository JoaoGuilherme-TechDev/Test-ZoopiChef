import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "../ThemeToggle";
import { Input } from "@/components/ui/input";
import { useSidebar } from "@/components/ui/sidebar";
import { ProfileDropdown } from "../profile/ProfileDropdown";

// ─────────────────────────────────────────────────────────────────────────────
// SISTEMA DE CAMADAS DE PROFUNDIDADE — Liquid Water 3D
//
//  Camada 0 | Header      → placa de vidro espessa, luz de cima-esquerda
//                            bordas com halos assimétricos (distorção de luz)
//
//  Camada 1 | Pills        → bolhas convexas flutuando DENTRO do vidro
//                            contraste invertido: mais escuro + borda inferior
//                            brilhante (reflexo na barriga da bolha)
//
//  Camada 2 | Botões       → gotas individuais dentro da bolha
//                            hover: highlight central radial (gota inflando)
//                            active: compressão com scale + escurecimento
// ─────────────────────────────────────────────────────────────────────────────

// CAMADA 0 — Header (placa de vidro com distorção nas bordas)
const LAYER_0 = {
  background: `linear-gradient(
    160deg,
    rgba(255,255,255,0.13) 0%,
    rgba(255,255,255,0.05) 50%,
    rgba(255,255,255,0.10) 100%
  )`,
  border: "1px solid rgba(255,255,255,0.22)",
  boxShadow: [
    // INSET — highlight borda superior (quina recebe luz direta)
    "inset 0 1.5px 0 0 rgba(255,255,255,0.55)",
    // INSET — borda inferior sombra da espessura
    "inset 0 -1px 0 0 rgba(255,255,255,0.07)",
    // INSET — lateral esquerda (fonte de luz)
    "inset 1.5px 0 0 0 rgba(255,255,255,0.22)",
    // INSET — lateral direita quase invisível
    "inset -1px 0 0 0 rgba(255,255,255,0.05)",
    // INSET — gradiente de profundidade (espessura do vidro)
    "inset 0 4px 14px 0 rgba(255,255,255,0.09)",
    "inset 0 -5px 18px 0 rgba(0,0,0,0.07)",
    // INSET — vinheta central (curvatura sutil — não é flat)
    "inset 0 0 28px 6px rgba(0,0,0,0.04)",
    // EXTERNA — micro linha de luz no topo (Apple highlight)
    "0 -0.5px 0 0.5px rgba(255,255,255,0.28)",
    // EXTERNA — sombra de elevação multicamada
    "0 2px 4px rgba(0,0,0,0.09)",
    "0 6px 20px rgba(0,0,0,0.13)",
    "0 18px 52px rgba(0,0,0,0.09)",
    // EXTERNA — distorção de luz nas bordas laterais (líquido curva a luz)
    // Mais intenso na esquerda (fonte) do que na direita
    "3px 0 12px -2px rgba(255,255,255,0.07)",
    "-3px 0 10px -2px rgba(255,255,255,0.04)",
    // EXTERNA — glow de cor da marca
    "0 0 0 0.5px rgba(120,40,220,0.11)",
    "0 0 32px rgba(120,40,220,0.05)",
  ].join(", "),
} as const;

// CAMADA 1 — Pills (bolhas convexas — mais escuras, refração invertida)
// A bolha é convexa: a borda INFERIOR brilha mais (reflexo na barriga)
// e o TOPO fica escuro (sombra da curvatura)
const LAYER_1 = {
  background: `linear-gradient(
    185deg,
    rgba(0,0,0,0.09) 0%,
    rgba(0,0,0,0.03) 45%,
    rgba(255,255,255,0.06) 100%
  )`,
  border: "1px solid rgba(255,255,255,0.13)",
  boxShadow: [
    // INSET — topo escuro (curvatura convexa captura luz no centro, não na borda)
    "inset 0 2.5px 5px 0 rgba(0,0,0,0.15)",
    // INSET — highlight inferior (reflexo especular na barriga da bolha)
    "inset 0 -1.5px 0 0 rgba(255,255,255,0.35)",
    "inset 0 -3px 7px 0 rgba(255,255,255,0.10)",
    // INSET — bordas laterais com distorção assimétrica
    "inset 1.5px 0 4px 0 rgba(255,255,255,0.12)",
    "inset -1px 0 3px 0 rgba(255,255,255,0.06)",
    // INSET — massa interna do líquido (volume e peso)
    "inset 0 1px 10px 2px rgba(0,0,0,0.07)",
    // EXTERNA — sombra de submersão (está dentro do vidro pai)
    "0 1px 3px rgba(0,0,0,0.14)",
    "0 3px 10px rgba(0,0,0,0.09)",
    // EXTERNA — micro halos laterais (distorção de luz do líquido)
    "2px 0 8px -1px rgba(255,255,255,0.05)",
    "-2px 0 8px -1px rgba(255,255,255,0.05)",
  ].join(", "),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// CAMADA 2 — Botão individual (gota)
// ─────────────────────────────────────────────────────────────────────────────
function LiquidButton({
  onClick,
  title,
  children,
  className,
}: {
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      title={title}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => { setHovered(false); setPressed(false); }}
      onTapStart={() => setPressed(true)}
      onTap={() => setPressed(false)}
      onTapCancel={() => setPressed(false)}
      animate={{ scale: pressed ? 0.90 : hovered ? 1.06 : 1 }}
      transition={{ type: "spring", stiffness: 600, damping: 32 }}
      className={cn(
        "relative p-2 rounded-full overflow-hidden",
        "text-muted-foreground transition-colors duration-150",
        hovered && !pressed ? "text-foreground" : "",
        className,
      )}
      style={{
        background: hovered
          ? pressed
            // Active: gota comprimida — escurece o centro
            ? `radial-gradient(
                ellipse at 50% 60%,
                rgba(0,0,0,0.10) 0%,
                rgba(255,255,255,0.04) 70%,
                transparent 100%
              )`
            // Hover: gota inflando — highlight central radial
            : `radial-gradient(
                ellipse at 50% 25%,
                rgba(255,255,255,0.22) 0%,
                rgba(255,255,255,0.07) 55%,
                transparent 100%
              )`
          : "transparent",
        boxShadow: hovered
          ? pressed
            ? [
                "inset 0 2px 4px rgba(0,0,0,0.15)",
                "inset 0 -1px 0 rgba(255,255,255,0.10)",
              ].join(", ")
            : [
                // Hover: highlight superior (topo da gota inflada)
                "inset 0 1px 0 rgba(255,255,255,0.40)",
                "inset 0 -1px 0 rgba(0,0,0,0.06)",
                // Micro glow externo
                "0 0 10px rgba(255,255,255,0.07)",
                "0 2px 6px rgba(0,0,0,0.08)",
              ].join(", ")
          : "none",
        border: hovered
          ? "1px solid rgba(255,255,255,0.20)"
          : "1px solid transparent",
      }}
    >
      {/* Reflexo especular interno — aparece no hover (núcleo brilhante da gota) */}
      {hovered && !pressed && (
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: "15% 20% auto 20%",
            height: "30%",
            background: `linear-gradient(
              180deg,
              rgba(255,255,255,0.30) 0%,
              rgba(255,255,255,0.00) 100%
            )`,
            filter: "blur(2px)",
          }}
        />
      )}
      {children}
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function DashboardHeader({ title }: { title?: string }) {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { state } = useSidebar();

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    // CAMADA 0 — Header principal
    <motion.header
      initial={{ opacity: 0, scale: 0.96, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "w-full h-16 flex items-center justify-between px-4 rounded-full",
        // Backdrop combo Apple: blur + saturate + brightness
        "backdrop-blur-2xl backdrop-saturate-[190%] backdrop-brightness-[1.06]",
      )}
      style={LAYER_0}
    >

      {/* ── ESQUERDA: NAVEGAÇÃO ── */}
      <div className="flex items-center gap-4">
        {/* CAMADA 1 — pill bolha convexa */}
        <div
          className="flex items-center gap-0 p-1 rounded-full"
          style={LAYER_1}
        >
          {/* CAMADA 2 — gotas */}
          <LiquidButton onClick={() => navigate(-1)} title="Voltar">
            <ChevronLeft className="h-5 w-5" />
          </LiquidButton>
          <LiquidButton onClick={() => navigate(1)} title="Avançar">
            <ChevronRight className="h-5 w-5" />
          </LiquidButton>
        </div>
      </div>

      {/* ── CENTRO: BUSCA ── */}
      <div className="flex-1 max-w-sm mx-6 hidden md:block relative group">
        <Search
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 z-10",
            "text-muted-foreground/60 group-focus-within:text-primary transition-colors",
          )}
        />
        {/* Input também é Camada 1 — bolha afundada (caixa de pesquisa) */}
        <Input
          placeholder="Busca rápida..."
          className={cn(
            "h-9 pl-11 rounded-full text-xs transition-all duration-300",
            "border-0 bg-transparent shadow-none",
            "focus-visible:ring-0 focus-visible:outline-none",
            "placeholder:text-muted-foreground/40",
          )}
          style={{
            background: `linear-gradient(
              185deg,
              rgba(0,0,0,0.08) 0%,
              rgba(0,0,0,0.02) 55%,
              rgba(255,255,255,0.04) 100%
            )`,
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: [
              "inset 0 2.5px 5px 0 rgba(0,0,0,0.13)",
              "inset 0 -1.5px 0 0 rgba(255,255,255,0.30)",
              "inset 0 -3px 6px 0 rgba(255,255,255,0.07)",
              "inset 1px 0 3px rgba(255,255,255,0.09)",
              "inset -1px 0 2px rgba(255,255,255,0.05)",
              "0 1px 4px rgba(0,0,0,0.10)",
            ].join(", "),
          }}
        />
      </div>

      {/* ── DIREITA: AÇÕES ── */}
      <div className="flex items-center gap-3">
        {/* CAMADA 1 — pill bolha convexa */}
        <div
          className="flex items-center gap-0 p-1 rounded-full"
          style={LAYER_1}
        >
          {/* CAMADA 2 — gotas */}
          <LiquidButton onClick={toggleFullscreen} title="Tela Cheia">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </LiquidButton>

          {/*
            ThemeToggle e ProfileDropdown são componentes externos.
            Envolve-os em wrappers que aplicam o mesmo tratamento visual
            de "gota" redefinindo o estilo dos botões internos via CSS cascade.
          */}
          <span
            className={cn(
              "[&>button]:rounded-full [&>button]:transition-all [&>button]:duration-150",
              "[&>button:hover]:scale-[1.06]",
            )}
          >
            <ThemeToggle />
          </span>
          <span
            className={cn(
              "[&>button]:rounded-full [&>button]:transition-all [&>button]:duration-150",
              "[&>button:hover]:scale-[1.06]",
            )}
          >
            <ProfileDropdown />
          </span>
        </div>
      </div>
    </motion.header>
  );
}