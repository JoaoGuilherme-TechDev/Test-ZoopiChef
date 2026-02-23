import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, X, ZoomIn, ZoomOut } from 'lucide-react';

interface DailyMenuButtonProps {
  imageUrl: string;
  description?: string | null;
}

/**
 * DailyMenuButton - Botão "Menu do Dia" para o Delivery.
 * Exibe um botão estilizado que abre um modal fullscreen com a imagem do menu.
 * Suporta zoom na imagem e tratamento de erro de carregamento.
 */
export function DailyMenuButton({ imageUrl, description }: DailyMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!imageUrl) return null;

  return (
    <>
      {/* Botão destacado */}
      <button
        onClick={() => { setOpen(true); setImageError(false); setZoomed(false); }}
        className="group relative block w-full overflow-hidden rounded-2xl animate-fade-in hover:scale-[1.02] transition-all duration-500 min-h-[70px]"
      >
        {/* Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 rounded-2xl blur-sm opacity-50 group-hover:opacity-80 transition-opacity duration-500" />

        {/* Main container */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 p-[2px] rounded-2xl">
          <div className="relative flex items-center gap-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-[14px] px-5 py-4 overflow-hidden">
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />

            {/* Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400 rounded-full blur-md opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative p-3 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                <UtensilsCrossed className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Text */}
            <div className="flex-1 text-center">
              <p className="text-base md:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-white to-emerald-200">
                📋 Menu do Dia
              </p>
              {description && (
                <p className="text-xs md:text-sm text-emerald-300/80 mt-1 font-medium line-clamp-1">
                  {description}
                </p>
              )}
            </div>

            {/* Arrow */}
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400 rounded-full blur-sm opacity-30 group-hover:opacity-60 transition-opacity" />
              <ZoomIn className="relative w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>
          </div>
        </div>
      </button>

      {/* Modal Fullscreen */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 border-0 rounded-none bg-black/95 overflow-hidden"
          accessibilityTitle="Menu do Dia"
        >
          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Zoom toggle */}
          <button
            onClick={() => setZoomed(!zoomed)}
            className="absolute top-4 left-4 z-50 p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
          >
            {zoomed ? (
              <ZoomOut className="w-6 h-6 text-white" />
            ) : (
              <ZoomIn className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Title bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-emerald-600/80 backdrop-blur-sm">
            <p className="text-white text-sm font-bold flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              Menu do Dia
            </p>
          </div>

          {/* Image container */}
          <div
            className="w-full h-full flex items-center justify-center overflow-auto p-4 pt-16"
            onClick={() => setZoomed(!zoomed)}
          >
            {imageError ? (
              <div className="text-center text-white/70 space-y-3">
                <UtensilsCrossed className="w-16 h-16 mx-auto opacity-50" />
                <p className="text-lg font-medium">Imagem indisponível</p>
                <p className="text-sm text-white/50">Não foi possível carregar o menu do dia.</p>
              </div>
            ) : (
              <img
                src={imageUrl}
                alt="Menu do Dia"
                className={`
                  transition-transform duration-300 ease-in-out select-none
                  ${zoomed
                    ? 'max-w-none cursor-zoom-out'
                    : 'max-w-full max-h-full object-contain cursor-zoom-in'
                  }
                `}
                style={zoomed ? { width: '150%', height: 'auto' } : undefined}
                onError={() => setImageError(true)}
                draggable={false}
                loading="lazy"
              />
            )}
          </div>

          {/* Description footer */}
          {description && !imageError && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-8">
              <p className="text-white text-center text-sm font-medium">{description}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
