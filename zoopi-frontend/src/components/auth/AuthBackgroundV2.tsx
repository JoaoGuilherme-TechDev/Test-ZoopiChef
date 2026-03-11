/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// AuthBackgroundV2 — fundo auto-contido da landing
//
// Antes: usava `bg-transparent` e dependia do <body> estar escuro.
// Agora: define seu próprio background escuro fixo via `style` inline —
// completamente imune ao tema do sistema (light/dark).
// ─────────────────────────────────────────────────────────────────────────────

const LANDING_BG = "#050509"; // obsidiana quase preta — base da landing

export function AuthBackgroundV2() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const spotlightX = useSpring(mouseX, { stiffness: 150, damping: 30 });
  const spotlightY = useSpring(mouseY, { stiffness: 150, damping: 30 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden"
      // Fundo próprio — não depende de nada externo
      style={{ background: LANDING_BG }}
    >
      {/* Nebulosa superior — roxo vivo */}
      <div
        className="absolute -top-[15%] -right-[10%] w-[55%] h-[55%] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)",
          animation: "nebula1 18s ease-in-out infinite",
        }}
      />

      {/* Nebulosa inferior — azul vivo */}
      <div
        className="absolute -bottom-[15%] -left-[10%] w-[50%] h-[50%] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)",
          animation: "nebula2 14s ease-in-out infinite",
        }}
      />

      {/* Grid de precisão */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right,  rgba(128,128,128,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(128,128,128,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
        }}
      />

      {/* Spotlight interativo */}
      <motion.div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: useTransform(
            [spotlightX, spotlightY],
            ([x, y]) =>
              `radial-gradient(450px circle at ${x}px ${y}px, rgba(37, 99, 235, 0.22), transparent 80%)`
          ),
        }}
      />

      {/* Partículas estáticas */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {[
          { top: "22%", left: "31%",  color: "rgba(255,255,255,0.15)", delay: "0s"   },
          { top: "65%", left: "22%",  color: "rgba(99,102,241,0.25)",  delay: "0.8s" },
          { top: "48%", right: "26%", color: "rgba(139,92,246,0.18)",  delay: "1.2s" },
          { top: "78%", right: "40%", color: "rgba(255,255,255,0.10)", delay: "0.4s" },
          { top: "15%", left: "60%",  color: "rgba(99,102,241,0.20)",  delay: "1.6s" },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              top:        p.top,
              left:       (p as any).left,
              right:      (p as any).right,
              background: p.color,
              animation:  "pulse 3s ease-in-out infinite",
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Vinheta — escurece as bordas, mantém o foco no centro */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, transparent 30%, ${LANDING_BG} 85%)`,
        }}
      />

      {/* Keyframes */}
      <style>{`
        @keyframes nebula1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(30px, 20px) scale(1.08); }
          66%       { transform: translate(-20px, 40px) scale(0.95); }
        }
        @keyframes nebula2 {
          0%, 100% { transform: translate(0, 0) scale(1.05); }
          50%       { transform: translate(25px, -30px) scale(0.92); }
        }
      `}</style>
    </div>
  );
}