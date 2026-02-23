import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CookingMethod } from '../types';
import { COOKING_METHODS } from '../types';

interface CookingMethodScreenProps {
  onSelectMethod: (method: CookingMethod) => void;
  onBack: () => void;
}

export function CookingMethodScreen({ onSelectMethod, onBack }: CookingMethodScreenProps) {
  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-red-950/30 via-background to-background">
      {/* Header */}
      <div className="text-center mb-8 pt-8">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-red-600/20 to-amber-600/20 mb-4">
          <Sparkles className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Como vai preparar?
        </h1>
        <p className="text-muted-foreground">
          Escolha o método de preparo para a carne
        </p>
      </div>

      {/* Options */}
      <div className="flex-1 flex flex-col justify-center gap-3 max-w-md mx-auto w-full">
        {COOKING_METHODS.map((method, index) => (
          <button
            key={method.id}
            onClick={() => onSelectMethod(method.id)}
            className={cn(
              "group relative p-5 rounded-2xl border border-white/10 bg-card/50 backdrop-blur-sm",
              "hover:border-white/20 hover:bg-card/80 transition-all duration-300",
              "animate-in fade-in slide-in-from-bottom",
              "hover:shadow-lg hover:shadow-red-500/10"
            )}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-2xl group-hover:scale-110 transition-transform duration-300">
                {method.icon}
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-white mb-0.5 group-hover:text-red-300 transition-colors">
                  {method.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {method.description}
                </p>
              </div>
            </div>

            {/* Hover indicator */}
            <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-red-500/50 transition-all duration-300 pointer-events-none" />
          </button>
        ))}
      </div>

      {/* Back button */}
      <div className="pt-6 text-center">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-white transition-colors text-sm"
        >
          ← Voltar
        </button>
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-5 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
        <div className="absolute bottom-1/4 right-5 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
      </div>
    </div>
  );
}
