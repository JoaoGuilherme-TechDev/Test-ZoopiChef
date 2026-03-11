import { motion } from "framer-motion";

export function PremiumOverlay() {
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none select-none overflow-hidden">
      {/* 1. TEXTURA DE RUÍDO (FILM GRAIN) 
          Este efeito dá uma profundidade analógica e premium ao site.
      */}
      <div 
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 2. VIGNETTE CINEMATOGRÁFICA 
          Escurece as bordas para focar a atenção no centro.
      */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

      {/* 3. LIGHT LEAKS (Vazamentos de luz aleatórios) 
          Simulam luzes de estúdio batendo na lente da câmera.
      */}
      <motion.div 
        animate={{ 
          opacity: [0.1, 0.2, 0.1],
          x: [-20, 20, -20]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 blur-[160px] rounded-full"
      />
      
      <motion.div 
        animate={{ 
          opacity: [0.05, 0.15, 0.05],
          x: [20, -20, 20]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/10 blur-[160px] rounded-full"
      />

      {/* 4. SCANLINE SUTIL 
          Apenas um detalhe de monitor de alta tecnologia.
      */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.01),rgba(0,0,255,0.01))] bg-[length:100%_4px,3px_100%] pointer-events-none" />
    </div>
  );
}