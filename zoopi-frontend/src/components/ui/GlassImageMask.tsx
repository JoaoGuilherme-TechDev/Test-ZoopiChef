import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassImageMaskProps {
  src: string;
  alt: string;
  className?: string;
  overlayOpacity?: number;
}

export function GlassImageMask({ src, alt, className, overlayOpacity = 0.4 }: GlassImageMaskProps) {
  return (
    <div className={cn("relative w-full h-full group overflow-hidden", className)}>
      {/* 1. IMAGEM BASE COM ZOOM NO HOVER */}
      <motion.img
        src={src}
        alt={alt}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full h-full object-cover transition-all duration-700"
      />

      {/* 2. MÁSCARA DE GRADIENTE (FUSÃO COM O FUNDO)
          Este gradiente faz a imagem "sumir" nas bordas, integrando-a ao site.
      */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-transparent to-[#02040a]/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#02040a] via-transparent to-[#02040a]/20" />

      {/* 3. OVERLAY DE COR (TINTA A IMAGEM COM A PALETA DO SITE) */}
      <div 
        className="absolute inset-0 bg-primary/10 mix-blend-color transition-opacity group-hover:opacity-0" 
        style={{ opacity: overlayOpacity }}
      />

      {/* 4. BRILHO DE BORDA (Efeito de Vidro Cortado) */}
      <div className="absolute inset-0 border border-white/10 rounded-[inherit] pointer-events-none" />
      
      {/* 5. REFLEXO DINÂMICO NO HOVER */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
    </div>
  );
}