// ────────────────────────────────────────────────────────────────
// FILE: src/components/ui/card.tsx
// ────────────────────────────────────────────────────────────────

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * CONFIGURAÇÃO DE ESTILOS - LIQUID GLASS 3D
 * Corrigido para evitar conflitos de shorthand (border vs borderColor)
 */

const getCardBaseStyle = (isInvalid: boolean): React.CSSProperties => ({
  background: `linear-gradient(
    155deg,
    var(--card-glass-bg, rgba(22,24,36,0.80)) 0%,
    color-mix(in srgb, var(--card-glass-bg, rgba(22,24,36,0.80)) 88%, transparent) 100%
  )`,
  backdropFilter: "blur(20px) saturate(180%) brightness(1.04)",
  WebkitBackdropFilter: "blur(20px) saturate(180%) brightness(1.04)",
  
  // CORREÇÃO: Separamos o border para evitar o erro de re-render do React
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: isInvalid 
    ? "rgba(239, 68, 68, 0.5)" // Vermelho se estiver inválido
    : "var(--card-glass-border, rgba(255,255,255,0.10))",

  boxShadow: [
    // INSET — Highlight superior
    `inset 0 1.5px 0 0 ${isInvalid ? "rgba(239, 68, 68, 0.4)" : "var(--card-glass-shadow-top, rgba(255,255,255,0.48))"}`,
    "inset 0 -1px 0 0 rgba(255,255,255,0.05)",
    "inset 1.5px 0 0 0 rgba(255,255,255,0.12)",
    "inset -1px 0 0 0 rgba(255,255,255,0.04)",
    "inset 0 4px 16px 0 var(--card-glass-inset-light, rgba(255,255,255,0.07))",
    "inset 0 -5px 18px 0 var(--card-glass-inset-dark, rgba(0,0,0,0.18))",
    "inset 0 0 28px 4px rgba(0,0,0,0.03)",
    // EXTERNA — Sombra e Brilho (Glow)
    "0 -0.5px 0 0.5px rgba(255,255,255,0.20)",
    "0 1px 3px var(--card-glass-shadow-bottom, rgba(0,0,0,0.28))",
    "0 4px 16px rgba(0,0,0,0.08)",
    "0 12px 40px rgba(0,0,0,0.06)",
    // Se for inválido, o glow fica vermelho neon
    isInvalid 
      ? "0 0 30px rgba(239, 68, 68, 0.2)" 
      : "0 0 24px var(--card-glow, rgba(88,110,228,0.07))",
  ].join(", "),
  
  transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
})

const cardHoverStyle: React.CSSProperties = {
  transform: "translateY(-4px)",
  borderColor: "rgba(255,255,255,0.25)",
  boxShadow: [
    "inset 0 1.5px 0 0 rgba(255,255,255,0.55)",
    "inset 0 -1px 0 0 rgba(255,255,255,0.07)",
    "inset 1.5px 0 0 0 rgba(255,255,255,0.16)",
    "inset -1px 0 0 0 rgba(255,255,255,0.05)",
    "0 8px 28px rgba(0,0,0,0.12)",
    "0 20px 60px rgba(0,0,0,0.08)",
    "0 0 40px var(--card-glow, rgba(88,110,228,0.15))",
  ].join(", "),
}

// ─────────────────────────────────────────────────────────────────────────────

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { noHover?: boolean; isInvalid?: boolean }
>(({ className, style, noHover = false, isInvalid = false, onMouseEnter, onMouseLeave, ...props }, ref) => {
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl text-card-foreground", 
        isInvalid && "animate-shake", // Adiciona vibração se o card todo for o alvo do erro
        className
      )}
      style={{
        ...getCardBaseStyle(isInvalid),
        ...(hovered && !noHover && !isInvalid ? cardHoverStyle : {}),
        ...style,
      }}
      onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e) }}
      onMouseLeave={(e) => { setHovered(false); onMouseLeave?.(e) }}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }