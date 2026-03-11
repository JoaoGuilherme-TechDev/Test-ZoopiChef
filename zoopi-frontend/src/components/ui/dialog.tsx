import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Dialog — Liquid Glass 3D
//
// Overlay: não é mais black/80 puro — é um blur backdrop real com
// saturação reduzida (como o iOS faz ao abrir sheets).
// Simula o "freeze frame" do conteúdo atrás.
//
// DialogContent: mesmo sistema de camadas do Card, mas com:
//   · escala de entrada animada (zoom-in com spring feel)
//   · bordas com distorção de luz mais intensa (modal é mais elevado)
//   · glow externo mais proeminente (objeto mais próximo do usuário)
//   · borda superior mais brilhante (modal flutua acima de tudo)
// ─────────────────────────────────────────────────────────────────────────────

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

// ── Overlay ──────────────────────────────────────────────────────────────────
// Troca black/80 por um blur com tint escuro — como o iOS/macOS fazem.
// O conteúdo atrás fica "congelado e distante", não simplesmente escuro.
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50",
      // Animações de entrada/saída
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    style={{
      // Blur + tint escuro — não opaco, conteúdo fica visível mas desfocado
      backdropFilter: "blur(12px) saturate(60%) brightness(0.55)",
      WebkitBackdropFilter: "blur(12px) saturate(60%) brightness(0.55)",
      // Tint roxo-escuro sutil por cima do blur (harmoniza com a marca)
      background: "rgba(8, 8, 18, 0.45)",
    }}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// ── DialogContent ─────────────────────────────────────────────────────────────
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Posicionamento
        "fixed left-[50%] top-[50%] z-50",
        "w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
        // Layout interno
        "grid gap-4 p-6",
        // Border radius generoso — modal é um objeto premium
        "rounded-2xl",
        // Texto
        "text-card-foreground",
        // Animações de entrada/saída (mantidas do shadcn)
        "duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className,
      )}
      style={{
        // ── Liquid Glass 3D — versão Modal ────────────────────────────────
        // Modal é Camada 3 (mais elevada que card) — recebe mais luz,
        // highlight superior mais intenso, glow externo mais proeminente,
        // sombra de elevação maior.

        background: `linear-gradient(
          150deg,
          var(--card-glass-bg, rgba(22,24,36,0.88)) 0%,
          color-mix(in srgb, var(--card-glass-bg, rgba(22,24,36,0.88)) 85%, transparent) 100%
        )`,
        backdropFilter: "blur(28px) saturate(200%) brightness(1.06)",
        WebkitBackdropFilter: "blur(28px) saturate(200%) brightness(1.06)",

        // Borda com destaque roxo sutil (cor de marca) — diferencia do card
        border: "1px solid rgba(120, 80, 255, 0.22)",

        boxShadow: [
          // INSET — Highlight borda superior MAIS INTENSO (modal é mais elevado)
          "inset 0 1.5px 0 0 rgba(255,255,255,0.65)",
          // INSET — Borda inferior
          "inset 0 -1px 0 0 rgba(255,255,255,0.06)",
          // INSET — Lateral esquerda
          "inset 1.5px 0 0 0 rgba(255,255,255,0.18)",
          // INSET — Lateral direita
          "inset -1px 0 0 0 rgba(255,255,255,0.06)",
          // INSET — Gradiente de profundidade topo
          "inset 0 4px 20px 0 rgba(255,255,255,0.09)",
          // INSET — Gradiente de profundidade base
          "inset 0 -6px 22px 0 rgba(0,0,0,0.22)",
          // INSET — Vinheta central
          "inset 0 0 36px 6px rgba(0,0,0,0.04)",
          // INSET — Reflexo lateral extra (distorção de luz no líquido)
          "inset 2px 0 12px rgba(255,255,255,0.04)",
          "inset -2px 0 12px rgba(255,255,255,0.02)",

          // EXTERNA — Micro-linha de luz no topo
          "0 -0.5px 0 0.5px rgba(255,255,255,0.32)",

          // EXTERNA — Elevação pesada (modal está bem à frente)
          "0 2px 6px rgba(0,0,0,0.20)",
          "0 8px 32px rgba(0,0,0,0.22)",
          "0 24px 72px rgba(0,0,0,0.18)",
          "0 48px 120px rgba(0,0,0,0.12)",

          // EXTERNA — Glow de marca mais proeminente no modal
          "0 0 0 1px rgba(120,80,255,0.12)",
          "0 0 40px rgba(120,80,255,0.10)",
          "0 0 80px rgba(120,80,255,0.06)",
        ].join(", "),
      }}
      {...props}
    >
      {children}

      {/* Botão fechar — camada 2 (gota dentro do modal) */}
      <DialogPrimitive.Close
        className={cn(
          "absolute right-4 top-4 rounded-full p-1.5",
          "text-muted-foreground transition-all duration-200",
          "opacity-70 hover:opacity-100",
          "hover:text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:pointer-events-none",
          "data-[state=open]:text-muted-foreground",
        )}
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: [
            "inset 0 1.5px 0 rgba(255,255,255,0.20)",
            "inset 0 -1px 0 rgba(0,0,0,0.08)",
            "0 1px 4px rgba(0,0,0,0.12)",
          ].join(", "),
        }}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

// ── Header / Footer / Title / Description (sem alteração estrutural) ──────────

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      // Separador sutil acima do footer — linha de vidro
      "pt-2 mt-2",
      className,
    )}
    style={{
      borderTop: "1px solid rgba(255,255,255,0.07)",
    }}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}